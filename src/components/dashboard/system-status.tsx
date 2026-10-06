"use client";

import Image from "next/image";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { saveCctvStatusAction, saveNetworkServerStatusAction } from "@/app/actions";
import { MediaFilePicker, uploadMediaFiles } from "@/components/dashboard/media-file-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { dashboardSectionNumbers } from "@/lib/dashboard-section-numbers";
import { CctvOperationsPanel } from "@/components/dashboard/cctv-operations";
import type { CctvMeeting, CctvRecorderItem } from "@/lib/cctv-operations";

type ServiceStatus = "UNKNOWN" | "NORMAL" | "ABNORMAL";
type NetworkService = {
  id: number;
  serviceKey: string;
  label: string;
  status: string;
  reason: string;
  detail: string;
  media: Array<{ id: number; url: string }>;
};
type ServiceDraft = Omit<NetworkService, "media"> & { status: ServiceStatus };
type CctvSettings = {
  cameraCount: number;
  cameraFaultyCount: number;
  cameraFaultReason: string;
  cameraWaitingRepairCount: number;
  cameraRepairingCount: number;
  cameraInstallingCount: number;
  recorderItems: CctvRecorderItem[];
  meetings: CctvMeeting[];
  media: Array<{ id: number; url: string }>;
};
type CctvDraft = {
  cameraCount: string;
  cameraFaultyCount: string;
  cameraFaultReason: string;
  cameraWaitingRepairCount: string;
  cameraRepairingCount: string;
  cameraInstallingCount: string;
};
type CctvStatusSaveResult = { ok: boolean; message: string; mediaWarning?: string };

const serviceStatusOptions = [
  { value: "UNKNOWN", label: "Not set" },
  { value: "NORMAL", label: "Normal" },
  { value: "ABNORMAL", label: "Abnormal" },
];

function createServiceDrafts(services: NetworkService[]): ServiceDraft[] {
  return services.map((service) => ({
    id: service.id,
    serviceKey: service.serviceKey,
    label: service.label,
    status: service.status === "NORMAL" || service.status === "ABNORMAL" ? service.status : "UNKNOWN",
    reason: service.reason,
    detail: service.detail,
  }));
}

function createCctvDraft(settings: CctvSettings): CctvDraft {
  return {
    cameraCount: String(settings.cameraCount),
    cameraFaultyCount: String(settings.cameraFaultyCount),
    cameraFaultReason: settings.cameraFaultReason,
    cameraWaitingRepairCount: String(settings.cameraWaitingRepairCount),
    cameraRepairingCount: String(settings.cameraRepairingCount),
    cameraInstallingCount: String(settings.cameraInstallingCount),
  };
}

function getNetworkSummary(services: NetworkService[]) {
  const normalCount = services.filter((service) => service.status === "NORMAL").length;
  const abnormalCount = services.filter((service) => service.status === "ABNORMAL").length;
  const unknownCount = services.length - normalCount - abnormalCount;
  if (services.length === 0 || normalCount === 0 && abnormalCount === 0) {
    return { value: "—", label: "No status reported", detail: undefined, tone: "neutral" as const, ariaLabel: "Network and server status not reported" };
  }
  if (abnormalCount > 0) {
    const pending = unknownCount > 0 ? ` · ${unknownCount} not set` : "";
    return {
      value: abnormalCount,
      label: abnormalCount === 1 ? "Abnormal service" : "Abnormal services",
      detail: `${normalCount} normal${pending}`,
      tone: "danger" as const,
      ariaLabel: `${abnormalCount} abnormal network or server services, ${normalCount} normal, ${unknownCount} not set`,
    };
  }
  if (unknownCount === 0) {
    return { value: `${normalCount}/${services.length}`, label: "Working Normally", detail: undefined, tone: "success" as const, ariaLabel: "All network and server services working normally" };
  }
  return {
    value: `${normalCount}/${services.length}`,
    label: "Status incomplete",
    detail: `${unknownCount} not set`,
    tone: "neutral" as const,
    ariaLabel: `${normalCount} network and server services normal, ${unknownCount} not set`,
  };
}

