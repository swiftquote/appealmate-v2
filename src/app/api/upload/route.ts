// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs"; // use Node (not Edge) for larger request bodies

// Optional: keep uploads to a sensible size (in bytes)
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const type = (form.get("type") as string) || "ticket";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Make a safe, predictable key in your blob store
    const ext = file.name.split(".").pop() || "jpg";
    const base = file.name.replace(/\.[^.]+$/, "");
    const safeBase = base.replace(/[^\w.-]/g, "_");
    const key = `uploads/${type}/${Date.now()}-${safeBase}.${ext}`;

    // Upload to Vercel Blob (public URL returned)
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN!, // <-- make sure this is set in Vercel
      contentType: file.type,
    });

    return NextResponse.json({
      success: true,
      file: {
        name: blob.pathname.split("/").pop(),
        originalName: file.name,
        size: file.size,
        type: file.type,
        path: `/${blob.pathname}`,
        url: blob.url, // public URL you can render/use immediately
      },
    });
  } catch (err: any) {
    console.error("Blob upload error:", err);
    return NextResponse.json(
      { error: "Internal server error during file upload", details: err?.message },
      { status: 500 }
    );
  }
}
