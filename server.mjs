import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
};
const port = Number(process.env.PORT || 4186);
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const target = path.resolve(
        root,
        "." +
          (url.pathname === "/"
            ? "/index.html"
            : decodeURIComponent(url.pathname)),
      );
      const relative = path.relative(root, target);
      if (
        relative.startsWith("..") ||
        path.isAbsolute(relative) ||
        relative
          .split(path.sep)
          .some(
            (p) => p.startsWith(".") || ["node_modules", "tests"].includes(p),
          )
      ) {
        res.writeHead(403);
        return res.end("Forbidden");
      }
      const data = await readFile(target);
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(target)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Riftbound is ready: http://localhost:${port}`),
  );
