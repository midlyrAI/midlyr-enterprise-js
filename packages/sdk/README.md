# `@midlyr/sdk`

Thin TypeScript SDK for MidLyr Enterprise REST APIs.

This package intentionally owns only shared API-calling behavior. Future MCP and CLI packages should depend on the SDK through the public `@midlyr/sdk` export instead of duplicating REST transport code.

## Install

```bash
npm install @midlyr/sdk
pnpm add @midlyr/sdk
yarn add @midlyr/sdk
bun add @midlyr/sdk
```

## Create a client

```ts
import { Midlyr } from "@midlyr/sdk";

const midlyr = new Midlyr({
  apiKey: process.env.MIDLYR_API_KEY!,
  // Override for staging, local development, or private deployments.
  baseUrl: "https://api.midlyr.com",
});
```

Requests authenticate with the `x-api-key` header.

## Regulation API

```ts
const page = await midlyr.regulations.browse({
  query: "fair lending",
  jurisdiction: "federal",
  limit: 25,
});

const regulation = await midlyr.regulations.read(page.results[0]!.id, {
  limit: 4_000,
});
```

## Analysis APIs

```ts
const screening = await midlyr.analysis.startScreening({
  institution_type: "bank",
  total_assets: 1_500,
  transaction_volumes: [{ type: "small_business_loans", annual_count: 200, year: 2026 }],
});

const job = await midlyr.jobs.get(screening.job_id);
```

## Job API

The SDK exposes `jobs.get(jobId)` only. It does not provide a polling helper; MCP and CLI layers can decide their own polling or display behavior later.

## Timeout and retries

The SDK uses native `fetch` and has no runtime HTTP-client dependency. Configure timeout and safe retries globally:

```ts
const midlyr = new Midlyr({
  apiKey: process.env.MIDLYR_API_KEY!,
  timeoutMs: 30_000,
  maxRetries: 1,
});
```

You can also override them per request:

```ts
await midlyr.regulations.browse({ query: "Regulation B" }, { timeoutMs: 10_000, maxRetries: 2 });
```

Retries are intentionally conservative:

- safe `GET` requests may retry network failures, timeouts, and HTTP `408`, `429`, `500`, `502`, `503`, or `504` responses;
- mutating `POST` requests are **not retried by default** until the API supports an idempotency strategy;
- `Retry-After` is respected when the API returns it.

## Errors

```ts
import { MidlyrAPIError, MidlyrNetworkError } from "@midlyr/sdk";

try {
  await midlyr.regulations.read("missing");
} catch (error) {
  if (error instanceof MidlyrAPIError) {
    console.error(error.status, error.code, error.message);
  }

  if (error instanceof MidlyrNetworkError) {
    console.error(error.isTimeout ? "Timed out" : "Network failure");
  }
}
```

## Current scope

`@midlyr/sdk` v0 wraps the current regulation/compliance REST endpoints:

Out of scope for this package pass:

- MCP tool implementations;
- CLI command behavior;
- job polling helpers;
- a separate resilience package;
- a runtime dependency on `ky` or another HTTP client.
