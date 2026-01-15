// Intercom types

export interface IntercomSettings {
  app_id: string;
  user_id?: string;
  email?: string;
  name?: string;
  created_at?: number;
  user_hash?: string;
  company?: {
    company_id: string;
    name: string;
    created_at?: number;
  };
  hide_default_launcher?: boolean;
  alignment?: "left" | "right";
  horizontal_padding?: number;
  vertical_padding?: number;
  custom_launcher_selector?: string;
}

export interface IntercomEventMetadata {
  [key: string]: string | number | boolean | undefined;
}

export interface UserContext {
  userId?: string;
  email?: string;
  fullName?: string;
  createdAt?: string;
  organizationId?: string;
  organizationName?: string;
}
