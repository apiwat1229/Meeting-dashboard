export type Department = { id: number; code: string; name: string; description: string; isActive: boolean };

export type ManagedUser = {
  id: number;
  username: string;
  displayName: string;
  role: "ADMIN" | "USER";
  departmentId: number;
  isActive: boolean;
  departmentName: string;
  departmentIsActive: boolean;
};
