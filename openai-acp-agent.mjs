#!/usr/bin/env node
// Minimal OpenAI-backed ACP Agent for Zed

import OpenAI from "openai";
import {
  AgentSideConnection,
  PROTOCOL_VERSION,
} from "@zed-industries/agent-client-protocol";
import { Readable, Writable } from "node:stream";
import { ReadableStream, WritableStream } from "node:stream/web";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const TEMPERATURE =
  process.env.OPENAI_TEMPERATURE != null
    ? Number(process.env.OPENAI_TEMPERATURE)
    : 0.2;

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class OpenAIAgent {
  constructor(conn) {
    this.conn = conn;
    this.abortControllers = new Map(); // sessionId -> AbortController
  }

  async initialize(_params) {
    return {
      protocolVersion: PROTOCOL_VERSION,
      agentCapabilities: { loadSession: false },
    };
  }

  async newSession(_params) {
    return { sessionId: Math.random().toString(36).slice(2) };
  }

  async authenticate(_params) {
    // no-op (auth via env)
  }

  async prompt(params) {
    const { sessionId, prompt } = params;

    // cancel in-flight work for this session
    this.abortControllers.get(sessionId)?.abort();
    const aborter = new AbortController();
    this.abortControllers.set(sessionId, aborter);

    const userText = (prompt || [])
      .map((b) => {
        if (b.type === "text") return b.text;
        if (b.type === "resource_link") return `Resource: ${b.name} (${b.uri})`;
        if (b.type === "resource" && b.resource && "text" in b.resource) {
          return `Resource ${b.resource.uri}:\n${b.resource.text}`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n\n");

    const system =
      "You are an AI coding assistant integrated in a code editor via ACP. Be concise and accurate.";

    try {
      const stream = await openai.chat.completions.create(
        {
          model: MODEL,
          temperature: TEMPERATURE,
          stream: true,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userText || "Respond to the user." },
          ],
        },
        { signal: aborter.signal },
      );

      for await (const part of stream) {
        const delta = part?.choices?.[0]?.delta?.content || "";
        if (delta) {
          await this.conn.sessionUpdate({
            sessionId,
            update: {
              sessionUpdate: "agent_message_chunk",
              content: { type: "text", text: delta },
            },
          });
        }
      }

      this.abortControllers.delete(sessionId);
      return { stopReason: "end_turn" };
    } catch (err) {
      if (aborter.signal.aborted) {
        this.abortControllers.delete(sessionId);
        return { stopReason: "cancelled" };
      }
      const msg = err?.message || "OpenAI request failed";
      await this.conn.sessionUpdate({
        sessionId,
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: `Error: ${msg}` },
        },
      });
      this.abortControllers.delete(sessionId);
      return { stopReason: "end_turn" };
    }
  }

  async cancel(params) {
    this.abortControllers.get(params.sessionId)?.abort();
  }
}

const input = Writable.toWeb(process.stdout);
const output = Readable.toWeb(process.stdin);

new AgentSideConnection((conn) => new OpenAIAgent(conn), input, output);
