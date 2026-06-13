import mongoose from "mongoose";

import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import env from "./config/env.js";

let server;

const shutdown = async (signal, exitCode = 0) => {
  console.log(`${signal} received. Shutting down gracefully.`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await mongoose.connection.close();
  process.exit(exitCode);
};

const startServer = async () => {
  try {
    await connectDatabase();
    server = app.listen(env.port, () => {
      console.log(`EventSphere API running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Unable to start EventSphere API:", error.message);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  shutdown("uncaughtException", 1);
});

startServer();
