"use client";

import Image from "next/image";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { saveCctvStatusAction, saveNetworkServerStatusAction } from "@/app/actions";
import { MediaFilePicker, uploadMediaFiles } from "@/components/dashboard/media-file-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

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
  cameraWaitingRepairCount: number;
  cameraRepairingCount: number;
  cameraInstallingCount: number;
};
type CctvDraft = Record<keyof CctvSettings, string>;

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
  const detail = issueCounts.filter(([count]) => count > 0).map(([count, label]) => `${count} ${label}`).join(" · ") || undefined;
  if (settings.cameraCount === 0) {
    return { value: 0, label: "No cameras reported", detail: undefined, tone: "neutral" as const, ariaLabel: "No CCTV cameras reported" };
  }
  if (attentionCount === 0) {
    return { value: settings.cameraCount, label: "Working Normally", detail: undefined, tone: "success" as const, ariaLabel: `${settings.cameraCount} CCTV cameras working normally` };
  }
  const workingCount = Math.max(0, settings.cameraCount - attentionCount);
  return {
    value: workingCount,
    label: `${attentionCount} need attention`,
    detail,
    tone: workingCount === 0 ? "danger" as const : "warning" as const,
    ariaLabel: `${workingCount} CCTV cameras working out of ${settings.cameraCount}, ${detail}`,
  };
}

function getCctvIssueCounts(settings: CctvSettings) {
  return [
    { label: "Faulty", count: settings.cameraFaultyCount },
    { label: "Waiting for repair", count: settings.cameraWaitingRepairCount },
    { label: "Being repaired", count: settings.cameraRepairingCount },
    { label: "New installation", count: settings.cameraInstallingCount },
  ];
}

