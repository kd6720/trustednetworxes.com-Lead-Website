// Bundles the pre-compiled server (dist-server/) into one self-contained
// ESM Netlify Function. ESM output keeps import.meta.url defined, which the
// Prisma v7 generated client requires at import time (it would crash as
// undefined under Netlify's default esbuild CJS conversion).
import { build } from "esbuild";

await build({
  entryPoints: ["dist-server/server/netlify-handler.js"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: "netlify/functions/api.mjs",
  // pg's optional native binding — wrapped in try/catch upstream, safe to omit
  external: ["pg-native"],
  banner: {
    js: [
      "// CJS-compat shims for bundled CommonJS dependencies (express, pg, etc.)",
      'import { createRequire as __createRequire } from "node:module";',
      'import { fileURLToPath as __fileURLToPath } from "node:url";',
      'import { dirname as __pathDirname } from "node:path";',
      "const require = __createRequire(import.meta.url);",
      "const __filename = __fileURLToPath(import.meta.url);",
      "const __dirname = __pathDirname(__filename);",
    ].join("\n"),
  },
  logLevel: "info",
});
