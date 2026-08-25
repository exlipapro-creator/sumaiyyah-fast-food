import { NextResponse } from "next/server";
import getDb from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    
    // 1. Verify database responsiveness and table query
    const result = db.prepare("SELECT 1 as health_check").get() as { health_check: number } | undefined;
    if (!result || result.health_check !== 1) {
      return NextResponse.json(
        { status: "error", error: "Database query check failed" },
        { status: 503 }
      );
    }

    // 2. Verify disk storage accessibility for persistence path
    const dbPath = process.env.DROIDBOT_DB_PATH ?? path.join(process.cwd(), "data", "app.db");
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      return NextResponse.json(
        { status: "error", error: "Data storage directory unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: "ok",
        database: "ok",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[health] Health check failed:", error);
    return NextResponse.json(
      { status: "error", error: "Service unavailable" },
      { status: 503 }
    );
  }
}
