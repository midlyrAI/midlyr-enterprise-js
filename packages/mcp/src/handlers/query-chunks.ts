import type { Midlyr } from "@midlyr/sdk";
import { textResult } from "../errors.js";

export async function queryChunksHandler(
  params: { query: string; documentIds?: string[]; category?: string[]; authority?: string[]; limit: number },
  client: Midlyr,
) {
  return textResult(await client.regulations.queryChunks(params));
}
