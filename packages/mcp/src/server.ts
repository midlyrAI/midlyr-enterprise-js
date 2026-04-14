import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Midlyr } from "@midlyr/sdk";
import { registerTools } from "./tools.js";

export function createServer(client: Midlyr): McpServer {
  const server = new McpServer({
    name: "midlyr-compliance",
    version: "0.1.0",
  });

  registerTools(server, client);

  return server;
}
