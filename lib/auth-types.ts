/**
 * Auth types and constants that can be safely imported from client components
 */

export const EMPLOYEE_MODULES = [
  "dashboard",
  "quotes",
  "loads",
  "customers",
  "analytics",
  "sync",
] as const;

export const ALL_ADMIN_MODULES = [
  ...EMPLOYEE_MODULES,
  "users",
  "organizations",
  "settings",
  "employees",
] as const;

export type EmployeeModule = (typeof EMPLOYEE_MODULES)[number];
export type AdminModule = (typeof ALL_ADMIN_MODULES)[number];

export interface Employee {
  id: string;
  user_id: string;
  permissions: EmployeeModule[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
