// Production start wrapper. Ensures a strong session secret exists in the
// process environment BEFORE Next.js boots, so the Node route handlers and the
// edge middleware (which read process.env.DROIDBOT_SESSION_SECRET independently)
// always agree on the same signing key. If DROIDBOT_SESSION_SECRET is already
// provided we use it unchanged (recommended for multi-instance / persistent
// sessions); otherwise we generate a cryptographically strong random value.
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const KEY = "DROIDBOT_SESSION_SECRET";
if (!process.env[KEY] || process.env[KEY].length < 16) {
  process.env[KEY] = crypto.randomBytes(48).toString("hex");
  console.warn(
    `[security] ${KEY} was not set; generated an ephemeral random secret for this process. ` +
      `Set ${KEY} explicitly for stable, multi-instance sessions.`
  );
}

const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start"],
  { stdio: "inherit", env: process.env }
);
child.on("exit", (code) => process.exit(code ?? 0));
