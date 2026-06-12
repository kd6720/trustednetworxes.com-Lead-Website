// Netlify Function entry point — plain JS, no bundler needed.
// The server TypeScript is pre-compiled to dist-server/ during build.
import serverless from "serverless-http";
import { app } from "../../dist-server/server/index.js";

export const handler = serverless(app);
