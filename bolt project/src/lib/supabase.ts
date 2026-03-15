import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string;
          address: string;
          city: string;
          state: string;
          zip_code: string;
          country: string;
          linkedin_url: string;
          portfolio_url: string;
          github_url: string;
          summary: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      work_experiences: {
        Row: {
          id: string;
          user_id: string;
          company: string;
          position: string;
          location: string;
          start_date: string;
          end_date: string | null;
          is_current: boolean;
          description: string;
          created_at: string;
        };
      };
      education: {
        Row: {
          id: string;
          user_id: string;
          institution: string;
          degree: string;
          field_of_study: string;
          location: string;
          start_date: string;
          end_date: string | null;
          is_current: boolean;
          gpa: string;
          created_at: string;
        };
      };
      skills: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string;
          proficiency: string;
          created_at: string;
        };
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          company: string;
          position: string;
          job_url: string;
          status: string;
          applied_date: string;
          notes: string;
          created_at: string;
        };
      };
    };
  };
};
