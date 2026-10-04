export const systemNetworkServiceKeys = [
  "file-share",
  "payroll",
  "backup-system",
  "log-tracking",
  "solar-dashboard",
] as const;

export type SystemNetworkServiceKey = (typeof systemNetworkServiceKeys)[number];
