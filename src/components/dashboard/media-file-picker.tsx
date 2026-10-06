"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Film, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { getBangkokDateKey } from "@/lib/date-key";

const acceptedImages = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const acceptedVideos = new Set(["video/mp4", "video/webm"]);

export function isSupportedMedia(file: File) {
  return acceptedImages.has(file.type) || acceptedVideos.has(file.type);
}

export function mediaSizeLimit(file: File) {
  return (acceptedVideos.has(file.type) ? 100 : 5) * 1024 * 1024;
}

export function currentReportDateKey() {
  return new URL(window.location.href).searchParams.get("date") ?? getBangkokDateKey();
}

export function MediaFilePicker({
  files,
  pending,
  onFilesChange,
  className = "",
  frameClassName = "",
  label = "Media",
  imagesOnly = false,
}: {
  files: File[];
  pending: boolean;
  onFilesChange: (files: File[]) => void;
  className?: string;
  frameClassName?: string;
  label?: string;
  imagesOnly?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selectedFiles = Array.from(input.files ?? []);
    input.value = "";
    if (selectedFiles.length === 0) return;

    const supported = (file: File) => imagesOnly ? acceptedImages.has(file.type) : isSupportedMedia(file);
    const supportedFiles = selectedFiles.filter((file) => supported(file) && file.size > 0 && file.size <= mediaSizeLimit(file));
    const hasInvalidType = selectedFiles.some((file) => !supported(file));
    const hasInvalidSize = selectedFiles.some((file) => isSupportedMedia(file) && (file.size < 1 || file.size > mediaSizeLimit(file)));
    if (hasInvalidType) toast.error(imagesOnly ? "Use JPG, PNG, WebP, or GIF images." : "Use JPG, PNG, WebP, or GIF images, or MP4 or WebM videos.");
    if (hasInvalidSize) toast.error("Images must be under 5 MB and videos under 100 MB.");
    if (supportedFiles.length === 0) return;

    const seen = new Set(files.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
    const additions = supportedFiles.filter((file) => {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    onFilesChange([...files, ...additions]);
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
  }

  return (
    <section className={`detail-image-section ${className}`.trim()} aria-label={`${label} attachments`}>
      <div className="detail-image-heading">
        <h3>{label}</h3>
        <div className="detail-image-actions">
          <input
            ref={fileInput}
            className="detail-image-input"
            type="file"
            accept={imagesOnly ? "image/jpeg,image/png,image/webp,image/gif" : "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"}
            aria-label="Upload images or videos"
            multiple
            onChange={handleFileChange}
            disabled={pending}
          />
          <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()} disabled={pending}>
            <ImagePlus size={15} aria-hidden="true" />
            {files.length > 0 ? "Add media" : "Upload media"}
          </Button>
        </div>
      </div>
      {files.length > 0 ? (
        <div className={`media-upload-grid ${frameClassName}`.trim()}>
          {files.map((file, index) => (
            <MediaFilePreview key={`${file.name}:${file.size}:${file.lastModified}`} file={file} pending={pending} onRemove={() => removeFile(index)} />
          ))}
        </div>
      ) : <p className="detail-image-empty">No media attached.</p>}
      <p className="detail-image-help">
        {imagesOnly ? "Images: JPG, PNG, WebP, GIF (5 MB max each)" : "Images: JPG, PNG, WebP, GIF (5 MB max each) · Videos: MP4, WebM (100 MB max each)"}
      </p>
    </section>
  );
}

function MediaFilePreview({ file, pending, onRemove }: { file: File; pending: boolean; onRemove: () => void }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const isVideo = acceptedVideos.has(file.type);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <article className="media-upload-item">
      <div className="detail-image-frame media-upload-frame">
        {previewUrl && (isVideo
          ? <video className="activity-media-preview" src={previewUrl} controls playsInline preload="metadata" aria-label={`Preview of ${file.name}`} />
          : <Image className="activity-image-preview" src={previewUrl} alt={`Preview of ${file.name}`} fill sizes="(max-width: 700px) 90vw, 320px" unoptimized />)}
      </div>
      <div className="media-upload-caption">
        <span title={file.name}>{isVideo && <Film size={13} aria-hidden="true" />}{file.name}</span>
        <Button type="button" variant="ghost" className="detail-image-remove" aria-label={`Remove ${file.name}`} onClick={onRemove} disabled={pending}>
          <Trash2 size={14} aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

export async function uploadMediaFiles(entityType: "issue" | "activity" | "networkService" | "cctv", entityId: number | string, files: File[]) {
  const failed: Array<{ fileName: string; message: string }> = [];
  let uploaded = 0;
  for (const file of files) {
    const formData = new FormData();
    formData.set("entityType", entityType);
    formData.set("entityId", String(entityId));
    const reportDate = currentReportDateKey();
    if (reportDate) formData.set("reportDate", reportDate);
    formData.set("file", file);
    try {
      const response = await fetch("/api/images", { method: "POST", body: formData });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (response.ok && result.ok) uploaded += 1;
      else failed.push({ fileName: file.name, message: result.message ?? "Could not save the media file." });
    } catch {
      failed.push({ fileName: file.name, message: "Could not save the media file." });
    }
  }
  return { uploaded, failed };
}
