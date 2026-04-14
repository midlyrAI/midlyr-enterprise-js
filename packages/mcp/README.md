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
| `category` | string[] | No | Filter by category (e.g., `statute`, `regulation`) |
| `authority` | string[] | No | Filter by authority (e.g., `OCC`, `FDIC`) |
| `jurisdiction` | string[] | No | Filter by jurisdiction (e.g., `federal`, `NY`) |
| `cursor` | string | No | Pagination cursor |

### read_regulatory_document

Read the full text of a regulatory document with offset-based pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Document ID |
| `offset` | number | No | Character offset (default: 0) |
| `limit` | number | No | Max characters (default/max: 40000) |

### query_regulatory_chunks (Preview)

Semantic search across regulation text. Returns relevant passages ranked by score.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query (max 2000 chars) |
| `document_ids` | string[] | No | Restrict to specific documents |
| `category` | string[] | No | Filter by category |
| `authority` | string[] | No | Filter by authority |
| `limit` | number | No | Max results (default: 10, max: 50) |

### start_compliance_screening (Preview)

Analyze which regulations apply to a financial institution. Long-running operation (up to 30 minutes).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `institution_type` | enum | Yes | `bank`, `credit_union`, `fintech`, `loan_servicer`, `mortgage_lender`, `other` |
| `institution_subtype` | string | No | Specific subtype |
| `total_assets` | number | No | Total assets in millions USD |
| `transaction_volumes` | array | No | Transaction data by type and year |

> **Note:** Tools marked *Preview* may return limited results as backend services are being rolled out.

## License

MIT
