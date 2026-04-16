import type { Midlyr } from "@midlyr/sdk";
import { textResult } from "../errors.js";

export async function browseHandler(
  params: { query?: string; category?: string[]; authorities?: string[]; jurisdictions?: string[]; cursor?: string },
  client: Midlyr,
) {
  return textResult(await client.regulations.browse(params));
}
