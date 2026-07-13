import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { requireRole, AuthError } from "@/lib/auth";
import { getUploadsDir, ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/uploads";

export const dynamic = "force-dynamic";

// Manager-only: upload a menu item image. Stores the file under
// DROIDBOT_UPLOADS_PATH with a server-generated random filename (never the
// client-supplied name) and returns the URL to save on the menu item.
export async function POST(req: NextRequest) {
  try {
    await requireRole("manager", req);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const ext = ALLOWED_IMAGE_TYPES[file.type];
    if (!ext) {
      return NextResponse.json({ error: "Unsupported image type. Use JPEG, PNG, WEBP, or GIF." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 400 });
    }

    const filename = `${randomUUID()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(getUploadsDir(), filename), bytes);

    return NextResponse.json({ url: `/api/uploads/${filename}` }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
