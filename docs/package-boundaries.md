# Package Boundaries

This workspace contains three public packages:

- `@midlyr/sdk`
- `@midlyr/mcp`
- `@midlyr/cli`

## Boundary rule

`@midlyr/sdk` is the public dependency boundary for SDK functionality. The MCP and CLI packages may depend on the SDK package through the public package name:

```ts
import { packageName } from "@midlyr/sdk";
```

They must not import SDK private source paths such as `../sdk`, `packages/sdk/src`, or `@midlyr/sdk/src`.

## Consumer package manager support

MidLyr packages should publish as standard npm packages. Consumers should be able to install them with npm, pnpm, Yarn, or Bun. Repository-internal workspace tooling must not leak into published runtime code.

Examples after publication:

```bash
npm install @midlyr/sdk
pnpm add @midlyr/sdk
yarn add @midlyr/sdk
bun add @midlyr/sdk
```

Package manifests should keep standard `exports`, `types`, and `files` metadata. Internal `workspace:*` dependencies are acceptable during monorepo development, but release automation must ensure publishable dependency versions before npm publication.

## Current scope

This repository pass is scaffold-only. Business logic is deferred:

- no real SDK API methods,
- no real MCP tool implementations,
- no real CLI command behavior.

All package naming uses MCP terminology.
