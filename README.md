# OpenAI (ACP) Agent

## Used for Zed Editor
- https://zed.dev

## Documentation
https://zed.dev/docs/configuring-zed

In settings (~/.config/zed/settings.json > agent_servers)

```
"agent_servers": {
    "OpenAI (ACP)": {
      "command": "/path/to/bin/node",
      "args": [
        "/path/to/openai-acp-agent/openai-acp-agent.mjs"
      ],
      "env": {}
    }
  },
```
