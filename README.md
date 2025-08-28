# OpenAI (ACP) Agent for Zed

A minimal OpenAI‑backed Agent Server that speaks Zed’s Agent Client Protocol (ACP) over stdio. It lets you use OpenAI models inside Zed’s AI panel without vendor‑specific plugins.

Highlights:
- Streams responses as tokens arrive
- Supports cancelling in‑flight generations per session
- Zero HTTP server; communicates over stdin/stdout
- Tiny, readable codebase (`openai-acp-agent.mjs`)

---

## Requirements

- Node.js 18+ (recommended 20+)
- An OpenAI API key with access to your chosen model
- Zed editor (latest)

Check your Node:
~~~
node -v
which node
~~~

---

## Installation

Clone and install dependencies:
~~~
git clone https://github.com/your-org/openai-acp-agent.git
cd openai-acp-agent
npm install
~~~

You can run the agent via `node` (no need to make it executable), or make it executable:
~~~
chmod +x ./openai-acp-agent.mjs   # optional
~~~

---

## Configure Zed

Edit your Zed `settings.json` and add an `agent_servers` entry.

Settings file location by platform:
- macOS: ~/Library/Application Support/Zed/settings.json
- Linux: ~/.config/zed/settings.json
- Windows: %APPDATA%\Zed\settings.json

Minimal example (replace paths with yours):
~~~json
{
  "agent_servers": {
    "OpenAI (ACP)": {
      "command": "/usr/local/bin/node",
      "args": [
        "/absolute/path/to/openai-acp-agent/openai-acp-agent.mjs"
      ],
      "env": {
        "OPENAI_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
~~~

Notes:
- Use an absolute path to both `node` and `openai-acp-agent.mjs`.
- You can also keep `env` empty here and export variables in your shell if Zed inherits them on your OS.

---

## Environment variables

The agent reads the following variables at startup:

- OPENAI_API_KEY (required)
  - Your OpenAI API key.

- OPENAI_MODEL (optional, default: gpt-4o-mini)
  - Any Chat Completions model ID you have access to, for example:
    - gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini (subject to availability)

- OPENAI_TEMPERATURE (optional, default: 0.2)
  - Floating value, e.g. 0.0–1.0. Higher = more diverse output.

Example shell export (if Zed inherits your env):
~~~
export OPENAI_API_KEY="sk-xxxxxxxx"
export OPENAI_MODEL="gpt-4o-mini"
export OPENAI_TEMPERATURE="0.2"
~~~

Or place them in the Zed `env` map (as shown in the config snippet above).

---

## Usage in Zed

1. Restart Zed after editing `settings.json`.
2. Open the AI/Chat panel (e.g., via the Command Palette).
3. Select the “OpenAI (ACP)” agent if multiple are available.
4. Ask questions, generate code, or request edits. Responses will stream live.
5. Cancel a long response from the chat UI; the agent supports per‑session cancellation.

Tip: This agent is concise by design. If you want more verbose output, increase `OPENAI_TEMPERATURE` and/or adjust your prompts.

---

## How it works

- Zed launches the agent as a child process, connecting stdio to the ACP stream.
- `openai-acp-agent.mjs`:
  - Implements the ACP handshake using `@zed-industries/agent-client-protocol`.
  - Converts incoming prompt blocks (text + resource links) into a single user message.
  - Calls OpenAI Chat Completions with streaming enabled and forwards deltas to Zed.
  - Tracks sessions and supports cancellation via `AbortController`.

Entry point:
- `openai-acp-agent.mjs` (Node ESM script with `#!/usr/bin/env node` shebang)

Dependencies:
- openai (Node client)
- @zed-industries/agent-client-protocol

---

## Customization

- Default model and temperature are controlled by environment variables.
- The system prompt is defined in `openai-acp-agent.mjs` and can be changed if you want a different tone or behavior:
  - Current: “You are an AI coding assistant integrated in a code editor via ACP. Be concise and accurate.”

Fork and tweak to taste.

---

## Troubleshooting

Agent does not appear in Zed
- Verify `settings.json` JSON is valid (no trailing commas).
- Ensure absolute paths are correct:
  - `command` points to your Node binary (`which node`).
  - `args[0]` points to the `openai-acp-agent.mjs` file.
- Restart Zed after changes.

“Missing OPENAI_API_KEY”
- The agent prints this error and exits if the key is not set.
- Provide the key via Zed’s `env` or ensure Zed inherits your shell environment.
- Confirm the key has access to the model you selected.

401 Unauthorized or 403 errors
- The key may be invalid or not authorized for the model.
- Double‑check the value and your OpenAI account/model access.

Nothing streams or responses hang
- Network/firewall/proxy issues can block streaming.
- Model name may be misspelled or unavailable.
- Check Zed’s logs or try running the agent from a terminal to see stderr messages:
  - Note: it will wait for ACP messages; you won’t get an interactive prompt, but startup errors will be visible.

“Permission denied” when executing the script
- Use the `node` binary in `command` (as shown), or `chmod +x openai-acp-agent.mjs`.

Pick a different model
- Set `OPENAI_MODEL` in `env` or your shell (see Environment variables section).

---

## Development

- Node 18+ is required because the agent uses Web Streams interop.
- The code is intentionally minimal to serve as a reference for ACP integration.
- If you add logging, prefer writing to stderr so it doesn’t interfere with ACP messages over stdout.

Project layout:
- openai-acp-agent.mjs – Agent entrypoint and ACP implementation
- package.json – Dependencies and metadata

Install deps:
~~~
npm install
~~~

Run (from terminal) just to surface startup errors:
~~~
node ./openai-acp-agent.mjs
# The process will wait for ACP messages; exit with Ctrl+C when done.
~~~

---

## Security

- Your API key is used locally by the agent process Zed starts.
- Avoid committing keys to version control.
- Prefer Zed’s `env` configuration or your OS key storage/environment.

---

## License

ISC — see `package.json`.

---

## References

- Zed: https://zed.dev
- Zed configuration: https://zed.dev/docs/configuring-zed
- OpenAI Node SDK: https://github.com/openai/openai-node