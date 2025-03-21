export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string
          company_name: string
          email: string
          employee_count: number | null
          annual_revenue: number | null
          is_sme: boolean
          about: string | null
          industry: string | null
          ai_readiness: string | null
          lead_score: number
          status: string
          lead_source: string | null
          created_at: string
          updated_at: string
          last_contacted: string | null
          notes: string | null
          company_size: string | null
          founded: string | null
          website: string | null
          source_url: string | null
          ai_readiness_score: string | null
          ai_readiness_category: string | null
          company_type: string | null
        }
        Insert: {
          id?: string
          company_name: string
          email: string
          employee_count?: number | null
          annual_revenue?: number | null
          is_sme?: boolean
          about?: string | null
          industry?: string | null
          ai_readiness?: string | null
          lead_score?: number
          status?: string
          lead_source?: string | null
          created_at?: string
          updated_at?: string
          last_contacted?: string | null
          notes?: string | null
          company_size?: string | null
          founded?: string | null
          website?: string | null
          source_url?: string | null
          ai_readiness_score?: string | null
          ai_readiness_category?: string | null
          company_type?: string | null
        }
        Update: {
          id?: string
          company_name?: string
          email?: string
          employee_count?: number | null
          annual_revenue?: number | null
          is_sme?: boolean
          about?: string | null
          industry?: string | null
          ai_readiness?: string | null
          lead_score?: number
          status?: string
          lead_source?: string | null
          created_at?: string
          updated_at?: string
          last_contacted?: string | null
          notes?: string | null
          company_size?: string | null
          founded?: string | null
          website?: string | null
          source_url?: string | null
          ai_readiness_score?: string | null
          ai_readiness_category?: string | null
          company_type?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          title: string
          message: string
          type: string
          read: boolean
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          type: string
          read?: boolean
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          type?: string
          read?: boolean
          created_at?: string
          user_id?: string
        }
      }
    }
  }
}
