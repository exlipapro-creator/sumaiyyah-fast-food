import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";

const KEY = "DROIDBOT_SESSION_SECRET";

if (!process.env[KEY] || process.env[KEY].length < 64) {
  process.env[KEY] = crypto.randomBytes(48).toString("hex");

  console.warn(
    `[security] ${KEY} was not set or was too short; generated an ephemeral secret. ` +
    `Set ${KEY} explicitly in production for stable sessions.`
  );
}

// In the Docker container, .next/standalone is copied to root so server.js is at root.
// In local builds, server.js may be inside .next/standalone/server.js.
const serverScript = fs.existsSync("server.js")
  ? "server.js"
  : fs.existsSync(".next/standalone/server.js")
  ? ".next/standalone/server.js"
  : "server.js";

const child = spawn(
  process.execPath,
  [serverScript],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: process.env.PORT || "3000",
      HOSTNAME: "0.0.0.0",
    },
  }
);

child.on("error", (error) => {
  console.error("[startup] Failed to start server:", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[startup] Server terminated by signal: ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 0);
});
