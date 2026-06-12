import serverless from "serverless-http";
import { app } from "../../server/index.js";

// Wrap the Express app as a Netlify Function.
// serverless-http translates API Gateway events → Express req/res.
export const handler = serverless(app);
