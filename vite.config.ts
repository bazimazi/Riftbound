import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

export default defineConfig({
  base: "./",
  server: { host: "127.0.0.1", port: 4186, strictPort: true },
  preview: { host: "127.0.0.1", port: 4186, strictPort: true },
  build: {
    target: "es2022",
    modulePreload: false,
    // file:// images taint canvases. Embedded art keeps sprite pixel reads and
    // the local font available in browsers and desktop webviews without HTTP.
    assetsInlineLimit: (file) => /\.(png|woff2)$/.test(file),
    cssCodeSplit: false,
    // One offline script intentionally contains the sprite atlases.
    chunkSizeWarningLimit: 50000,
    rolldownOptions: {
      output: { format: "iife", name: "Riftbound" },
    },
  },
  plugins: [
    {
      name: "standalone-client-html",
      apply: "build",
      generateBundle() {
        for (const [fileName, path] of [
          ["LICENSE", "./LICENSE"],
          ["licenses/Outfit-OFL.txt", "./assets/OFL.txt"],
        ]) {
          this.emitFile({
            type: "asset",
            fileName,
            source: readFileSync(new URL(path, import.meta.url), "utf8"),
          });
        }
      },
      transformIndexHtml: {
        order: "post",
        handler(html) {
          // Classic scripts and relative assets also work from file:// in a
          // browser or a desktop webview, without an HTTP server.
          return html
            .replace(/type="module"/g, "defer")
            .replace(/ crossorigin(?:="[^"]*")?/g, "");
        },
      },
    },
  ],
});
