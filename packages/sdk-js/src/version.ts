import pkg from "../package.json" with { type: "json" };

export const SDK_VERSION: string = pkg.version;
export const SDK_CLIENT_PRODUCT = "midlyr-sdk-js";
export const SDK_CLIENT_IDENTITY = `${SDK_CLIENT_PRODUCT}/${SDK_VERSION}`;
