import { packageName as sdkPackageName } from "@midlyr/sdk-js";

export { commandNames, type CommandName } from "./cmd/command-names.js";
export { runCli, type CliRuntime } from "./cmd/run-cli.js";

export const packageName = "@midlyr/cli";
export const sdkDependencyPackageName = sdkPackageName;
