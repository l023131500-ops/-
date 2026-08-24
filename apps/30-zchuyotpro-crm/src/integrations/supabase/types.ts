export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      call_transcripts: {
        Row: {
          audio_url: string | null
          call_at: string
          client_id: string
          created_at: string
          direction: string | null
          duration_seconds: number | null
          from_number: string | null
          id: string
          recorded_by: string | null
          summary: string | null
          tenant_id: string
          to_number: string | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          call_at?: string
          client_id: string
          created_at?: string
          direction?: string | null
          duration_seconds?: number | null
          from_number?: string | null
          id?: string
          recorded_by?: string | null
          summary?: string | null
          tenant_id: string
          to_number?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          call_at?: string
          client_id?: string
          created_at?: string
          direction?: string | null
          duration_seconds?: number | null
          from_number?: string | null
          id?: string
          recorded_by?: string | null
          summary?: string | null
          tenant_id?: string
          to_number?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_transcripts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_transcripts_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_transcripts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_entitlements: {
        Row: {
          client_id: string
          created_at: string
          entitlement_id: string
          handled_at: string | null
          handled_by: string | null
          id: string
          notes: string | null
          status: string
          tenant_id: string
          updated_at: string
          year: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          entitlement_id: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          entitlement_id?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_entitlements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_entitlements_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_entitlements_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_entitlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_budget_limits: {
        Row: {
          category: string
          client_id: string
          created_at: string
          id: string
          monthly_limit: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category: string
          client_id: string
          created_at?: string
          id?: string
          monthly_limit: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          id?: string
          monthly_limit?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_budget_limits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_budget_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_family_members: {
        Row: {
          birth_date: string | null
          client_id: string
          created_at: string
          first_name: string
          gender: string | null
          health_fund: string | null
          health_status: string | null
          id: string
          id_number: string | null
          last_name: string | null
          notes: string | null
          relation: string
          tenant_id: string
        }
        Insert: {
          birth_date?: string | null
          client_id: string
          created_at?: string
          first_name: string
          gender?: string | null
          health_fund?: string | null
          health_status?: string | null
          id?: string
          id_number?: string | null
          last_name?: string | null
          notes?: string | null
          relation: string
          tenant_id: string
        }
        Update: {
          birth_date?: string | null
          client_id?: string
          created_at?: string
          first_name?: string
          gender?: string | null
          health_fund?: string | null
          health_status?: string | null
          id?: string
          id_number?: string | null
          last_name?: string | null
          notes?: string | null
          relation?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_family_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_family_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_financial_profile: {
        Row: {
          client_id: string
          employer_name: string | null
          employment_status: string | null
          gross_monthly_income: number | null
          has_life_insurance: boolean | null
          has_pension: boolean | null
          id: string
          income_sources: Json
          insurance_details: Json
          net_monthly_income: number | null
          occupation: string | null
          other_income: number | null
          pension_details: Json
          spouse_income: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          employer_name?: string | null
          employment_status?: string | null
          gross_monthly_income?: number | null
          has_life_insurance?: boolean | null
          has_pension?: boolean | null
          id?: string
          income_sources?: Json
          insurance_details?: Json
          net_monthly_income?: number | null
          occupation?: string | null
          other_income?: number | null
          pension_details?: Json
          spouse_income?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          employer_name?: string | null
          employment_status?: string | null
          gross_monthly_income?: number | null
          has_life_insurance?: boolean | null
          has_pension?: boolean | null
          id?: string
          income_sources?: Json
          insurance_details?: Json
          net_monthly_income?: number | null
          occupation?: string | null
          other_income?: number | null
          pension_details?: Json
          spouse_income?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_financial_profile_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_financial_profile_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_housing_profile: {
        Row: {
          additional_properties: Json
          arnona_account_number: string | null
          client_id: string
          electricity_meter_number: string | null
          has_additional_property: boolean | null
          has_mortgage: boolean | null
          housing_type: string | null
          id: string
          monthly_rent: number | null
          mortgage_details: Json
          property_address: string | null
          tenant_id: string
          updated_at: string
          water_account_number: string | null
        }
        Insert: {
          additional_properties?: Json
          arnona_account_number?: string | null
          client_id: string
          electricity_meter_number?: string | null
          has_additional_property?: boolean | null
          has_mortgage?: boolean | null
          housing_type?: string | null
          id?: string
          monthly_rent?: number | null
          mortgage_details?: Json
          property_address?: string | null
          tenant_id: string
          updated_at?: string
          water_account_number?: string | null
        }
        Update: {
          additional_properties?: Json
          arnona_account_number?: string | null
          client_id?: string
          electricity_meter_number?: string | null
          has_additional_property?: boolean | null
          has_mortgage?: boolean | null
          housing_type?: string | null
          id?: string
          monthly_rent?: number | null
          mortgage_details?: Json
          property_address?: string | null
          tenant_id?: string
          updated_at?: string
          water_account_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_housing_profile_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_housing_profile_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_consents: {
        Row: {
          category: string
          client_id: string
          created_at: string
          decided_at: string
          decided_via: string
          id: string
          is_granted: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category: string
          client_id: string
          created_at?: string
          decided_at?: string
          decided_via?: string
          id?: string
          is_granted?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          decided_at?: string
          decided_via?: string
          id?: string
          is_granted?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_consents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_personal_areas: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          label: string
          notes: string | null
          password: string | null
          tenant_id: string
          topic: string
          updated_at: string
          url: string | null
          username: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          notes?: string | null
          password?: string | null
          tenant_id: string
          topic?: string
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          notes?: string | null
          password?: string | null
          tenant_id?: string
          topic?: string
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_personal_areas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_personal_areas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_personal_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_transactions: {
        Row: {
          amount: number
          category: string
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          occurred_on: string
          source: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind: string
          occurred_on?: string
          source?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          occurred_on?: string
          source?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_vehicles: {
        Row: {
          client_id: string
          created_at: string
          disability_badge: boolean
          has_insurance: boolean | null
          id: string
          insurance_expiry: string | null
          license_plate: string | null
          make: string | null
          model: string | null
          tenant_id: string
          vehicle_type: string | null
          year: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          disability_badge?: boolean
          has_insurance?: boolean | null
          id?: string
          insurance_expiry?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          tenant_id: string
          vehicle_type?: string | null
          year?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          disability_badge?: boolean
          has_insurance?: boolean | null
          id?: string
          insurance_expiry?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          tenant_id?: string
          vehicle_type?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_vehicles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          assigned_agent_id: string | null
          auth_user_id: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          email: string | null
          file_number: string | null
          first_name: string
          gender: string | null
          id: string
          id_number: string | null
          imot_id: string | null
          last_name: string
          marital_status: string | null
          nedarim_id: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          share_enabled: boolean
          share_token: string
          status: string
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_agent_id?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          file_number?: string | null
          first_name: string
          gender?: string | null
          id?: string
          id_number?: string | null
          imot_id?: string | null
          last_name: string
          marital_status?: string | null
          nedarim_id?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          share_enabled?: boolean
          share_token?: string
          status?: string
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_agent_id?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          file_number?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          id_number?: string | null
          imot_id?: string | null
          last_name?: string
          marital_status?: string | null
          nedarim_id?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          share_enabled?: boolean
          share_token?: string
          status?: string
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          category: string
          client_editable: boolean
          created_at: string
          field_key: string
          field_type: string
          id: string
          label: string
          options: Json
          sort_order: number
          tenant_id: string
          updated_at: string
          visible_to_client: boolean
        }
        Insert: {
          category?: string
          client_editable?: boolean
          created_at?: string
          field_key: string
          field_type?: string
          id?: string
          label: string
          options?: Json
          sort_order?: number
          tenant_id: string
          updated_at?: string
          visible_to_client?: boolean
        }
        Update: {
          category?: string
          client_editable?: boolean
          created_at?: string
          field_key?: string
          field_type?: string
          id?: string
          label?: string
          options?: Json
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          client_id: string
          created_at: string
          definition_id: string
          id: string
          tenant_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          client_id: string
          created_at?: string
          definition_id: string
          id?: string
          tenant_id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          client_id?: string
          created_at?: string
          definition_id?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_field_values_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "custom_field_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_field_values_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          analysis_result: Json | null
          client_id: string | null
          created_at: string
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          id: string
          partner_id: string | null
          processing_status: string
          property_label: string | null
          requires_signature: boolean
          signature_status: string | null
          signed_at: string | null
          storage_path: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          analysis_result?: Json | null
          client_id?: string | null
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          partner_id?: string | null
          processing_status?: string
          property_label?: string | null
          requires_signature?: boolean
          signature_status?: string | null
          signed_at?: string | null
          storage_path: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          analysis_result?: Json | null
          client_id?: string | null
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          partner_id?: string | null
          processing_status?: string
          property_label?: string | null
          requires_signature?: boolean
          signature_status?: string | null
          signed_at?: string | null
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          eligible_criteria: Json
          id: string
          is_active: boolean
          source: string | null
          tenant_id: string
          title: string
          year: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          eligible_criteria?: Json
          id?: string
          is_active?: boolean
          source?: string | null
          tenant_id: string
          title: string
          year?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          eligible_criteria?: Json
          id?: string
          is_active?: boolean
          source?: string | null
          tenant_id?: string
          title?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_inquiries: {
        Row: {
          body: string | null
          channel: string
          client_id: string | null
          created_at: string
          email: string | null
          full_name: string
          handled_at: string | null
          handled_by: string | null
          id: string
          phone: string | null
          referral_id: string | null
          rejection_reason: string | null
          source_meta: Json
          status: string
          subject: string | null
          suggested_category: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          channel?: string
          client_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          phone?: string | null
          referral_id?: string | null
          rejection_reason?: string | null
          source_meta?: Json
          status?: string
          subject?: string | null
          suggested_category?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          channel?: string
          client_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          phone?: string | null
          referral_id?: string | null
          rejection_reason?: string | null
          source_meta?: Json
          status?: string
          subject?: string | null
          suggested_category?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_inquiries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_inquiries_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "partner_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_inquiries_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_inquiries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          subject: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          subject?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          channel: string
          client_id: string | null
          content: string | null
          created_at: string
          direction: string
          external_message_id: string | null
          id: string
          partner_id: string | null
          sent_by: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          attachments?: Json
          channel: string
          client_id?: string | null
          content?: string | null
          created_at?: string
          direction: string
          external_message_id?: string | null
          id?: string
          partner_id?: string | null
          sent_by?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          attachments?: Json
          channel?: string
          client_id?: string | null
          content?: string | null
          created_at?: string
          direction?: string
          external_message_id?: string | null
          id?: string
          partner_id?: string | null
          sent_by?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_referrals: {
        Row: {
          client_id: string
          completed_at: string | null
          consent_status: string
          id: string
          notes: string | null
          partner_id: string
          partner_notes: string | null
          referred_by: string | null
          rejection_reason: string | null
          sent_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          consent_status?: string
          id?: string
          notes?: string | null
          partner_id: string
          partner_notes?: string | null
          referred_by?: string | null
          rejection_reason?: string | null
          sent_at?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          consent_status?: string
          id?: string
          notes?: string | null
          partner_id?: string
          partner_notes?: string | null
          referred_by?: string | null
          rejection_reason?: string | null
          sent_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_referrals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referrals_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referrals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          allowed_client_fields: Json
          auth_user_id: string | null
          category: string
          company_name: string
          contact_name: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          phone: string | null
          tenant_id: string
        }
        Insert: {
          allowed_client_fields?: Json
          auth_user_id?: string | null
          category: string
          company_name: string
          contact_name?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          phone?: string | null
          tenant_id: string
        }
        Update: {
          allowed_client_fields?: Json
          auth_user_id?: string | null
          category?: string
          company_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          created_at: string
          full_name: string
          id: string
          permissions: Json
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          plan: string
          settings: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          plan?: string
          settings?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          plan?: string
          settings?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_client_id: { Args: never; Returns: string }
      current_partner_id: { Args: never; Returns: string }
      get_my_consent_state: {
        Args: never
        Returns: {
          category: string
          partner_count: number
          fields: Json
          is_granted: boolean | null
          decided_at: string | null
        }[]
      }
      get_my_referral_requests: {
        Args: never
        Returns: {
          id: string
          status: string
          consent_status: string
          notes: string | null
          sent_at: string
          partner_name: string
          partner_category: string
          allowed_fields: Json
        }[]
      }
      get_my_role: { Args: never; Returns: string }
      get_my_tenant_id: { Args: never; Returns: string }
      get_my_tenant_modules: { Args: never; Returns: Json }
      is_partner_for_client: { Args: { _client_id: string }; Returns: boolean }
      is_self_client: { Args: { _client_id: string }; Returns: boolean }
      is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean }
      respond_referral_consent: {
        Args: { _referral_id: string; _approve: boolean }
        Returns: Json
      }
      set_my_consent: {
        Args: { _category: string; _grant: boolean }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "agent" | "viewer"
      task_priority: "low" | "medium" | "high"
      task_status: "open" | "done"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "agent", "viewer"],
      task_priority: ["low", "medium", "high"],
      task_status: ["open", "done"],
    },
  },
} as const