function getCctvSummary(settings: CctvSettings) {
  const issueCounts = [
    [settings.cameraFaultyCount, "faulty"],
    [settings.cameraWaitingRepairCount, "waiting"],
    [settings.cameraRepairingCount, "repairing"],
    [settings.cameraInstallingCount, "installing"],
  ] as const;
  const attentionCount = issueCounts.reduce((sum, [count]) => sum + count, 0);
  const allStatusDetails = issueCounts.filter(([count]) => count > 0).map(([count, label]) => `${count} ${label}`).join(" · ");
  const detail = settings.cameraInstallingCount > 0 ? `${settings.cameraInstallingCount} new installation` : undefined;
  if (settings.cameraCount === 0) {
    return { value: 0, label: "No cameras reported", detail: undefined, tone: "neutral" as const, ariaLabel: "No CCTV cameras reported" };
  }
  if (attentionCount === 0) {
    return { value: settings.cameraCount, label: "Working Normally", detail: undefined, tone: "success" as const, ariaLabel: `${settings.cameraCount} CCTV cameras working normally` };
  }
  const workingCount = Math.max(0, settings.cameraCount - attentionCount);
  return {
    value: settings.cameraCount,
    label: `${attentionCount} need attention`,
    detail,
    tone: workingCount === 0 ? "danger" as const : "warning" as const,
    ariaLabel: `${settings.cameraCount} CCTV cameras total, ${workingCount} working, ${allStatusDetails}`,
  };
}

