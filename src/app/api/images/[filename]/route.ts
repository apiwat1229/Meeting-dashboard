import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { imageMimeByExtension, imagePath, isStoredImageName } from "@/lib/image-uploads";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!isStoredImageName(filename)) {
    return NextResponse.json({ message: "Image not found." }, { status: 404 });
  }

  try {
    const image = await readFile(imagePath(filename));
    const extension = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase() as keyof typeof imageMimeByExtension;
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": imageMimeByExtension[extension],
        "Content-Length": String(image.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ message: "Image not found." }, { status: 404 });
  }
}
