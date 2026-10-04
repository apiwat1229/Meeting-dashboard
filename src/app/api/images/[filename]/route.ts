import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { isStoredMediaName, mediaMimeByExtension, mediaPath, type MediaExtension } from "@/lib/image-uploads";
import { hasDashboardSession } from "@/lib/dashboard-auth";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  if (!(await hasDashboardSession())) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

  const { filename } = await params;
  if (!isStoredMediaName(filename)) {
    return NextResponse.json({ message: "Media not found." }, { status: 404 });
  }

  try {
    const filePath = mediaPath(filename);
    const fileStats = await stat(filePath);
    const extension = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase() as MediaExtension;
    const range = request.headers.get("range");
    let start = 0;
    let end = fileStats.size - 1;
    let status = 200;

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || fileStats.size === 0) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${fileStats.size}` } });
      }
      if (match[1] === "") {
        const suffixLength = Number(match[2]);
        if (!suffixLength) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${fileStats.size}` } });
        start = Math.max(fileStats.size - suffixLength, 0);
      } else {
        start = Number(match[1]);
        if (match[2] !== "") end = Number(match[2]);
      }
      end = Math.min(end, fileStats.size - 1);
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= fileStats.size) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${fileStats.size}` } });
      }
      status = 206;
    }

    const headers = new Headers({
      "Content-Type": mediaMimeByExtension[extension],
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
    });
    if (status === 206) headers.set("Content-Range", `bytes ${start}-${end}/${fileStats.size}`);

    const stream = createReadStream(filePath, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, { status, headers });
  } catch {
    return NextResponse.json({ message: "Media not found." }, { status: 404 });
  }
}
