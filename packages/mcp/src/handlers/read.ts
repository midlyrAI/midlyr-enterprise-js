import type { Midlyr } from "@midlyr/sdk";
import { textResult } from "../errors.js";

export async function readHandler(
  params: { id: string; offset: number; limit: number },
  client: Midlyr,
) {
  const { id, ...query } = params;
  return textResult(await client.regulations.readContent(id, query));
}
