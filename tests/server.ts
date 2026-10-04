import { createServer } from "vite";

const server = await createServer({
  server: {
    host: "127.0.0.1",
    port: Number(process.env.PORT),
    strictPort: true,
    hmr: false,
    watch: null,
  },
});
await server.listen();
console.log("Riftbound test client ready");
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => void server.close().then(() => process.exit(0)));
