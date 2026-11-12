import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as store from "./store";
import type { Report } from "@/types";

export const useDepartments = () => useQuery({ queryKey: ["departments"], queryFn: async () => store.listDepartments() });
export const useUsers = () => useQuery({ queryKey: ["users"], queryFn: async () => store.listUsers() });
export const useReport = (departmentId: number, date: string) =>
  useQuery({ queryKey: ["report", departmentId, date], queryFn: async () => store.getReport(departmentId, date) });

/** Apply a pure update to the current report and persist it (replaces all the original Server Actions). */
export function useReportUpdate(departmentId: number, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fn: (r: Report) => Report) => { const next = fn(store.getReport(departmentId, date)); store.saveReport(next); return next; },
    onSuccess: (next) => qc.setQueryData(["report", departmentId, date], next),
  });
}
export function useAdminMutation<T>(fn: (v: T) => void, key: "departments" | "users") {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (v: T) => fn(v), onSuccess: () => qc.invalidateQueries({ queryKey: [key] }) });
}
export { nextId } from "./store";
