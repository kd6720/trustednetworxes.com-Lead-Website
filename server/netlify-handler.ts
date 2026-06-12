// Netlify Function source — compiled by tsc to dist-server/, then bundled
// into a single self-contained ESM file (netlify/functions/api.mjs) by
// scripts/build-function.mjs. Do not deploy this file directly.
import serverless from "serverless-http";
import { app } from "./index.js";

export const handler = serverless(app);
