import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type DeviceType = 'desktop' | 'mobile' | 'tablet';
export type Browser = 'Chrome' | 'Edge' | 'Firefox' | 'Opera' | 'Safari' | 'Other';
export type OperatingSystem = 'Android' | 'ChromeOS' | 'iOS' | 'Linux' | 'macOS' | 'Other' | 'Windows';
export type AppDataEventType = 'api_activity' | 'scan_result' | 'file_scan' | 'external_feed';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Database = {
  public: {
    Tables: {
      app_data_events: {
        Row: {
          id: number;
          created_at: string;
          event_type: AppDataEventType;
          method: string;
          path: string;
          status_code: number;
          request_data: Json;
          result_data: Json;
          category: string;
          severity: 'info' | 'medium' | 'high';
          kind: 'observed' | 'detection';
        };
        Insert: {
          id?: never;
          created_at?: string;
          event_type: AppDataEventType;
          method: string;
          path: string;
          status_code: number;
          request_data: Json;
          result_data: Json;
          category: string;
          severity: 'info' | 'medium' | 'high';
          kind: 'observed' | 'detection';
        };
        Update: {
          id?: never;
          created_at?: string;
          event_type?: AppDataEventType;
          method?: string;
          path?: string;
          status_code?: number;
          request_data?: Json;
          result_data?: Json;
          category?: string;
          severity?: 'info' | 'medium' | 'high';
          kind?: 'observed' | 'detection';
        };
        Relationships: [];
      };
      device_intelligence_visits: {
        Row: {
          id: number;
          visited_at: string;
          device_type: DeviceType;
          browser: Browser;
          operating_system: OperatingSystem;
        };
        Insert: {
          id?: never;
          visited_at?: string;
          device_type: DeviceType;
          browser: Browser;
          operating_system: OperatingSystem;
        };
        Update: {
          id?: never;
          visited_at?: string;
          device_type?: DeviceType;
          browser?: Browser;
          operating_system?: OperatingSystem;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      list_device_intelligence_visits: {
        Args: Record<string, never>;
        Returns: Array<{
          visited_at: string;
          device_type: DeviceType;
          browser: Browser;
          operating_system: OperatingSystem;
        }>;
      };
      record_device_intelligence_visit: {
        Args: {
          p_device_type: DeviceType;
          p_browser: Browser;
          p_operating_system: OperatingSystem;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type AppDataEventInsert = Database['public']['Tables']['app_data_events']['Insert'];

let supabaseClient: SupabaseClient<Database> | undefined;

export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasSupabaseConfig = Boolean(url || serviceRoleKey);

  if (!hasSupabaseConfig) return null;
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase requires SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).');
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}
