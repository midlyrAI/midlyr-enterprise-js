import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Midlyr } from "@midlyr/sdk";

import * as browseSchema from "./schemas/browse.js";
import * as readSchema from "./schemas/read.js";
import * as queryChunksSchema from "./schemas/query-chunks.js";
import * as screeningSchema from "./schemas/screening.js";

import { browseHandler } from "./handlers/browse.js";
import { readHandler } from "./handlers/read.js";
import { queryChunksHandler } from "./handlers/query-chunks.js";
import { screeningHandler } from "./handlers/screening.js";

export function registerTools(server: McpServer, client: Midlyr): void {
  server.tool(browseSchema.name, browseSchema.description, browseSchema.schema, (args) =>
    browseHandler(args, client),
  );

  server.tool(readSchema.name, readSchema.description, readSchema.schema, (args) =>
    readHandler(args, client),
  );

  server.tool(queryChunksSchema.name, queryChunksSchema.description, queryChunksSchema.schema, (args) =>
    queryChunksHandler(args, client),
  );

  server.tool(screeningSchema.name, screeningSchema.description, screeningSchema.schema, (args) =>
    screeningHandler(args, client),
  );
}
