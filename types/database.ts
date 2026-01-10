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
          container_number: string;
          container_size: string | null;
          container_type: string;
          weight_lbs: number | null;
          is_hazmat: boolean;
          is_overweight: boolean;
          is_reefer: boolean;
          // Locations
          pickup_terminal: string;
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
          container_number: string;
          container_size?: string | null;
          container_type: string;
          weight_lbs?: number | null;
          is_hazmat?: boolean;
          is_overweight?: boolean;
          is_reefer?: boolean;
          pickup_terminal: string;
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
          container_number?: string;
          container_size?: string | null;
          container_type?: string;
          weight_lbs?: number | null;
          is_hazmat?: boolean;
          is_overweight?: boolean;
          is_reefer?: boolean;
          pickup_terminal?: string;
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
      shipments: {
        Row: {
          id: string;
          quote_id: string | null;
          created_at: string;
          updated_at: string;
          container_number: string;
          status: string;
          pickup_time: string | null;
          delivery_time: string | null;
          current_location: string | null;
          driver_name: string | null;
          truck_number: string | null;
          public_notes: string | null;
          internal_notes: string | null;
        };
        Insert: {
          id?: string;
          quote_id?: string | null;
          created_at?: string;
          updated_at?: string;
          container_number: string;
          status?: string;
          pickup_time?: string | null;
          delivery_time?: string | null;
          current_location?: string | null;
          driver_name?: string | null;
          truck_number?: string | null;
          public_notes?: string | null;
          internal_notes?: string | null;
        };
        Update: {
          id?: string;
          quote_id?: string | null;
          created_at?: string;
          updated_at?: string;
          container_number?: string;
          status?: string;
          pickup_time?: string | null;
          delivery_time?: string | null;
          current_location?: string | null;
          driver_name?: string | null;
          truck_number?: string | null;
          public_notes?: string | null;
          internal_notes?: string | null;
        };
      };
      shipment_events: {
        Row: {
          id: string;
          shipment_id: string;
          created_at: string;
          status: string;
          location: string | null;
          notes: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          shipment_id: string;
          created_at?: string;
          status: string;
          location?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          shipment_id?: string;
          created_at?: string;
          status?: string;
          location?: string | null;
          notes?: string | null;
          created_by?: string | null;
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

export type Shipment = Database["public"]["Tables"]["shipments"]["Row"];
export type ShipmentInsert = Database["public"]["Tables"]["shipments"]["Insert"];
export type ShipmentUpdate = Database["public"]["Tables"]["shipments"]["Update"];

export type ShipmentEvent = Database["public"]["Tables"]["shipment_events"]["Row"];
export type ShipmentEventInsert = Database["public"]["Tables"]["shipment_events"]["Insert"];
