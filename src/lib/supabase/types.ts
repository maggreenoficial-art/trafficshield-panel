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
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: "customer" | "admin";
          pearls: number;
          is_club_member: boolean;
          club_joined_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: "customer" | "admin";
          pearls?: number;
          is_club_member?: boolean;
          club_joined_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          status: string;
          payment_method: string;
          customer: Json;
          shipping: Json;
          items: Json;
          subtotal: number;
          shipping_cost: number;
          discount: number;
          redeemed_pearls: number;
          total: number;
          pearls_earned: number;
          payment_reference: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id?: string | null;
          status?: string;
          payment_method: string;
          customer: Json;
          shipping: Json;
          items: Json;
          subtotal: number;
          shipping_cost?: number;
          discount?: number;
          redeemed_pearls?: number;
          total: number;
          pearls_earned?: number;
          payment_reference?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      analytics_events: {
        Row: {
          id: string;
          type: string;
          session_id: string | null;
          path: string | null;
          product_id: string | null;
          product_name: string | null;
          variant_id: string | null;
          value: number | null;
          order_id: string | null;
          source: string;
          event_id: string | null;
          created_at: string;
        };
        Insert: {
          type: string;
          session_id?: string | null;
          path?: string | null;
          product_id?: string | null;
          product_name?: string | null;
          variant_id?: string | null;
          value?: number | null;
          order_id?: string | null;
          source?: string;
          event_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["analytics_events"]["Insert"]>;
      };
      meta_campaigns: {
        Row: {
          id: string;
          name: string;
          status: string;
          spend: number;
          impressions: number;
          clicks: number;
          conversions: number;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          status?: string;
          spend?: number;
          impressions?: number;
          clicks?: number;
          conversions?: number;
        };
        Update: Partial<Database["public"]["Tables"]["meta_campaigns"]["Insert"]>;
      };
      app_config: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
        };
        Update: Partial<Database["public"]["Tables"]["app_config"]["Insert"]>;
      };
    };
  };
}