function SavedMedia({ label, media, pending, onRemove }: {
  label: string;
  media: Array<{ id: number; url: string }>;
  pending?: boolean;
  onRemove?: (attachmentId: number) => void;
}) {
  if (media.length === 0) return null;
  return (
    <div className="system-service-media-list" aria-label={`Existing evidence for ${label}`}>
      {media.map((attachment) => {
        const video = /\.(mp4|webm)(?:$|\?)/i.test(attachment.url);
        return (
          <article className="system-service-media-item" key={attachment.id}>
            {video ? (
              <video src={attachment.url} controls playsInline preload="metadata" aria-label={`Video evidence for ${label}`} />
            ) : (
              <a href={attachment.url} target="_blank" rel="noreferrer" aria-label={`Open image evidence for ${label}`}>
                <Image src={attachment.url} alt={`Evidence for ${label}`} width={220} height={140} unoptimized />
              </a>
            )}
            {onRemove && (
              <button type="button" className="system-service-media-remove" onClick={() => onRemove(attachment.id)} disabled={pending}>
                Remove attachment
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function SystemStatusPanel({ networkServices, cctv, reportDateKey }: { networkServices: NetworkService[]; cctv: CctvSettings; reportDateKey: string }) {
  const router = useRouter();
  const networkSummary = getNetworkSummary(networkServices);
  const cctvSummary = getCctvSummary(cctv);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [networkPending, setNetworkPending] = useState(false);
  const [cctvPending, setCctvPending] = useState(false);
  const [serviceDrafts, setServiceDrafts] = useState<ServiceDraft[]>(() => createServiceDrafts(networkServices));
  const [pendingMedia, setPendingMedia] = useState<Record<number, File[]>>({});
  const [cctvDraft, setCctvDraft] = useState<CctvDraft>(() => createCctvDraft(cctv));
  const [pendingCctvMedia, setPendingCctvMedia] = useState<File[]>([]);

  function editNetworkStatus() {
    setServiceDrafts(createServiceDrafts(networkServices));
    setPendingMedia({});
    setNetworkOpen(true);
  }

  function editCctvStatus() {
    setCctvDraft(createCctvDraft(cctv));
    setPendingCctvMedia([]);
  }

  function closeNetworkDialog(open: boolean) {
    setNetworkOpen(open);
    if (!open && !networkPending) {
      setServiceDrafts(createServiceDrafts(networkServices));
      setPendingMedia({});
    }
  }

  function updateService(id: number, update: Partial<ServiceDraft>) {
    setServiceDrafts((current) => current.map((service) => service.id === id ? { ...service, ...update } : service));
  }

  function updateCctv(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const key = event.currentTarget.name as keyof CctvDraft;
    const value = event.currentTarget.value;
    setCctvDraft((current) => ({ ...current, [key]: value }));
    if (key === "cameraFaultyCount" && Number(value) === 0) setPendingCctvMedia([]);
  }

  async function removeSavedMedia(entityType: "networkService" | "cctv", entityId: number | string, attachmentId: number) {
    const formData = new FormData();
    formData.set("entityType", entityType);
    formData.set("entityId", String(entityId));
    formData.set("reportDate", reportDateKey);
    formData.set("attachmentId", String(attachmentId));
    formData.set("remove", "true");
    try {
      const response = await fetch("/api/images", { method: "POST", body: formData });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Could not remove this attachment.");
      router.refresh();
      toast.success("Attachment removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove this attachment.");
    }
  }

  async function saveNetwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNetworkPending(true);
    try {
      const formData = new FormData();
      formData.set("services", JSON.stringify(serviceDrafts.map(({ serviceKey, status, reason, detail }) => ({
        key: serviceKey,
        status,
        reason,
        detail,
      }))));
      const result = await saveNetworkServerStatusAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      let uploaded = 0;
      const failed: string[] = [];
      for (const service of networkServices) {
        const files = pendingMedia[service.id] ?? [];
        if (files.length === 0) continue;
        const uploadResult = await uploadMediaFiles("networkService", service.id, files);
        uploaded += uploadResult.uploaded;
        failed.push(...uploadResult.failed.map((item) => `${item.fileName}: ${item.message}`));
      }

      router.refresh();
      setPendingMedia({});
      closeNetworkDialog(false);
      if (failed.length > 0) toast.error(`Status saved; ${uploaded} media uploaded, ${failed.length} failed.`);
      else toast.success(uploaded > 0 ? `Network & Server status saved with ${uploaded} media files.` : result.message);
    } catch {
      toast.error("Could not save Network & Server status.");
    } finally {
      setNetworkPending(false);
    }
  }

  async function saveCctvStatus(formData: FormData): Promise<CctvStatusSaveResult> {
    setCctvPending(true);
    try {
      const result = await saveCctvStatusAction(formData);
      if (!result.ok) return result;
      const uploadResult = await uploadMediaFiles("cctv", reportDateKey, pendingCctvMedia);
      setPendingCctvMedia([]);
      return {
        ...result,
        mediaWarning: uploadResult.failed.length > 0
          ? `CCTV status saved; ${uploadResult.uploaded} photos uploaded, ${uploadResult.failed.length} failed.`
          : undefined,
      };
    } catch {
      return { ok: false, message: "Could not save CCTV status." };
    } finally {
      setCctvPending(false);
    }
  }

  return (
    <>
      <Card className="summary-card summary-systems-card">
        <ContextMenu as="div" role="button" className={`summary-breakdown-item summary-${networkSummary.tone} summary-systems-trigger`} ariaLabel={`${networkSummary.ariaLabel}. Click to configure.`} ariaExpanded={networkOpen} ariaHasPopup="dialog" onActivate={editNetworkStatus} onEdit={editNetworkStatus}>
          <strong className="summary-breakdown-title network-server-title">
            {dashboardSectionNumbers.networkServer}. Network &amp; Server
          </strong>
          <span className={`system-health-label system-health-${networkSummary.tone}`}>{networkSummary.label}</span>
          {networkSummary.detail && <small>{networkSummary.detail}</small>}
          <div className="network-service-summary" aria-label="Network and server service details">
            {networkServices.length > 0 ? networkServices.map((service) => {
              const statusVariant = service.status === "NORMAL" ? "success" : service.status === "ABNORMAL" ? "danger" : "neutral";
              const statusLabel = service.status === "NORMAL" ? "Normal" : service.status === "ABNORMAL" ? "Abnormal" : "Not set";
              const description = [service.reason, service.detail].filter(Boolean).join(" · ");

              return (
                <div className="network-service-summary-item" key={service.id}>
                  <div className="network-service-summary-row">
                    <span className="network-service-summary-name">{service.label}</span>
                    <Badge variant={statusVariant} className="network-service-summary-status">
                      {statusLabel}
                    </Badge>
                  </div>
                  {service.status === "ABNORMAL" && description && (
                    <small className="network-service-summary-note">{description}</small>
                  )}
                </div>
              );
            }) : (
              <span className="network-service-summary-empty">No services configured</span>
            )}
          </div>
        </ContextMenu>
      </Card>
      <Card className="summary-card summary-systems-card summary-cctv-card">
        <CctvOperationsPanel
          reportDateKey={reportDateKey}
          recorderItems={cctv.recorderItems}
          cameraStatusCounts={{
            faulty: cctv.cameraFaultyCount,
            waiting: cctv.cameraWaitingRepairCount,
            repairing: cctv.cameraRepairingCount,
          }}
          meetings={cctv.meetings}
          summary={cctvSummary}
          sectionNumber={dashboardSectionNumbers.cctv}
          onOpenStatus={editCctvStatus}
          saveStatus={saveCctvStatus}
          statusFields={(spareCctvField) => (
            <>
              <div className="cctv-count-card">
                <label className="field-label">Total cameras
                  <Input name="cameraCount" type="number" min="0" max="100000" step="1" required value={cctvDraft.cameraCount} onChange={updateCctv} />
                </label>
                <div className="cctv-count-grid">
                  <label className="field-label">Faulty
                    <Input name="cameraFaultyCount" type="number" min="0" max="100000" step="1" required value={cctvDraft.cameraFaultyCount} onChange={updateCctv} />
                  </label>
                  <label className="field-label">Waiting for repair
                    <Input name="cameraWaitingRepairCount" type="number" min="0" max="100000" step="1" required value={cctvDraft.cameraWaitingRepairCount} onChange={updateCctv} />
                  </label>
                  <label className="field-label">Being repaired
                    <Input name="cameraRepairingCount" type="number" min="0" max="100000" step="1" required value={cctvDraft.cameraRepairingCount} onChange={updateCctv} />
                  </label>
                  <label className="field-label">New installation
                    <Input name="cameraInstallingCount" type="number" min="0" max="100000" step="1" required value={cctvDraft.cameraInstallingCount} onChange={updateCctv} />
                  </label>
                  {spareCctvField}
                </div>
                <p className="cctv-count-help">The four status counts together cannot exceed the total camera count.</p>
                {Number(cctvDraft.cameraFaultyCount) > 0 && (
                  <div className="cctv-fault-fields">
                    <label className="field-label">Reason for faulty cameras
                      <Textarea name="cameraFaultReason" required maxLength={2000} rows={3} value={cctvDraft.cameraFaultReason} onChange={updateCctv} placeholder="Describe why the cameras are faulty" />
                    </label>
                    <MediaFilePicker
                      files={pendingCctvMedia}
                      pending={cctvPending}
                      onFilesChange={setPendingCctvMedia}
                      className="network-service-upload"
                      frameClassName="network-service-upload-grid"
                      label="CCTV fault photos"
                    />
                  </div>
                )}
              </div>
              <SavedMedia
                label="CCTV"
                media={cctv.media}
                pending={cctvPending}
                onRemove={(attachmentId) => { void removeSavedMedia("cctv", reportDateKey, attachmentId); }}
              />
            </>
          )}
        />
      </Card>

      <Dialog open={networkOpen} onOpenChange={closeNetworkDialog}>
        <DialogContent className="detail-dialog-content system-status-dialog network-status-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Network &amp; Server</DialogTitle>
              <DialogDescription>Set each service status. Add a reason, details, and supporting media for abnormal services.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close Network & Server status"><X size={17} /></DialogClose>
          </div>
          <form onSubmit={(event) => { void saveNetwork(event); }} className="system-status-form">
            <div className="network-service-list">
              {serviceDrafts.map((service) => {
                const savedService = networkServices.find((item) => item.id === service.id) ?? { ...service, media: [] };
                const selectedFiles = pendingMedia[service.id] ?? [];
                return (
                  <section className={`network-service-card${service.status === "ABNORMAL" ? " network-service-card-abnormal" : ""}`} key={service.id}>
                    <div className="network-service-heading">
                      <h3>{service.label}</h3>
                      <label className="field-label network-service-status">Status
                        <ComboboxSelect options={serviceStatusOptions} value={service.status} onValueChange={(value) => {
                          if (value !== "UNKNOWN" && value !== "NORMAL" && value !== "ABNORMAL") return;
                          updateService(service.id, {
                            status: value,
                            ...(value === "NORMAL" || value === "UNKNOWN" ? { reason: "", detail: "" } : {}),
                          });
                        }} />
                      </label>
                    </div>
                    {service.status === "ABNORMAL" && (
                      <div className="network-service-abnormal-fields">
                        <label className="field-label">Reason
                          <Input required maxLength={240} value={service.reason} onChange={(event) => updateService(service.id, { reason: event.currentTarget.value })} placeholder="Short reason for the abnormal status" />
                        </label>
                        <label className="field-label">Details
                          <Textarea required maxLength={2000} rows={3} value={service.detail} onChange={(event) => updateService(service.id, { detail: event.currentTarget.value })} placeholder="Describe the impact or what needs attention" />
                        </label>
                        <MediaFilePicker
                          files={selectedFiles}
                          pending={networkPending}
                          onFilesChange={(files) => setPendingMedia((current) => ({ ...current, [service.id]: files }))}
                          className="network-service-upload"
                          frameClassName="network-service-upload-grid"
                          label="Supporting media"
                        />
                      </div>
                    )}
                    <SavedMedia label={service.label} media={savedService.media} pending={networkPending} onRemove={(attachmentId) => { void removeSavedMedia("networkService", service.id, attachmentId); }} />
                  </section>
                );
              })}
            </div>
            <div className="project-edit-actions">
              <Button type="button" variant="secondary" onClick={() => closeNetworkDialog(false)} disabled={networkPending}>Cancel</Button>
              <Button type="submit" disabled={networkPending}>{networkPending ? "Saving…" : "Save status"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </>
  );
}