function SavedServiceMedia({ service, pending, onRemove }: {
  service: NetworkService;
  pending?: boolean;
  onRemove?: (serviceId: number, attachmentId: number) => void;
}) {
  if (service.media.length === 0) return null;
  return (
    <div className="system-service-media-list" aria-label={`Existing evidence for ${service.label}`}>
      {service.media.map((media) => {
        const video = /\.(mp4|webm)(?:$|\?)/i.test(media.url);
        return (
          <article className="system-service-media-item" key={media.id}>
            {video ? (
              <video src={media.url} controls playsInline preload="metadata" aria-label={`Video evidence for ${service.label}`} />
            ) : (
              <a href={media.url} target="_blank" rel="noreferrer" aria-label={`Open image evidence for ${service.label}`}>
                <Image src={media.url} alt={`Evidence for ${service.label}`} width={220} height={140} unoptimized />
              </a>
            )}
            {onRemove && (
              <button type="button" className="system-service-media-remove" onClick={() => onRemove(service.id, media.id)} disabled={pending}>
                Remove attachment
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function SystemStatusPanel({ networkServices, cctv }: { networkServices: NetworkService[]; cctv: CctvSettings }) {
  const router = useRouter();
  const networkSummary = getNetworkSummary(networkServices);
  const cctvSummary = getCctvSummary(cctv);
  const cctvIssueCounts = getCctvIssueCounts(cctv);
  const cctvAttentionCount = cctvIssueCounts.reduce((sum, item) => sum + item.count, 0);
  const cctvWorkingCount = Math.max(0, cctv.cameraCount - cctvAttentionCount);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [cctvOpen, setCctvOpen] = useState(false);
  const [networkDetailsOpen, setNetworkDetailsOpen] = useState(false);
  const [cctvDetailsOpen, setCctvDetailsOpen] = useState(false);
  const [networkPending, setNetworkPending] = useState(false);
  const [cctvPending, setCctvPending] = useState(false);
  const [serviceDrafts, setServiceDrafts] = useState<ServiceDraft[]>(() => createServiceDrafts(networkServices));
  const [pendingMedia, setPendingMedia] = useState<Record<number, File[]>>({});
  const [cctvDraft, setCctvDraft] = useState<CctvDraft>(() => createCctvDraft(cctv));

  function activateNetworkCard() {
    const abnormalServices = networkServices.filter((service) => service.status === "ABNORMAL");
    if (abnormalServices.length > 0) {
      setNetworkDetailsOpen(true);
      return;
    }
    const allNormal = networkServices.length > 0 && networkServices.every((service) => service.status === "NORMAL");
    toast[allNormal ? "success" : "info"](allNormal
      ? "Network & Server is working normally."
      : "Network & Server status has not been fully reported.");
  }

  function activateCctvCard() {
    if (cctvAttentionCount > 0) {
      setCctvDetailsOpen(true);
      return;
    }
    toast[cctv.cameraCount > 0 ? "success" : "info"](cctv.cameraCount > 0
      ? "CCTV is working normally."
      : "No CCTV cameras have been reported.");
  }

  function editNetworkStatus() {
    setNetworkDetailsOpen(false);
    setServiceDrafts(createServiceDrafts(networkServices));
    setPendingMedia({});
    setNetworkOpen(true);
  }

  function editCctvStatus() {
    setCctvDetailsOpen(false);
    setCctvDraft(createCctvDraft(cctv));
    setCctvOpen(true);
  }

  function closeNetworkDialog(open: boolean) {
    setNetworkOpen(open);
    if (!open && !networkPending) {
      setServiceDrafts(createServiceDrafts(networkServices));
      setPendingMedia({});
    }
  }

  function closeCctvDialog(open: boolean) {
    setCctvOpen(open);
    if (!open && !cctvPending) setCctvDraft(createCctvDraft(cctv));
  }

  function updateService(id: number, update: Partial<ServiceDraft>) {
    setServiceDrafts((current) => current.map((service) => service.id === id ? { ...service, ...update } : service));
  }

  function updateCctv(event: ChangeEvent<HTMLInputElement>) {
    const key = event.currentTarget.name as keyof CctvSettings;
    const value = event.currentTarget.value;
    setCctvDraft((current) => ({ ...current, [key]: value }));
  }

  async function removeSavedMedia(serviceId: number, attachmentId: number) {
    const formData = new FormData();
    formData.set("entityType", "networkService");
    formData.set("entityId", String(serviceId));
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

  async function saveCctv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCctvPending(true);
    try {
      const formData = new FormData(event.currentTarget);
      const result = await saveCctvStatusAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      router.refresh();
      closeCctvDialog(false);
      toast.success(result.message);
    } catch {
      toast.error("Could not save CCTV status.");
    } finally {
      setCctvPending(false);
    }
  }

  return (
    <>
      <Card className="summary-card summary-systems-card">
        <div className="summary-card-content">
          <div className="summary-breakdown summary-breakdown-2" aria-label="Network and CCTV status">
            <ContextMenu as="div" role="button" className={`summary-breakdown-item summary-${networkSummary.tone} summary-systems-trigger`} ariaLabel={`${networkSummary.ariaLabel}. Right-click to edit.`} onActivate={activateNetworkCard} onEdit={editNetworkStatus}>
              <strong className="summary-breakdown-title">Network &amp; Server</strong>
              <strong>{networkSummary.value}</strong>
              <span>{networkSummary.label}</span>
              {networkSummary.detail && <small>{networkSummary.detail}</small>}
            </ContextMenu>
            <ContextMenu as="div" role="button" className={`summary-breakdown-item summary-${cctvSummary.tone} summary-systems-trigger`} ariaLabel={`${cctvSummary.ariaLabel}. Right-click to edit.`} onActivate={activateCctvCard} onEdit={editCctvStatus}>
              <strong className="summary-breakdown-title">CCTV</strong>
              <strong>{cctvSummary.value}</strong>
              <span>{cctvSummary.label}</span>
              {cctvSummary.detail && <small>{cctvSummary.detail}</small>}
            </ContextMenu>
          </div>
        </div>
      </Card>

      <Dialog open={networkDetailsOpen} onOpenChange={setNetworkDetailsOpen}>
        <DialogContent className="detail-dialog-content system-status-detail-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Network &amp; Server issues</DialogTitle>
              <DialogDescription>Services reported as abnormal and their supporting details.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close Network & Server details"><X size={17} /></DialogClose>
          </div>
          <div className="network-service-list">
            {networkServices.filter((service) => service.status === "ABNORMAL").map((service) => (
              <section className="network-service-card network-service-card-abnormal" key={service.id}>
                <div className="network-service-heading">
                  <h3>{service.label}</h3>
                  <strong className="system-status-abnormal-label">Abnormal</strong>
                </div>
                <div className="system-status-detail-copy">
                  <div><h4>Reason</h4><p>{service.reason || "No reason provided."}</p></div>
                  <div><h4>Details</h4><p>{service.detail || "No additional details provided."}</p></div>
                </div>
                {service.media.length > 0 && <SavedServiceMedia service={service} />}
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cctvDetailsOpen} onOpenChange={setCctvDetailsOpen}>
        <DialogContent className="detail-dialog-content system-status-detail-dialog cctv-detail-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>CCTV details</DialogTitle>
              <DialogDescription>Camera totals by current status.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close CCTV details"><X size={17} /></DialogClose>
          </div>
          <div className="system-status-detail-grid">
            <div className="system-status-detail-metric system-status-detail-metric-primary">
              <span>Working</span>
              <strong>{cctvWorkingCount}</strong>
            </div>
            <div className="system-status-detail-metric">
              <span>Total cameras</span>
              <strong>{cctv.cameraCount}</strong>
            </div>
            {cctvIssueCounts.map((item) => (
              <div className="system-status-detail-metric" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
                    <SavedServiceMedia service={savedService} pending={networkPending} onRemove={(serviceId, attachmentId) => { void removeSavedMedia(serviceId, attachmentId); }} />
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

      <Dialog open={cctvOpen} onOpenChange={closeCctvDialog}>
        <DialogContent className="detail-dialog-content system-status-dialog cctv-status-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>CCTV</DialogTitle>
              <DialogDescription>Enter the total number of cameras and their current service counts.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close CCTV status"><X size={17} /></DialogClose>
          </div>
          <form onSubmit={(event) => { void saveCctv(event); }} className="system-status-form">
            <section className="project-edit-card cctv-count-card">
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
              </div>
              <p className="cctv-count-help">The four status counts together cannot exceed the total camera count.</p>
            </section>
            <div className="project-edit-actions">
              <Button type="button" variant="secondary" onClick={() => closeCctvDialog(false)} disabled={cctvPending}>Cancel</Button>
              <Button type="submit" disabled={cctvPending}>{cctvPending ? "Saving…" : "Save status"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
