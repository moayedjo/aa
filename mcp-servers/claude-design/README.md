# claude-design MCP server

A project-local [Model Context Protocol](https://modelcontextprotocol.io) server that gives
Claude (Claude Code, Claude Desktop, or any MCP client) a persistent **design studio** for
this repository.

> Note: there is no official "Claude Design" MCP server from Anthropic — Claude Design is a
> built-in claude.ai feature without a public API. This server is a small first-party
> implementation that lives in this repo, so no third-party code is executed.

## What it does

| Tool | Purpose |
| --- | --- |
| `list_designs` | List all designs with versions, titles and notes |
| `get_design` | Return the HTML of a design (latest or a specific version) |
| `save_design` | Save a new design or a new version of an existing one |
| `screenshot_design` | Render a version to PNG with headless Chromium and return the image |
| `get_design_tokens` | Extract brand tokens (colors, fonts) from `jo-print` / `orooood` Tailwind configs |

Designs are stored as versioned, self-contained HTML files under `design-studio/` at the
repo root (override with `CLAUDE_DESIGN_STUDIO_DIR`), so they are reviewable in git and
survive across sessions.

## Setup

```bash
cd mcp-servers/claude-design
npm install
```

The server is registered for the whole repo in the root `.mcp.json`, so Claude Code picks it
up automatically (you'll be asked to approve it on first use).

For other MCP clients, use:

```json
{
  "mcpServers": {
    "claude-design": {
      "command": "node",
      "args": ["/absolute/path/to/repo/mcp-servers/claude-design/server.mjs"]
    }
  }
}
```

### Screenshots (optional)

`screenshot_design` needs a Chromium binary. It auto-detects Playwright installs
(`PLAYWRIGHT_BROWSERS_PATH`, `~/.cache/ms-playwright`); otherwise set
`CLAUDE_DESIGN_CHROMIUM=/path/to/chrome`. All other tools work without a browser.

## Example prompts

- "List the designs in the studio."
- "Get the repo design tokens, then design a gold wedding invitation card matching the
  jo-print brand and save it as `wedding-invite-gold`."
- "Screenshot `wedding-invite-gold` and iterate on the typography."
