"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type ActivityPhoto = { id: number; url: string; phase: "Activity" | "Before" | "After" };

function isImage(photo: ActivityPhoto) {
  return !/\.(mp4|webm)(?:\?.*)?$/i.test(photo.url);
}

export function CsrActivityPhotos({ activityTitle, photos }: { activityTitle: string; photos: ActivityPhoto[] }) {
  const images = photos.filter(isImage);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const selected = images[selectedIndex] ?? null;

  if (images.length === 0) return null;

  function openImage(index: number) {
    setSelectedIndex(index);
    setOpen(true);
  }

  return (
    <div className="csr-photo-strip" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} aria-label={`Photos attached to ${activityTitle}`}>
      <span className="csr-photo-label"><ImageIcon size={13} aria-hidden="true" /> Photos</span>
      <div className="csr-photo-thumbnails">
        {images.slice(0, 3).map((photo, index) => (
          <button type="button" className="csr-photo-thumbnail" key={`${photo.phase}-${photo.id}`} onClick={() => openImage(index)} aria-label={`View ${photo.phase.toLowerCase()} photo ${index + 1} for ${activityTitle}`}>
            <Image src={photo.url} alt={`${photo.phase} photo for ${activityTitle}`} fill sizes="72px" unoptimized />
            {photo.phase !== "Activity" && <span>{photo.phase}</span>}
          </button>
        ))}
        {images.length > 3 && <button type="button" className="csr-photo-more" onClick={() => openImage(3)} aria-label={`View ${images.length - 3} more photos for ${activityTitle}`}>+{images.length - 3}</button>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="csr-photo-dialog" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setSelectedIndex((index) => Math.max(0, index - 1));
          if (event.key === "ArrowRight") setSelectedIndex((index) => Math.min(images.length - 1, index + 1));
        }}>
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>{activityTitle}</DialogTitle>
              <DialogDescription>{selected ? `${selected.phase} photo · ${selectedIndex + 1} of ${images.length}` : "Activity photo"}</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close photo preview"><X size={17} /></DialogClose>
          </div>
          {selected && <div className="csr-photo-preview-frame"><Image src={selected.url} alt={`${selected.phase} photo for ${activityTitle}`} fill sizes="(max-width: 700px) 94vw, 1200px" unoptimized /></div>}
          {images.length > 1 && <div className="csr-photo-controls">
            <button type="button" className="button button-secondary" onClick={() => setSelectedIndex((index) => Math.max(0, index - 1))} disabled={selectedIndex === 0} aria-label="Previous photo"><ChevronLeft size={17} aria-hidden="true" /> Previous</button>
            <span>{selectedIndex + 1} / {images.length}</span>
            <button type="button" className="button button-secondary" onClick={() => setSelectedIndex((index) => Math.min(images.length - 1, index + 1))} disabled={selectedIndex === images.length - 1} aria-label="Next photo">Next <ChevronRight size={17} aria-hidden="true" /></button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
