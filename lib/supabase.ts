import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type DeviceType = 'desktop' | 'mobile' | 'tablet';
export type Browser = 'Chrome' | 'Edge' | 'Firefox' | 'Opera' | 'Safari' | 'Other';
export type OperatingSystem = 'Android' | 'ChromeOS' | 'iOS' | 'Linux' | 'macOS' | 'Other' | 'Windows';

type Database = {
  public: {
    Tables: {
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
