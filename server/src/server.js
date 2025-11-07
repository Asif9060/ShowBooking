import http from "http";
import app from "./app.js";
import env from "./config/env.js";

const server = http.createServer(app);

const start = () => {
   const { port } = env;
   server.listen(port, () => {
      console.log(`[server] Listening on port ${port}`);
   });

   server.on("error", (error) => {
      console.error("[server] Failed to start", error);
      process.exit(1);
   });
};

start();

export default server;
