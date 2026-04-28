# MidLyr JavaScript Workspace

This repository is the scaffold for MidLyr's public JavaScript developer tooling packages.

## Packages

- `@midlyr/sdk-js` — public SDK package boundary for future MidLyr API client code.
- `@midlyr/cli` — public CLI package that will depend on the SDK public exports.

This pass intentionally contains package structure, build/typecheck/test/lint scaffolding, and placeholder entrypoints only. SDK API methods and CLI commands are deferred to later implementation work.

## Package manager compatibility goal

These packages are intended to publish as standard npm packages. Consumers should be able to install published packages with npm, pnpm, Yarn, or Bun:

```bash
npm install @midlyr/sdk-js
pnpm add @midlyr/sdk-js
yarn add @midlyr/sdk-js
bun add @midlyr/sdk-js
```

The repository currently uses pnpm for workspace development, but that does not make pnpm a consumer requirement. Published package code should stay package-manager-neutral and Node-compatible. The SDK should prefer portable JavaScript and Web APIs where possible so Bun users can consume it from npm as well.

## Workspace commands

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm lint
```

See [`docs/package-boundaries.md`](./docs/package-boundaries.md) for package boundary rules.
