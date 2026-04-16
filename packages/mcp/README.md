# @midlyr/mcp

MCP server for accessing Midlyr's regulatory compliance data from AI agents like Claude Code, Cursor, and OpenAI Codex.

## Quick Start

Add this to your MCP client configuration:

### Claude Code

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "midlyr-compliance": {
      "command": "npx",
      "args": ["-y", "@midlyr/mcp"],
      "env": {
        "MIDLYR_API_KEY": "ml_..."
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "midlyr-compliance": {
      "command": "npx",
      "args": ["-y", "@midlyr/mcp"],
      "env": {
        "MIDLYR_API_KEY": "ml_..."
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MIDLYR_API_KEY` | Yes | — | Your Midlyr API key (starts with `ml_`) |
| `MIDLYR_BASE_URL` | No | `https://api.midlyr.com` | API base URL (for staging/dev) |

Get your API key from the [Midlyr dashboard](https://app.midlyr.com/config/api-keys).

## Available Tools

### browse_regulatory_library

Search and browse the regulatory document library with filtering and pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | No | Search query text |
| `category` | string[] | No | Filter by category (e.g., `statute`, `regulation`, `interagencyGuidance`) |
| `authorities` | string[] | No | Filter by authority (e.g., `OCC`, `FDIC`) |
| `jurisdictions` | string[] | No | Filter by jurisdiction (e.g., `us-federal`, `us-state:ny`) |
| `cursor` | string | No | Pagination cursor |

### read_regulatory_document

Read the text content of a regulatory document with byte-offset pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Document ID |
| `offset` | number | No | Byte offset (default: 0) |
| `limit` | number | No | Max bytes (default/max: 40000) |

### screen_analysis

Screen text content for regulatory compliance issues. Returns findings with risk scores and citations. Long-running operation (up to 30 minutes).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scenario` | enum | Yes | `marketing_asset`, `dispute`, `debt_collection`, `complaint`, `generic` |
| `text` | string | Yes | The text content to screen for compliance issues |

## License

MIT
