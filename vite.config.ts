import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

/**
 * Rewrites `import { X, Y } from "rmmz-types"` (and deep paths like
 * `rmmz-types/lib/sprites`) into `const { X, Y } = window;` so the engine
 * globals provided by RPG Maker MZ at runtime are picked up directly off
 * `window`. Live bindings are preserved because each reference becomes a
 * property access on `window`.
 *
 * Replaces `rollup-plugin-external-globals` (its function-form callback is
 * not invoked correctly by rolldown, which Vite 8 uses as its bundler).
 */
function rmmzExternalGlobals(): Plugin {
  const importRe =
    /import\s*\{([^}]+)\}\s*from\s*["']rmmz-types(?:\/[^"']*)?["'];?/g;
  return {
    name: "rmmz-external-globals",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("/src/")) return null;
      if (!importRe.test(code)) return null;
      importRe.lastIndex = 0;
      return code.replace(importRe, (_, bindings) => {
        // `import { Foo as Bar }` → `const { Foo: Bar } = window;`
        const destruct = bindings.replace(/\bas\b/g, ":");
        return `const {${destruct}} = window;`;
      });
    },
  };
}

const outDir = fileURLToPath(
  new URL("./cheat-engine/www/cheat", import.meta.url),
);

export default defineConfig({
  plugins: [vue(), rmmzExternalGlobals()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir,
    emptyOutDir: false,
    cssCodeSplit: false,
    target: "es2023",
    minify: true,
    sourcemap: false,
    lib: {
      entry: fileURLToPath(new URL("./src/main.ts", import.meta.url)),
      formats: ["es"],
      fileName: () => "init/setup.js",
      cssFileName: "init/setup",
    },
    rollupOptions: {
      // NW.js renderer provides `require()` for fs / path / nw.gui at
      // runtime; the bundler must leave them alone.
      external: ["fs", "path", "nw.gui"],
    },
  },
});
