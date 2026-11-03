"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Image as ImageIcon, Tag, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatProjectDate } from "@/lib/project-dates";

const CATEGORY_PAGE_SIZE = 5;

type Photo = { id: number; url: string; phase: "Activity" | "Before" | "After" };
type PhotoActivity = {
  id: number;
  content: string;
  description: string;
  category: "CSR" | "GA" | "SUPPORT" | "GENERAL";
  reportDate: string;
  activityDate: string;
  progress: number;
  completed: boolean;
  supplierName: string | null;
  supplierDetails: string | null;
  photos: Photo[];
};

const PHOTO_GROUPS: Array<{ category: PhotoActivity["category"]; title: string }> = [
  { category: "CSR", title: "CSR & Community" },
  { category: "GA", title: "GA, Grounds & Safety" },
  { category: "SUPPORT", title: "Support & Coordination" },
  { category: "GENERAL", title: "Other / Unclassified Activities" },
];

function isImage(photo: Photo) {
  return !/\.(mp4|webm)(?:\?.*)?$/i.test(photo.url);
}

function categoryLabel(category: PhotoActivity["category"]) {
  switch (category) {
    case "CSR": return "CSR & Community";
    case "GA": return "GA, Grounds & Safety";
    case "SUPPORT": return "Support & Coordination";
    default: return "Other activity";
  }
}

