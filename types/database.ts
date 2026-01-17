export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      quotes: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          status: string;
          reference_number: string;
          // Contact info
          company_name: string | null;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          // Container details
          container_number: string | null;
          container_size: string | null;
          container_type: string | null;
          weight_lbs: number | null;
          is_hazmat: boolean;
          is_overweight: boolean;
          is_reefer: boolean;
          // Locations
          pickup_terminal: string | null;
          delivery_address: string | null;
          delivery_city: string | null;
          delivery_state: string | null;
          delivery_zip: string;
          // Service details
          service_type: string | null;
          earliest_pickup: string | null;
          latest_delivery: string | null;
          lfd: string | null;
          special_instructions: string | null;
          // Quote response
          quoted_price: number | null;
          quoted_at: string | null;
          quoted_by: string | null;
          quote_notes: string | null;
          quote_valid_until: string | null;
          // Lead qualification (new fields)
          port: string | null;
          request_type: string | null;
          time_sensitive: boolean;
          lead_score: number;
          is_urgent: boolean;
          delivery_type: string | null;
          appointment_required: boolean;
          availability_date: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          status?: string;
          reference_number?: string;
          company_name?: string | null;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          container_number?: string | null;
          container_size?: string | null;
          container_type?: string | null;
          weight_lbs?: number | null;
          is_hazmat?: boolean;
          is_overweight?: boolean;
          is_reefer?: boolean;
          pickup_terminal?: string | null;
          delivery_address?: string | null;
          delivery_city?: string | null;
          delivery_state?: string | null;
          delivery_zip: string;
          service_type?: string | null;
          earliest_pickup?: string | null;
          latest_delivery?: string | null;
          lfd?: string | null;
          special_instructions?: string | null;
          quoted_price?: number | null;
          quoted_at?: string | null;
          quoted_by?: string | null;
          quote_notes?: string | null;
          quote_valid_until?: string | null;
          // Lead qualification (new fields)
          port?: string | null;
          request_type?: string | null;
          time_sensitive?: boolean;
          lead_score?: number;
          is_urgent?: boolean;
          delivery_type?: string | null;
          appointment_required?: boolean;
          availability_date?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          status?: string;
          reference_number?: string;
          company_name?: string | null;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          container_number?: string | null;
          container_size?: string | null;
          container_type?: string | null;
          weight_lbs?: number | null;
          is_hazmat?: boolean;
          is_overweight?: boolean;
          is_reefer?: boolean;
          pickup_terminal?: string | null;
          delivery_address?: string | null;
          delivery_city?: string | null;
          delivery_state?: string | null;
          delivery_zip?: string;
          service_type?: string | null;
          earliest_pickup?: string | null;
          latest_delivery?: string | null;
          lfd?: string | null;
          special_instructions?: string | null;
          quoted_price?: number | null;
          quoted_at?: string | null;
          quoted_by?: string | null;
          quote_notes?: string | null;
          quote_valid_until?: string | null;
          // Lead qualification (new fields)
          port?: string | null;
          request_type?: string | null;
          time_sensitive?: boolean;
          lead_score?: number;
          is_urgent?: boolean;
          delivery_type?: string | null;
          appointment_required?: boolean;
          availability_date?: string | null;
        };
      };
      contacts: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          email: string;
          phone: string | null;
          company: string | null;
          subject: string | null;
          message: string;
          status: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          email: string;
          phone?: string | null;
          company?: string | null;
          subject?: string | null;
          message: string;
          status?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          company?: string | null;
          subject?: string | null;
          message?: string;
          status?: string;
        };
      };
      loads: {
        Row: {
          id: string;
          quote_id: string | null;
          tracking_number: string | null;
          created_at: string;
          updated_at: string;
          container_number: string;
          container_size: string | null;
          status: string;
          origin: string | null;
          destination: string | null;
          eta: string | null;
          pickup_time: string | null;
          delivery_time: string | null;
          current_location: string | null;
          driver_name: string | null;
          truck_number: string | null;
          public_notes: string | null;
          internal_notes: string | null;
          customer_name: string | null;
          customer_email: string | null;
          // PortPro integration fields
          portpro_reference: string | null;
          portpro_load_id: string | null;
          seal_number: string | null;
          chassis_number: string | null;
          weight: number | null;
          // Billing fields
          billing_total: number | null;
          load_margin: number | null;
        };
        Insert: {
          id?: string;
          quote_id?: string | null;
          tracking_number?: string | null;
          created_at?: string;
          updated_at?: string;
          container_number: string;
          container_size?: string | null;
          status?: string;
          origin?: string | null;
          destination?: string | null;
          eta?: string | null;
          pickup_time?: string | null;
          delivery_time?: string | null;
          current_location?: string | null;
          driver_name?: string | null;
          truck_number?: string | null;
          public_notes?: string | null;
          internal_notes?: string | null;
          customer_name?: string | null;
          customer_email?: string | null;
          portpro_reference?: string | null;
          portpro_load_id?: string | null;
          seal_number?: string | null;
          chassis_number?: string | null;
          weight?: number | null;
          billing_total?: number | null;
          load_margin?: number | null;
        };
        Update: {
          id?: string;
          quote_id?: string | null;
          tracking_number?: string | null;
          created_at?: string;
          updated_at?: string;
          container_number?: string;
          container_size?: string | null;
          status?: string;
          origin?: string | null;
          destination?: string | null;
          eta?: string | null;
          pickup_time?: string | null;
          delivery_time?: string | null;
          current_location?: string | null;
          driver_name?: string | null;
          truck_number?: string | null;
          public_notes?: string | null;
          internal_notes?: string | null;
          customer_name?: string | null;
          customer_email?: string | null;
          portpro_reference?: string | null;
          portpro_load_id?: string | null;
          seal_number?: string | null;
          chassis_number?: string | null;
          weight?: number | null;
          billing_total?: number | null;
          load_margin?: number | null;
        };
      };
      load_events: {
        Row: {
          id: string;
          load_id: string;
          created_at: string;
          status: string;
          description: string | null;
          location: string | null;
          notes: string | null;
          created_by: string | null;
          portpro_event: boolean;
        };
        Insert: {
          id?: string;
          load_id: string;
          created_at?: string;
          status: string;
          description?: string | null;
          location?: string | null;
          notes?: string | null;
          created_by?: string | null;
          portpro_event?: boolean;
        };
        Update: {
          id?: string;
          load_id?: string;
          created_at?: string;
          status?: string;
          description?: string | null;
          location?: string | null;
          notes?: string | null;
          created_by?: string | null;
          portpro_event?: boolean;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "super_admin" | "user";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "super_admin" | "user";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "super_admin" | "user";
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          email_domain: string | null;
          primary_email: string | null;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          email_domain?: string | null;
          primary_email?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          email_domain?: string | null;
          primary_email?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          email: string;
          role: "admin" | "member";
          invitation_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          email: string;
          role?: "admin" | "member";
          invitation_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          email?: string;
          role?: "admin" | "member";
          invitation_id?: string | null;
          created_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: "admin" | "member";
          token: string;
          invited_by: string | null;
          inviter_name: string | null;
          status: "pending" | "accepted" | "expired" | "revoked";
          expires_at: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role?: "admin" | "member";
          token?: string;
          invited_by?: string | null;
          inviter_name?: string | null;
          status?: "pending" | "accepted" | "expired" | "revoked";
          expires_at?: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: "admin" | "member";
          token?: string;
          invited_by?: string | null;
          inviter_name?: string | null;
          status?: "pending" | "accepted" | "expired" | "revoked";
          expires_at?: string;
          created_at?: string;
          accepted_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience types
export type Quote = Database["public"]["Tables"]["quotes"]["Row"];
export type QuoteInsert = Database["public"]["Tables"]["quotes"]["Insert"];
export type QuoteUpdate = Database["public"]["Tables"]["quotes"]["Update"];

export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];

export type Load = Database["public"]["Tables"]["loads"]["Row"];
export type LoadInsert = Database["public"]["Tables"]["loads"]["Insert"];
export type LoadUpdate = Database["public"]["Tables"]["loads"]["Update"];

export type LoadEvent = Database["public"]["Tables"]["load_events"]["Row"];
export type LoadEventInsert = Database["public"]["Tables"]["load_events"]["Insert"];

// Backwards compatibility aliases (deprecated - use Load/LoadEvent instead)
export type Shipment = Load;
export type ShipmentInsert = LoadInsert;
export type ShipmentUpdate = LoadUpdate;
export type ShipmentEvent = LoadEvent;
export type ShipmentEventInsert = LoadEventInsert;

// Auth & Organization types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"];
export type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"];

export type OrganizationMember = Database["public"]["Tables"]["organization_members"]["Row"];
export type OrganizationMemberInsert = Database["public"]["Tables"]["organization_members"]["Insert"];

export type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
export type InvitationInsert = Database["public"]["Tables"]["invitations"]["Insert"];
export type InvitationUpdate = Database["public"]["Tables"]["invitations"]["Update"];

// Role types
export type PlatformRole = "super_admin" | "user";
export type OrgRole = "admin" | "member";
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";
