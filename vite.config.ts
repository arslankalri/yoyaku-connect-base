// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      mcpPlugin(),
      {
        // @vapi-ai/web does `class extends require("events")`; the browser build
        // swaps the bare Node name for an empty stub. "events/" forces the npm package.
        name: "nagi-browser-events",
        transform(code, id) {
          if (id.includes("vapi-ai")) console.log("VDBG", this.environment?.name, id);
          if (!id.includes("@vapi-ai/web") || !code.includes('require("events")')) return null;
          return { code: code.replaceAll('require("events")', 'require("events/")'), map: null };
        },
      },
    ],
  },
});