function formatActivityCardDate(dateKey: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00Z`));
}

export function CsrPhotoGallery({ activities }: { activities: PhotoActivity[] }) {
  const photoActivities = activities
    .map((activity) => ({ ...activity, photos: activity.photos.filter(isImage) }))
    .filter((activity) => activity.photos.length > 0);
  const [expandedGroups, setExpandedGroups] = useState<Partial<Record<PhotoActivity["category"], boolean>>>({});
  const [activeActivity, setActiveActivity] = useState<PhotoActivity | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  if (photoActivities.length === 0) return null;

  const photoGroups = PHOTO_GROUPS
    .map((group) => ({ ...group, activities: photoActivities.filter((activity) => activity.category === group.category) }))
    .filter((group) => group.activities.length > 0);
  const totalPhotos = photoActivities.reduce((count, activity) => count + activity.photos.length, 0);
  const selectedPhoto = activeActivity?.photos[selectedPhotoIndex] ?? null;

  function openActivity(activity: PhotoActivity) {
    setActiveActivity(activity);
    setSelectedPhotoIndex(0);
  }

  function movePhoto(direction: -1 | 1) {
    if (!activeActivity) return;
    setSelectedPhotoIndex((index) => Math.max(0, Math.min(activeActivity.photos.length - 1, index + direction)));
  }

  return (
    <>
      <Card className="csr-panel csr-photo-gallery-panel">
        <div className="csr-panel-heading">
          <span className="csr-panel-icon"><ImageIcon size={18} aria-hidden="true" /></span>
          <div className="csr-panel-title-copy">
            <h2 className="type-h2">Activity photos</h2>
            <p>Photos from this and earlier daily reports.</p>
          </div>
          <span className="csr-photo-gallery-count">{totalPhotos} photos · {photoActivities.length} activities</span>
        </div>
        <div className="csr-photo-category-list">
          {photoGroups.map((group) => {
            const isExpanded = expandedGroups[group.category] ?? false;
            const visibleActivities = isExpanded ? group.activities : group.activities.slice(0, CATEGORY_PAGE_SIZE);
            const remainingCount = group.activities.length - visibleActivities.length;
            const groupPhotoCount = group.activities.reduce((count, activity) => count + activity.photos.length, 0);
            return (
              <section className="csr-photo-category-group" key={group.category} aria-labelledby={`csr-photo-group-${group.category}`}>
                <div className="csr-photo-category-heading">
                  <h3 id={`csr-photo-group-${group.category}`}>{group.title}</h3>
                  <span>{group.activities.length} activities · {groupPhotoCount} photos</span>
                </div>
                <div className="csr-photo-gallery-grid">
                  {visibleActivities.map((activity) => {
                    const cover = activity.photos[0];
                    const date = activity.activityDate || activity.reportDate;
                    return (
                      <button type="button" className="csr-photo-card" key={activity.id} onClick={() => openActivity(activity)} aria-label={`Open activity details: ${activity.content}`}>
                        <span className="csr-photo-card-image">
                          <Image src={cover.url} alt={activity.content} fill sizes="(max-width: 700px) 92vw, (max-width: 1150px) 45vw, 31vw" unoptimized />
                          <span className="csr-photo-card-date">{formatActivityCardDate(date)}</span>
                        </span>
                        <span className="csr-photo-card-body">
                          <strong>{activity.content}</strong>
                          {activity.description.trim() && <span className="csr-photo-card-excerpt">{activity.description}</span>}
                          <span className="csr-photo-card-cta">อ่านรายละเอียดเพิ่มเติม <ArrowUpRight size={16} aria-hidden="true" /></span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {group.activities.length > CATEGORY_PAGE_SIZE && (
                  <div className="csr-photo-gallery-footer">
                    <span>{isExpanded ? `Showing all ${group.activities.length} activities` : `Showing ${visibleActivities.length} of ${group.activities.length} activities`}</span>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setExpandedGroups((current) => ({ ...current, [group.category]: !isExpanded }))}
                    >
                      {isExpanded ? "Show latest 5" : `Show all ${remainingCount} more`}
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </Card>

      <Dialog open={activeActivity !== null} onOpenChange={(open) => { if (!open) setActiveActivity(null); }}>
        {activeActivity && (
          <DialogContent
            className="csr-activity-detail-modal"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") movePhoto(-1);
              if (event.key === "ArrowRight") movePhoto(1);
            }}
          >
            <header className="csr-activity-modal-header">
              <div className="csr-activity-modal-heading">
                <span className="csr-photo-card-category">{categoryLabel(activeActivity.category)}</span>
                <DialogTitle>{activeActivity.content}</DialogTitle>
                <DialogDescription>
                  {formatProjectDate(activeActivity.activityDate || activeActivity.reportDate)} · {activeActivity.photos.length} photos
                </DialogDescription>
              </div>
              <DialogClose className="icon-button project-tasks-close" aria-label="Close activity details"><X size={17} /></DialogClose>
            </header>

            <div className="csr-activity-modal-layout">
              <div className="csr-activity-modal-main-column">
                <section className="csr-activity-modal-gallery" aria-label="Activity photo gallery">
                  <div className="csr-activity-modal-main-image">
                    {selectedPhoto && <Image src={selectedPhoto.url} alt={`${selectedPhoto.phase} photo ${selectedPhotoIndex + 1} for ${activeActivity.content}`} fill sizes="(max-width: 800px) 92vw, 64vw" unoptimized />}
                    {activeActivity.photos.length > 1 && (
                      <>
                        <button type="button" className="csr-activity-photo-nav is-previous" onClick={() => movePhoto(-1)} disabled={selectedPhotoIndex === 0} aria-label="Previous photo"><ArrowLeft size={18} /></button>
                        <button type="button" className="csr-activity-photo-nav is-next" onClick={() => movePhoto(1)} disabled={selectedPhotoIndex === activeActivity.photos.length - 1} aria-label="Next photo"><ArrowRight size={18} /></button>
                        <span className="csr-activity-photo-index">{selectedPhotoIndex + 1} / {activeActivity.photos.length}</span>
                      </>
                    )}
                  </div>
                  {activeActivity.photos.length > 1 && (
                    <div className="csr-activity-photo-thumbnails">
                      {activeActivity.photos.map((photo, index) => (
                        <button
                          type="button"
                          key={photo.id}
                          className={`csr-activity-photo-thumb${selectedPhotoIndex === index ? " is-selected" : ""}`}
                          onClick={() => setSelectedPhotoIndex(index)}
                          aria-label={`Show photo ${index + 1} of ${activeActivity.photos.length}`}
                          aria-pressed={selectedPhotoIndex === index}
                        >
                          <Image src={photo.url} alt="" fill sizes="90px" unoptimized />
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                {(activeActivity.description.trim() || activeActivity.supplierName || activeActivity.supplierDetails) && (
                  <article className="csr-activity-modal-article">
                    {activeActivity.description.trim() && (
                      <section className="csr-activity-modal-description">
                        <h3>Activity details</h3>
                        <p>{activeActivity.description}</p>
                      </section>
                    )}
                    {(activeActivity.supplierName || activeActivity.supplierDetails) && (
                      <section className="csr-activity-modal-description">
                        <h3>Support / supplier</h3>
                        {activeActivity.supplierName && <p><strong>{activeActivity.supplierName}</strong></p>}
                        {activeActivity.supplierDetails && <p>{activeActivity.supplierDetails}</p>}
                      </section>
                    )}
                  </article>
                )}
              </div>

              <aside className="csr-activity-modal-details">
                <div className="csr-activity-summary-heading">
                  <h3>Activity summary</h3>
                </div>
                <div className="csr-activity-summary-list">
                  <div className="csr-activity-summary-row">
                    <span className="csr-activity-summary-icon is-date"><CalendarDays size={16} aria-hidden="true" /></span>
                    <div><span>Activity date</span><strong>{formatProjectDate(activeActivity.activityDate || activeActivity.reportDate)}</strong></div>
                  </div>
                  <div className="csr-activity-summary-row">
                    <span className="csr-activity-summary-icon"><Tag size={16} aria-hidden="true" /></span>
                    <div><span>Category</span><strong>{categoryLabel(activeActivity.category)}</strong></div>
                  </div>
                </div>
                <div className="csr-activity-modal-progress">
                  <div><span>Progress</span><strong>{activeActivity.completed ? 100 : activeActivity.progress}%</strong></div>
                  <div className="csr-activity-progress-track"><span style={{ width: `${activeActivity.completed ? 100 : activeActivity.progress}%` }} /></div>
                </div>
                {selectedPhoto && (
                  <span className="csr-activity-photo-phase">
                    <ImageIcon size={14} aria-hidden="true" />
                    {selectedPhoto.phase} photo
                  </span>
                )}
              </aside>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
