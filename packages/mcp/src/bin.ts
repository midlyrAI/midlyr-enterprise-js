#!/usr/bin/env node
import { Midlyr } from "@midlyr/sdk";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const client = new Midlyr({
  apiKey: process.env.MIDLYR_API_KEY ?? "",
  baseUrl: process.env.MIDLYR_BASE_URL,
});

const server = createServer(client);
const transport = new StdioServerTransport();
await server.connect(transport);
