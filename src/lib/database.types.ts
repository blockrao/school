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
      admission_cycles: {
        Row: {
          academic_year: string
          application_steps: Json | null
          class_code: string
          class_label_ambiguous: boolean
          class_label_note: string | null
          closes_on: string | null
          corrections: Json | null
          dob_from: string | null
          dob_to: string | null
          documents_required: string[] | null
          eligibility_notes_en: string | null
          eligibility_notes_hi: string | null
          exam_id: string | null
          form_mode: Database["public"]["Enums"]["form_mode"]
          form_url: string | null
          id: string
          last_checked_at: string | null
          late_fee_amount: number | null
          notice_url: string | null
          opens_on: string | null
          pattern: Json | null
          registration_fee: number | null
          results_on: string | null
          school_id: string | null
          seats_total: number | null
          selection_notes: string | null
          source_type: Database["public"]["Enums"]["provenance_source_type"]
          status: Database["public"]["Enums"]["admission_status"]
          syllabus: Json | null
          updated_at: string
          verification: Database["public"]["Enums"]["verification_status"]
          verification_status: Database["public"]["Enums"]["verification_status_v2"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          academic_year: string
          application_steps?: Json | null
          class_code: string
          class_label_ambiguous?: boolean
          class_label_note?: string | null
          closes_on?: string | null
          corrections?: Json | null
          dob_from?: string | null
          dob_to?: string | null
          documents_required?: string[] | null
          eligibility_notes_en?: string | null
          eligibility_notes_hi?: string | null
          exam_id?: string | null
          form_mode?: Database["public"]["Enums"]["form_mode"]
          form_url?: string | null
          id?: string
          last_checked_at?: string | null
          late_fee_amount?: number | null
          notice_url?: string | null
          opens_on?: string | null
          pattern?: Json | null
          registration_fee?: number | null
          results_on?: string | null
          school_id?: string | null
          seats_total?: number | null
          selection_notes?: string | null
          source_type: Database["public"]["Enums"]["provenance_source_type"]
          status?: Database["public"]["Enums"]["admission_status"]
          syllabus?: Json | null
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verification_status: Database["public"]["Enums"]["verification_status_v2"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          academic_year?: string
          application_steps?: Json | null
          class_code?: string
          class_label_ambiguous?: boolean
          class_label_note?: string | null
          closes_on?: string | null
          corrections?: Json | null
          dob_from?: string | null
          dob_to?: string | null
          documents_required?: string[] | null
          eligibility_notes_en?: string | null
          eligibility_notes_hi?: string | null
          exam_id?: string | null
          form_mode?: Database["public"]["Enums"]["form_mode"]
          form_url?: string | null
          id?: string
          last_checked_at?: string | null
          late_fee_amount?: number | null
          notice_url?: string | null
          opens_on?: string | null
          pattern?: Json | null
          registration_fee?: number | null
          results_on?: string | null
          school_id?: string | null
          seats_total?: number | null
          selection_notes?: string | null
          source_type?: Database["public"]["Enums"]["provenance_source_type"]
          status?: Database["public"]["Enums"]["admission_status"]
          syllabus?: Json | null
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verification_status?: Database["public"]["Enums"]["verification_status_v2"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_cycles_class_code_fkey"
            columns: ["class_code"]
            isOneToOne: false
            referencedRelation: "class_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "admission_cycles_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_cycles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_leads: {
        Row: {
          academic_year: string
          admission_cycle_id: string
          class_code: string
          consent_at: string
          created_at: string
          full_name: string | null
          id: string
          note: string | null
          phone: string | null
          school_id: string
          status: Database["public"]["Enums"]["admission_lead_status"]
          status_updated_at: string | null
          status_updated_by: string | null
          user_id: string
        }
        Insert: {
          academic_year: string
          admission_cycle_id: string
          class_code: string
          consent_at?: string
          created_at?: string
          full_name?: string | null
          id?: string
          note?: string | null
          phone?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["admission_lead_status"]
          status_updated_at?: string | null
          status_updated_by?: string | null
          user_id: string
        }
        Update: {
          academic_year?: string
          admission_cycle_id?: string
          class_code?: string
          consent_at?: string
          created_at?: string
          full_name?: string | null
          id?: string
          note?: string | null
          phone?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["admission_lead_status"]
          status_updated_at?: string | null
          status_updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_leads_admission_cycle_id_fkey"
            columns: ["admission_cycle_id"]
            isOneToOne: false
            referencedRelation: "admission_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_leads_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_notices: {
        Row: {
          ai_extraction: Json | null
          contains_personal_data: boolean
          content_hash: string
          discovered_at: string
          exam_id: string | null
          extraction: Json | null
          extraction_confidence: number | null
          extraction_model: string | null
          id: string
          page_kind: string | null
          promoted_to_golden: boolean
          retention_note: string | null
          review: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string | null
          storage_path: string | null
          url: string
        }
        Insert: {
          ai_extraction?: Json | null
          contains_personal_data?: boolean
          content_hash: string
          discovered_at?: string
          exam_id?: string | null
          extraction?: Json | null
          extraction_confidence?: number | null
          extraction_model?: string | null
          id?: string
          page_kind?: string | null
          promoted_to_golden?: boolean
          retention_note?: string | null
          review?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          storage_path?: string | null
          url: string
        }
        Update: {
          ai_extraction?: Json | null
          contains_personal_data?: boolean
          content_hash?: string
          discovered_at?: string
          exam_id?: string | null
          extraction?: Json | null
          extraction_confidence?: number | null
          extraction_model?: string | null
          id?: string
          page_kind?: string | null
          promoted_to_golden?: boolean
          retention_note?: string | null
          review?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_notices_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_notices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_deliveries: {
        Row: {
          admission_cycle_id: string | null
          clicked_at: string | null
          delivered_at: string | null
          failed_reason: string | null
          id: number
          kind: string
          provider_message_id: string | null
          sent_at: string | null
          subscription_id: string | null
          template: string | null
        }
        Insert: {
          admission_cycle_id?: string | null
          clicked_at?: string | null
          delivered_at?: string | null
          failed_reason?: string | null
          id?: number
          kind: string
          provider_message_id?: string | null
          sent_at?: string | null
          subscription_id?: string | null
          template?: string | null
        }
        Update: {
          admission_cycle_id?: string | null
          clicked_at?: string | null
          delivered_at?: string | null
          failed_reason?: string | null
          id?: number
          kind?: string
          provider_message_id?: string | null
          sent_at?: string | null
          subscription_id?: string | null
          template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_deliveries_admission_cycle_id_fkey"
            columns: ["admission_cycle_id"]
            isOneToOne: false
            referencedRelation: "admission_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "alert_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_subscriptions: {
        Row: {
          active: boolean
          city_id: number
          class_codes: string[]
          created_at: string
          exam_ids: string[]
          id: string
          language: string
          phone: string
          school_ids: string[]
          user_id: string | null
          utm: Json | null
          whatsapp_opt_in_at: string | null
        }
        Insert: {
          active?: boolean
          city_id: number
          class_codes?: string[]
          created_at?: string
          exam_ids?: string[]
          id?: string
          language?: string
          phone: string
          school_ids?: string[]
          user_id?: string | null
          utm?: Json | null
          whatsapp_opt_in_at?: string | null
        }
        Update: {
          active?: boolean
          city_id?: number
          class_codes?: string[]
          created_at?: string
          exam_ids?: string[]
          id?: string
          language?: string
          phone?: string
          school_ids?: string[]
          user_id?: string | null
          utm?: Json | null
          whatsapp_opt_in_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_subscriptions_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          school_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          school_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          school_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      application_orders: {
        Row: {
          amount_inr: number
          child_id: string
          created_at: string
          id: string
          intake: Json | null
          payment_ref: string | null
          product_code: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_inr: number
          child_id: string
          created_at?: string
          id?: string
          intake?: Json | null
          payment_ref?: string | null
          product_code: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          child_id?: string
          created_at?: string
          id?: string
          intake?: Json | null
          payment_ref?: string | null
          product_code?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_orders_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_orders_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "application_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      applications: {
        Row: {
          admission_cycle_id: string | null
          id: string
          next_action: string | null
          next_action_due: string | null
          notes: string | null
          order_id: string | null
          parent_approved_at: string | null
          school_application_no: string | null
          school_id: string
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          admission_cycle_id?: string | null
          id?: string
          next_action?: string | null
          next_action_due?: string | null
          notes?: string | null
          order_id?: string | null
          parent_approved_at?: string | null
          school_application_no?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          admission_cycle_id?: string | null
          id?: string
          next_action?: string | null
          next_action_due?: string | null
          notes?: string | null
          order_id?: string | null
          parent_approved_at?: string | null
          school_application_no?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_admission_cycle_id_fkey"
            columns: ["admission_cycle_id"]
            isOneToOne: false
            referencedRelation: "admission_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "application_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          at: string
          before: Json | null
          entity_id: string | null
          entity_table: string | null
          id: number
        }
        Insert: {
          action: string
          actor?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity_id?: string | null
          entity_table?: string | null
          id?: number
        }
        Update: {
          action?: string
          actor?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity_id?: string | null
          entity_table?: string | null
          id?: number
        }
        Relationships: []
      }
      boards: {
        Row: {
          aliases: string[]
          code: string
          id: number
          name_en: string
          name_hi: string | null
        }
        Insert: {
          aliases?: string[]
          code: string
          id?: number
          name_en: string
          name_hi?: string | null
        }
        Update: {
          aliases?: string[]
          code?: string
          id?: number
          name_en?: string
          name_hi?: string | null
        }
        Relationships: []
      }
      children: {
        Row: {
          city_id: number | null
          created_at: string
          current_school_text: string | null
          date_of_birth: string
          first_name: string
          id: string
          parent_id: string
          target_class: string | null
          target_year: string | null
        }
        Insert: {
          city_id?: number | null
          created_at?: string
          current_school_text?: string | null
          date_of_birth: string
          first_name: string
          id?: string
          parent_id: string
          target_class?: string | null
          target_year?: string | null
        }
        Update: {
          city_id?: number | null
          created_at?: string
          current_school_text?: string | null
          date_of_birth?: string
          first_name?: string
          id?: string
          parent_id?: string
          target_class?: string | null
          target_year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "children_target_class_fkey"
            columns: ["target_class"]
            isOneToOne: false
            referencedRelation: "class_levels"
            referencedColumns: ["code"]
          },
        ]
      }
      cities: {
        Row: {
          centroid: unknown
          district_id: number
          id: number
          name_en: string
          name_hi: string | null
          slug: string
        }
        Insert: {
          centroid?: unknown
          district_id: number
          id?: number
          name_en: string
          name_hi?: string | null
          slug: string
        }
        Update: {
          centroid?: unknown
          district_id?: number
          id?: number
          name_en?: string
          name_hi?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      class_levels: {
        Row: {
          aliases: string[]
          code: string
          label_en: string
          label_hi: string | null
          sort_order: number
        }
        Insert: {
          aliases?: string[]
          code: string
          label_en: string
          label_hi?: string | null
          sort_order: number
        }
        Update: {
          aliases?: string[]
          code?: string
          label_en?: string
          label_hi?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      consents: {
        Row: {
          channel: string
          granted_at: string
          id: number
          notice_version: string
          phone: string | null
          purpose: Database["public"]["Enums"]["consent_purpose"]
          user_id: string | null
          withdrawn_at: string | null
        }
        Insert: {
          channel: string
          granted_at?: string
          id?: number
          notice_version: string
          phone?: string | null
          purpose: Database["public"]["Enums"]["consent_purpose"]
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          channel?: string
          granted_at?: string
          id?: number
          notice_version?: string
          phone?: string | null
          purpose?: Database["public"]["Enums"]["consent_purpose"]
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      content_posts: {
        Row: {
          city_id: number | null
          created_at: string
          id: string
          kind: string
          language: string
          payload: Json
          published_channels: string[] | null
          status: string
        }
        Insert: {
          city_id?: number | null
          created_at?: string
          id?: string
          kind: string
          language?: string
          payload: Json
          published_channels?: string[] | null
          status?: string
        }
        Update: {
          city_id?: number | null
          created_at?: string
          id?: string
          kind?: string
          language?: string
          payload?: Json
          published_channels?: string[] | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          initiator_id: string
          last_message_at: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiator_id: string
          last_message_at?: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          initiator_id?: string
          last_message_at?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      correction_requests: {
        Row: {
          created_at: string
          details: string | null
          id: string
          kind: string
          requester: string
          resolved_at: string | null
          school_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          kind: string
          requester: string
          resolved_at?: string | null
          school_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          kind?: string
          requester?: string
          resolved_at?: string | null
          school_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "correction_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      corridors: {
        Row: {
          aliases: string[]
          centroid: unknown
          id: number
          name: string
          name_hi: string | null
          name_hi_status: string
          slug: string
        }
        Insert: {
          aliases?: string[]
          centroid?: unknown
          id?: number
          name: string
          name_hi?: string | null
          name_hi_status?: string
          slug: string
        }
        Update: {
          aliases?: string[]
          centroid?: unknown
          id?: number
          name?: string
          name_hi?: string | null
          name_hi_status?: string
          slug?: string
        }
        Relationships: []
      }
      data_quality_flags: {
        Row: {
          created_at: string
          detail: string | null
          field: string | null
          id: number
          resolved: boolean
          rule: string
          school_id: string | null
          source_record_id: number | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          field?: string | null
          id?: number
          resolved?: boolean
          rule: string
          school_id?: string | null
          source_record_id?: number | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          field?: string | null
          id?: number
          resolved?: boolean
          rule?: string
          school_id?: string | null
          source_record_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "data_quality_flags_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_quality_flags_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          id: number
          lgd_code: string | null
          name_en: string
          name_hi: string | null
          slug: string
          state_id: number
        }
        Insert: {
          id?: number
          lgd_code?: string | null
          name_en: string
          name_hi?: string | null
          slug: string
          state_id: number
        }
        Update: {
          id?: number
          lgd_code?: string | null
          name_en?: string
          name_hi?: string | null
          slug?: string
          state_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "districts_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          child_id: string
          deleted_at: string | null
          id: string
          kind: Database["public"]["Enums"]["doc_type"]
          retain_until: string
          sha256: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          child_id: string
          deleted_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["doc_type"]
          retain_until: string
          sha256: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          child_id?: string
          deleted_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["doc_type"]
          retain_until?: string
          sha256?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiries: {
        Row: {
          billable: boolean
          child_id: string | null
          class_code: string | null
          created_at: string
          id: string
          message: string | null
          school_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          billable?: boolean
          child_id?: string | null
          class_code?: string | null
          created_at?: string
          id?: string
          message?: string | null
          school_id: string
          status?: string
          user_id?: string | null
        }
        Update: {
          billable?: boolean
          child_id?: string | null
          class_code?: string | null
          created_at?: string
          id?: string
          message?: string | null
          school_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_class_code_fkey"
            columns: ["class_code"]
            isOneToOne: false
            referencedRelation: "class_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "enquiries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      events: {
        Row: {
          anon_id: string | null
          at: string
          city_id: number | null
          class_code: string | null
          id: number
          name: string
          props: Json | null
          school_id: string | null
          user_id: string | null
          utm: Json | null
        }
        Insert: {
          anon_id?: string | null
          at?: string
          city_id?: number | null
          class_code?: string | null
          id?: number
          name: string
          props?: Json | null
          school_id?: string | null
          user_id?: string | null
          utm?: Json | null
        }
        Update: {
          anon_id?: string | null
          at?: string
          city_id?: number | null
          class_code?: string | null
          id?: number
          name?: string
          props?: Json | null
          school_id?: string | null
          user_id?: string | null
          utm?: Json | null
        }
        Relationships: []
      }
      exam_centres: {
        Row: {
          city_code: string
          city_name: string
          created_at: string
          exam_id: string
          id: string
          state: string
        }
        Insert: {
          city_code: string
          city_name: string
          created_at?: string
          exam_id: string
          id?: string
          state: string
        }
        Update: {
          city_code?: string
          city_name?: string
          created_at?: string
          exam_id?: string
          id?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_centres_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_cycle_milestones: {
        Row: {
          created_at: string
          cycle_id: string
          detail_en: string | null
          detail_hi: string | null
          ends_on: string | null
          id: string
          label_en: string
          label_hi: string | null
          sort_order: number
          starts_on: string | null
        }
        Insert: {
          created_at?: string
          cycle_id: string
          detail_en?: string | null
          detail_hi?: string | null
          ends_on?: string | null
          id?: string
          label_en: string
          label_hi?: string | null
          sort_order?: number
          starts_on?: string | null
        }
        Update: {
          created_at?: string
          cycle_id?: string
          detail_en?: string | null
          detail_hi?: string | null
          ends_on?: string | null
          id?: string
          label_en?: string
          label_hi?: string | null
          sort_order?: number
          starts_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_cycle_milestones_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "admission_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_fee_tiers: {
        Row: {
          amount: number
          category_label_en: string
          category_label_hi: string | null
          created_at: string
          cycle_id: string
          id: string
          sort_order: number
        }
        Insert: {
          amount: number
          category_label_en: string
          category_label_hi?: string | null
          created_at?: string
          cycle_id: string
          id?: string
          sort_order?: number
        }
        Update: {
          amount?: number
          category_label_en?: string
          category_label_hi?: string | null
          created_at?: string
          cycle_id?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_fee_tiers_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "admission_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_participating_schools: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          name_en: string
          name_hi: string | null
          school_id: string | null
          sort_order: number
          state: string | null
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          name_en: string
          name_hi?: string | null
          school_id?: string | null
          sort_order?: number
          state?: string | null
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          name_en?: string
          name_hi?: string | null
          school_id?: string | null
          sort_order?: number
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_participating_schools_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_participating_schools_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_reservation_splits: {
        Row: {
          created_at: string
          cycle_id: string
          group_label_en: string
          group_label_hi: string | null
          id: string
          level: string
          share_text: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          cycle_id: string
          group_label_en: string
          group_label_hi?: string | null
          id?: string
          level: string
          share_text: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          cycle_id?: string
          group_label_en?: string
          group_label_hi?: string | null
          id?: string
          level?: string
          share_text?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_reservation_splits_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "admission_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          class_codes: string[]
          conducting_body: string
          created_at: string
          helpdesk_email: string | null
          helpdesk_phone: string | null
          id: string
          info_site_url: string | null
          name_en: string
          name_hi: string | null
          official_site: string | null
          slug: string
        }
        Insert: {
          class_codes?: string[]
          conducting_body: string
          created_at?: string
          helpdesk_email?: string | null
          helpdesk_phone?: string | null
          id?: string
          info_site_url?: string | null
          name_en: string
          name_hi?: string | null
          official_site?: string | null
          slug: string
        }
        Update: {
          class_codes?: string[]
          conducting_body?: string
          created_at?: string
          helpdesk_email?: string | null
          helpdesk_phone?: string | null
          id?: string
          info_site_url?: string | null
          name_en?: string
          name_hi?: string | null
          official_site?: string | null
          slug?: string
        }
        Relationships: []
      }
      facilities: {
        Row: {
          category: string | null
          code: string
          label_en: string
          label_hi: string | null
        }
        Insert: {
          category?: string | null
          code: string
          label_en: string
          label_hi?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          label_en?: string
          label_hi?: string | null
        }
        Relationships: []
      }
      featured_placements: {
        Row: {
          city_id: number
          class_codes: string[] | null
          created_at: string
          ends_on: string
          id: string
          label: string
          order_ref: string | null
          placement: string
          school_id: string
          starts_on: string
        }
        Insert: {
          city_id: number
          class_codes?: string[] | null
          created_at?: string
          ends_on: string
          id?: string
          label?: string
          order_ref?: string | null
          placement: string
          school_id: string
          starts_on: string
        }
        Update: {
          city_id?: number
          class_codes?: string[] | null
          created_at?: string
          ends_on?: string
          id?: string
          label?: string
          order_ref?: string | null
          placement?: string
          school_id?: string
          starts_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_placements_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_placements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_items: {
        Row: {
          academic_year: string
          amount_max: number | null
          amount_min: number | null
          class_code: string | null
          component: string
          frequency: string | null
          id: string
          school_id: string
          updated_at: string
          verification: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          academic_year: string
          amount_max?: number | null
          amount_min?: number | null
          class_code?: string | null
          component: string
          frequency?: string | null
          id?: string
          school_id: string
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          academic_year?: string
          amount_max?: number | null
          amount_min?: number | null
          class_code?: string | null
          component?: string
          frequency?: string | null
          id?: string
          school_id?: string
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "fee_items_class_code_fkey"
            columns: ["class_code"]
            isOneToOne: false
            referencedRelation: "class_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fee_items_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      field_provenance: {
        Row: {
          created_at: string
          entity_id: string
          entity_table: string
          evidence_url: string | null
          field: string
          id: number
          licence_class: string
          source_id: number | null
          source_record_id: number | null
          value: Json | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_table: string
          evidence_url?: string | null
          field: string
          id?: number
          licence_class?: string
          source_id?: number | null
          source_record_id?: number | null
          value?: Json | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_table?: string
          evidence_url?: string | null
          field?: string
          id?: number
          licence_class?: string
          source_id?: number | null
          source_record_id?: number | null
          value?: Json | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_provenance_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_provenance_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      form_mappings: {
        Row: {
          academic_year: string
          form_url: string | null
          id: string
          mapping: Json
          notes: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          form_url?: string | null
          id?: string
          mapping: Json
          notes?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          form_url?: string | null
          id?: string
          mapping?: Json
          notes?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_mappings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_inr: number
          customer_id: string
          customer_type: string
          gst_inr: number
          gstin: string | null
          id: string
          issued_at: string
          number: string
          pdf_path: string | null
        }
        Insert: {
          amount_inr: number
          customer_id: string
          customer_type: string
          gst_inr: number
          gstin?: string | null
          id?: string
          issued_at?: string
          number: string
          pdf_path?: string | null
        }
        Update: {
          amount_inr?: number
          customer_id?: string
          customer_type?: string
          gst_inr?: number
          gstin?: string | null
          id?: string
          issued_at?: string
          number?: string
          pdf_path?: string | null
        }
        Relationships: []
      }
      landmarks: {
        Row: {
          id: number
          locality_id: number | null
          name: string
          type: string | null
        }
        Insert: {
          id?: number
          locality_id?: number | null
          name: string
          type?: string | null
        }
        Update: {
          id?: number
          locality_id?: number | null
          name?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landmarks_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      localities: {
        Row: {
          aliases: string[]
          centroid: unknown
          character_tags: string[] | null
          city_id: number
          description: string | null
          enrichment_source: string | null
          external_ref: string | null
          id: number
          micro_localities: string[] | null
          name_en: string
          name_hi: string | null
          name_hi_status: string
          nearby_locality_slugs: string[] | null
          notable_landmarks: string[] | null
          parent_locality_id: number | null
          pincodes: string[] | null
          slug: string
          source: string | null
          status: string
          superseded_by_corridor_id: number | null
          ward_name: string | null
          ward_number: string | null
          zone: string | null
        }
        Insert: {
          aliases?: string[]
          centroid?: unknown
          character_tags?: string[] | null
          city_id: number
          description?: string | null
          enrichment_source?: string | null
          external_ref?: string | null
          id?: number
          micro_localities?: string[] | null
          name_en: string
          name_hi?: string | null
          name_hi_status?: string
          nearby_locality_slugs?: string[] | null
          notable_landmarks?: string[] | null
          parent_locality_id?: number | null
          pincodes?: string[] | null
          slug: string
          source?: string | null
          status?: string
          superseded_by_corridor_id?: number | null
          ward_name?: string | null
          ward_number?: string | null
          zone?: string | null
        }
        Update: {
          aliases?: string[]
          centroid?: unknown
          character_tags?: string[] | null
          city_id?: number
          description?: string | null
          enrichment_source?: string | null
          external_ref?: string | null
          id?: number
          micro_localities?: string[] | null
          name_en?: string
          name_hi?: string | null
          name_hi_status?: string
          nearby_locality_slugs?: string[] | null
          notable_landmarks?: string[] | null
          parent_locality_id?: number | null
          pincodes?: string[] | null
          slug?: string
          source?: string | null
          status?: string
          superseded_by_corridor_id?: number | null
          ward_name?: string | null
          ward_number?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "localities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "localities_parent_locality_id_fkey"
            columns: ["parent_locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "localities_superseded_by_corridor_id_fkey"
            columns: ["superseded_by_corridor_id"]
            isOneToOne: false
            referencedRelation: "corridors"
            referencedColumns: ["id"]
          },
        ]
      }
      locality_corridors: {
        Row: {
          corridor_id: number
          locality_id: number
        }
        Insert: {
          corridor_id: number
          locality_id: number
        }
        Update: {
          corridor_id?: number
          locality_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "locality_corridors_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "corridors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locality_corridors_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      locality_neighbors: {
        Row: {
          distance_meters: number | null
          locality_id: number
          method: string
          neighbor_locality_id: number
        }
        Insert: {
          distance_meters?: number | null
          locality_id: number
          method: string
          neighbor_locality_id: number
        }
        Update: {
          distance_meters?: number | null
          locality_id?: number
          method?: string
          neighbor_locality_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "locality_neighbors_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locality_neighbors_neighbor_locality_id_fkey"
            columns: ["neighbor_locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      locality_pincodes: {
        Row: {
          locality_id: number
          pincode: string
        }
        Insert: {
          locality_id: number
          pincode: string
        }
        Update: {
          locality_id?: number
          pincode?: string
        }
        Relationships: [
          {
            foreignKeyName: "locality_pincodes_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_tasks: {
        Row: {
          assignee: string | null
          created_at: string
          due_at: string | null
          id: string
          kind: Database["public"]["Enums"]["task_type"]
          outcome: string | null
          payload: Json | null
          priority: number
          ref_id: string | null
          ref_table: string | null
          school_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["task_type"]
          outcome?: string | null
          payload?: Json | null
          priority?: number
          ref_id?: string | null
          ref_table?: string | null
          school_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["task_type"]
          outcome?: string | null
          payload?: Json | null
          priority?: number
          ref_id?: string | null
          ref_table?: string | null
          school_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_tasks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          code: string
          gst_rate: number
          name: string
          price_inr: number
        }
        Insert: {
          active?: boolean
          code: string
          gst_rate?: number
          name: string
          price_inr: number
        }
        Update: {
          active?: boolean
          code?: string
          gst_rate?: number
          name?: string
          price_inr?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          home_city_id: number | null
          language: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          home_city_id?: number | null
          language?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          home_city_id?: number | null
          language?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_home_city_id_fkey"
            columns: ["home_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      sales_accounts: {
        Row: {
          last_contact_at: string | null
          notes: string | null
          owner: string | null
          school_id: string
          stage: string
        }
        Insert: {
          last_contact_at?: string | null
          notes?: string | null
          owner?: string | null
          school_id: string
          stage?: string
        }
        Update: {
          last_contact_at?: string | null
          notes?: string | null
          owner?: string | null
          school_id?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_accounts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_activities: {
        Row: {
          actor: string | null
          created_at: string
          id: number
          kind: string | null
          notes: string | null
          outcome: string | null
          school_id: string | null
        }
        Insert: {
          actor?: string | null
          created_at?: string
          id?: number
          kind?: string | null
          notes?: string | null
          outcome?: string | null
          school_id?: string | null
        }
        Update: {
          actor?: string | null
          created_at?: string
          id?: number
          kind?: string | null
          notes?: string | null
          outcome?: string | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_activities_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          applied_at: string
          filename: string
        }
        Insert: {
          applied_at?: string
          filename: string
        }
        Update: {
          applied_at?: string
          filename?: string
        }
        Relationships: []
      }
      school_affiliations: {
        Row: {
          affiliation_no: string | null
          board_id: number
          id: string
          level: string | null
          school_id: string
          source_id: number | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          affiliation_no?: string | null
          board_id: number
          id?: string
          level?: string | null
          school_id: string
          source_id?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          affiliation_no?: string | null
          board_id?: number
          id?: string
          level?: string | null
          school_id?: string
          source_id?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_affiliations_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_affiliations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_affiliations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      school_claims: {
        Row: {
          created_at: string
          evidence: Json | null
          id: string
          method: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          status: Database["public"]["Enums"]["claim_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          evidence?: Json | null
          id?: string
          method: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["claim_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          evidence?: Json | null
          id?: string
          method?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["claim_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_claims_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      school_events: {
        Row: {
          cancelled_at: string | null
          class_codes: string[]
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          event_code: number
          event_type: Database["public"]["Enums"]["school_event_type"]
          id: string
          listing_requested_at: string | null
          listing_review: Database["public"]["Enums"]["review_status"] | null
          listing_reviewed_at: string | null
          listing_reviewed_by: string | null
          location: string | null
          registration_url: string | null
          rejection_reason: string | null
          school_id: string
          slug: string
          source_url: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          class_codes?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_code: number
          event_type?: Database["public"]["Enums"]["school_event_type"]
          id?: string
          listing_requested_at?: string | null
          listing_review?: Database["public"]["Enums"]["review_status"] | null
          listing_reviewed_at?: string | null
          listing_reviewed_by?: string | null
          location?: string | null
          registration_url?: string | null
          rejection_reason?: string | null
          school_id: string
          slug: string
          source_url?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          class_codes?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_code?: number
          event_type?: Database["public"]["Enums"]["school_event_type"]
          id?: string
          listing_requested_at?: string | null
          listing_review?: Database["public"]["Enums"]["review_status"] | null
          listing_reviewed_at?: string | null
          listing_reviewed_by?: string | null
          location?: string | null
          registration_url?: string | null
          rejection_reason?: string | null
          school_id?: string
          slug?: string
          source_url?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_facilities: {
        Row: {
          available: boolean
          facility_code: string
          notes: string | null
          school_id: string
        }
        Insert: {
          available: boolean
          facility_code: string
          notes?: string | null
          school_id: string
        }
        Update: {
          available?: boolean
          facility_code?: string
          notes?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_facilities_facility_code_fkey"
            columns: ["facility_code"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "school_facilities_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_identifiers: {
        Row: {
          scheme: string
          school_id: string
          value: string
        }
        Insert: {
          scheme: string
          school_id: string
          value: string
        }
        Update: {
          scheme?: string
          school_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_identifiers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_jobs: {
        Row: {
          apply_email: string | null
          apply_url: string | null
          cancelled_at: string | null
          class_codes: string[]
          closes_at: string | null
          created_at: string
          created_by: string | null
          description: string
          employment_type: Database["public"]["Enums"]["job_employment_type"]
          experience_required: string | null
          filled_at: string | null
          id: string
          job_code: number
          listing_requested_at: string | null
          listing_review: Database["public"]["Enums"]["review_status"] | null
          listing_reviewed_at: string | null
          listing_reviewed_by: string | null
          location: string | null
          rejection_reason: string | null
          salary_range: string | null
          school_id: string
          slug: string
          subject: string | null
          title: string
          updated_at: string
        }
        Insert: {
          apply_email?: string | null
          apply_url?: string | null
          cancelled_at?: string | null
          class_codes?: string[]
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          employment_type?: Database["public"]["Enums"]["job_employment_type"]
          experience_required?: string | null
          filled_at?: string | null
          id?: string
          job_code: number
          listing_requested_at?: string | null
          listing_review?: Database["public"]["Enums"]["review_status"] | null
          listing_reviewed_at?: string | null
          listing_reviewed_by?: string | null
          location?: string | null
          rejection_reason?: string | null
          salary_range?: string | null
          school_id: string
          slug: string
          subject?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          apply_email?: string | null
          apply_url?: string | null
          cancelled_at?: string | null
          class_codes?: string[]
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          employment_type?: Database["public"]["Enums"]["job_employment_type"]
          experience_required?: string | null
          filled_at?: string | null
          id?: string
          job_code?: number
          listing_requested_at?: string | null
          listing_review?: Database["public"]["Enums"]["review_status"] | null
          listing_reviewed_at?: string | null
          listing_reviewed_by?: string | null
          location?: string | null
          rejection_reason?: string | null
          salary_range?: string | null
          school_id?: string
          slug?: string
          subject?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_jobs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_media: {
        Row: {
          approved: boolean
          created_at: string
          external_url: string | null
          id: string
          kind: string
          licence: string
          school_id: string
          storage_path: string | null
        }
        Insert: {
          approved?: boolean
          created_at?: string
          external_url?: string | null
          id?: string
          kind: string
          licence: string
          school_id: string
          storage_path?: string | null
        }
        Update: {
          approved?: boolean
          created_at?: string
          external_url?: string | null
          id?: string
          kind?: string
          licence?: string
          school_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_media_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_members: {
        Row: {
          role: Database["public"]["Enums"]["school_member_role"]
          school_id: string
          user_id: string
        }
        Insert: {
          role?: Database["public"]["Enums"]["school_member_role"]
          school_id: string
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["school_member_role"]
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      school_name_case_backup: {
        Row: {
          changed_at: string
          old_name_en: string
          school_id: string
        }
        Insert: {
          changed_at?: string
          old_name_en: string
          school_id: string
        }
        Update: {
          changed_at?: string
          old_name_en?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_name_case_backup_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_posts: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["post_kind"]
          listing_requested_at: string | null
          listing_review: Database["public"]["Enums"]["review_status"] | null
          listing_reviewed_at: string | null
          listing_reviewed_by: string | null
          post_code: number
          published_at: string | null
          rejection_reason: string | null
          requested_tier: Database["public"]["Enums"]["post_tier"] | null
          review: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          slug: string
          source_url: string | null
          tier: Database["public"]["Enums"]["post_tier"]
          title: string
          updated_at: string
          withdrawn_at: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["post_kind"]
          listing_requested_at?: string | null
          listing_review?: Database["public"]["Enums"]["review_status"] | null
          listing_reviewed_at?: string | null
          listing_reviewed_by?: string | null
          post_code: number
          published_at?: string | null
          rejection_reason?: string | null
          requested_tier?: Database["public"]["Enums"]["post_tier"] | null
          review?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          slug: string
          source_url?: string | null
          tier?: Database["public"]["Enums"]["post_tier"]
          title: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["post_kind"]
          listing_requested_at?: string | null
          listing_review?: Database["public"]["Enums"]["review_status"] | null
          listing_reviewed_at?: string | null
          listing_reviewed_by?: string | null
          post_code?: number
          published_at?: string | null
          rejection_reason?: string | null
          requested_tier?: Database["public"]["Enums"]["post_tier"] | null
          review?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          slug?: string
          source_url?: string | null
          tier?: Database["public"]["Enums"]["post_tier"]
          title?: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_posts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_rankings: {
        Row: {
          category: string
          created_at: string
          id: string
          rank: number | null
          school_id: string
          score: number | null
          source_id: number
          year: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          rank?: number | null
          school_id: string
          score?: number | null
          source_id: number
          year: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          rank?: number | null
          school_id?: string
          score?: number | null
          source_id?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_rankings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_rankings_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      school_slug_history: {
        Row: {
          changed_at: string
          city_slug: string
          old_slug: string
          school_id: string
        }
        Insert: {
          changed_at?: string
          city_slug: string
          old_slug: string
          school_id: string
        }
        Update: {
          changed_at?: string
          city_slug?: string
          old_slug?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_slug_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_slug_redirects: {
        Row: {
          created_at: string
          reason: string
          school_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          reason: string
          school_id: string
          slug: string
        }
        Update: {
          created_at?: string
          reason?: string
          school_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_slug_redirects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_teacher_affiliations: {
        Row: {
          created_at: string
          id: string
          initiated_by: string
          requested_by: string | null
          responded_at: string | null
          responded_by: string | null
          school_id: string
          status: Database["public"]["Enums"]["affiliation_status"]
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiated_by: string
          requested_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          school_id: string
          status: Database["public"]["Enums"]["affiliation_status"]
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          initiated_by?: string
          requested_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["affiliation_status"]
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_teacher_affiliations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_teacher_affiliations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          about_en: string | null
          about_hi: string | null
          address: string | null
          address_area: string | null
          address_city: string | null
          address_district: string | null
          address_pincode: string | null
          address_source: string | null
          address_state: string | null
          address_state_code: string | null
          address_street: string | null
          affiliation_number: string | null
          affiliation_prefix: string | null
          affiliation_source_url: string | null
          aliases: string[]
          board: string | null
          cbse_affiliation_verified: boolean | null
          city_id: number | null
          claim: Database["public"]["Enums"]["claim_status"]
          completeness: number
          corridor_id: number | null
          created_at: string
          data_quality_flags: Json | null
          district_id: number | null
          edudel_zone: string | null
          email: string[] | null
          enriched_at: string | null
          enrichment_sources: string[] | null
          established_year: number | null
          gender: Database["public"]["Enums"]["school_gender"] | null
          geocode_precision: string | null
          id: string
          last_verified_at: string | null
          locality_assignment_method: string | null
          locality_assignment_note: string | null
          locality_id: number | null
          location: unknown
          management: Database["public"]["Enums"]["school_management"] | null
          max_class: string | null
          medium: string[] | null
          merged_into: string | null
          min_class: string | null
          name_en: string
          name_hi: string | null
          name_search: unknown
          next_check_due: string | null
          phone: string[] | null
          pincode: string | null
          principal_name: string | null
          school_category: string | null
          school_code: number
          slug: string
          source_type: Database["public"]["Enums"]["provenance_source_type"]
          state_code: string | null
          status: Database["public"]["Enums"]["record_status"]
          tier: Database["public"]["Enums"]["school_tier"]
          udise_code: string | null
          updated_at: string
          verification: Database["public"]["Enums"]["verification_status"]
          verification_status: Database["public"]["Enums"]["verification_status_v2"]
          website: string | null
        }
        Insert: {
          about_en?: string | null
          about_hi?: string | null
          address?: string | null
          address_area?: string | null
          address_city?: string | null
          address_district?: string | null
          address_pincode?: string | null
          address_source?: string | null
          address_state?: string | null
          address_state_code?: string | null
          address_street?: string | null
          affiliation_number?: string | null
          affiliation_prefix?: string | null
          affiliation_source_url?: string | null
          aliases?: string[]
          board?: string | null
          cbse_affiliation_verified?: boolean | null
          city_id?: number | null
          claim?: Database["public"]["Enums"]["claim_status"]
          completeness?: number
          corridor_id?: number | null
          created_at?: string
          data_quality_flags?: Json | null
          district_id?: number | null
          edudel_zone?: string | null
          email?: string[] | null
          enriched_at?: string | null
          enrichment_sources?: string[] | null
          established_year?: number | null
          gender?: Database["public"]["Enums"]["school_gender"] | null
          geocode_precision?: string | null
          id?: string
          last_verified_at?: string | null
          locality_assignment_method?: string | null
          locality_assignment_note?: string | null
          locality_id?: number | null
          location?: unknown
          management?: Database["public"]["Enums"]["school_management"] | null
          max_class?: string | null
          medium?: string[] | null
          merged_into?: string | null
          min_class?: string | null
          name_en: string
          name_hi?: string | null
          name_search?: unknown
          next_check_due?: string | null
          phone?: string[] | null
          pincode?: string | null
          principal_name?: string | null
          school_category?: string | null
          school_code?: number
          slug: string
          source_type: Database["public"]["Enums"]["provenance_source_type"]
          state_code?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          tier?: Database["public"]["Enums"]["school_tier"]
          udise_code?: string | null
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verification_status: Database["public"]["Enums"]["verification_status_v2"]
          website?: string | null
        }
        Update: {
          about_en?: string | null
          about_hi?: string | null
          address?: string | null
          address_area?: string | null
          address_city?: string | null
          address_district?: string | null
          address_pincode?: string | null
          address_source?: string | null
          address_state?: string | null
          address_state_code?: string | null
          address_street?: string | null
          affiliation_number?: string | null
          affiliation_prefix?: string | null
          affiliation_source_url?: string | null
          aliases?: string[]
          board?: string | null
          cbse_affiliation_verified?: boolean | null
          city_id?: number | null
          claim?: Database["public"]["Enums"]["claim_status"]
          completeness?: number
          corridor_id?: number | null
          created_at?: string
          data_quality_flags?: Json | null
          district_id?: number | null
          edudel_zone?: string | null
          email?: string[] | null
          enriched_at?: string | null
          enrichment_sources?: string[] | null
          established_year?: number | null
          gender?: Database["public"]["Enums"]["school_gender"] | null
          geocode_precision?: string | null
          id?: string
          last_verified_at?: string | null
          locality_assignment_method?: string | null
          locality_assignment_note?: string | null
          locality_id?: number | null
          location?: unknown
          management?: Database["public"]["Enums"]["school_management"] | null
          max_class?: string | null
          medium?: string[] | null
          merged_into?: string | null
          min_class?: string | null
          name_en?: string
          name_hi?: string | null
          name_search?: unknown
          next_check_due?: string | null
          phone?: string[] | null
          pincode?: string | null
          principal_name?: string | null
          school_category?: string | null
          school_code?: number
          slug?: string
          source_type?: Database["public"]["Enums"]["provenance_source_type"]
          state_code?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          tier?: Database["public"]["Enums"]["school_tier"]
          udise_code?: string | null
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verification_status?: Database["public"]["Enums"]["verification_status_v2"]
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "corridors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_max_class_fkey"
            columns: ["max_class"]
            isOneToOne: false
            referencedRelation: "class_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "schools_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_min_class_fkey"
            columns: ["min_class"]
            isOneToOne: false
            referencedRelation: "class_levels"
            referencedColumns: ["code"]
          },
        ]
      }
      seat_status: {
        Row: {
          academic_year: string
          class_code: string
          confidence: Database["public"]["Enums"]["seat_confidence"]
          confirmed_at: string | null
          exact_count: number | null
          id: string
          mid_session_accepted: boolean | null
          public_status: Database["public"]["Enums"]["seat_public_status"]
          range_label: string | null
          reported_at: string
          reported_via: string | null
          school_id: string
        }
        Insert: {
          academic_year: string
          class_code: string
          confidence: Database["public"]["Enums"]["seat_confidence"]
          confirmed_at?: string | null
          exact_count?: number | null
          id?: string
          mid_session_accepted?: boolean | null
          public_status: Database["public"]["Enums"]["seat_public_status"]
          range_label?: string | null
          reported_at?: string
          reported_via?: string | null
          school_id: string
        }
        Update: {
          academic_year?: string
          class_code?: string
          confidence?: Database["public"]["Enums"]["seat_confidence"]
          confirmed_at?: string | null
          exact_count?: number | null
          id?: string
          mid_session_accepted?: boolean | null
          public_status?: Database["public"]["Enums"]["seat_public_status"]
          range_label?: string | null
          reported_at?: string
          reported_via?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_status_class_code_fkey"
            columns: ["class_code"]
            isOneToOne: false
            referencedRelation: "class_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "seat_status_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      shortlists: {
        Row: {
          child_id: string | null
          created_at: string
          school_id: string
          user_id: string
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          school_id: string
          user_id: string
        }
        Update: {
          child_id?: string | null
          created_at?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shortlists_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlists_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      source_records: {
        Row: {
          content_hash: string
          external_id: string
          fetched_at: string
          id: number
          match_confidence: number | null
          match_method: string | null
          matched_school_id: string | null
          payload: Json
          source_id: number
        }
        Insert: {
          content_hash: string
          external_id: string
          fetched_at?: string
          id?: number
          match_confidence?: number | null
          match_method?: string | null
          matched_school_id?: string | null
          payload: Json
          source_id: number
        }
        Update: {
          content_hash?: string
          external_id?: string
          fetched_at?: string
          id?: number
          match_confidence?: number | null
          match_method?: string | null
          matched_school_id?: string | null
          payload?: Json
          source_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "source_records_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          base_url: string | null
          code: string
          id: number
          licence_note: string | null
          name: string
          trust_rank: number
        }
        Insert: {
          base_url?: string | null
          code: string
          id?: number
          licence_note?: string | null
          name: string
          trust_rank?: number
        }
        Update: {
          base_url?: string | null
          code?: string
          id?: number
          licence_note?: string | null
          name?: string
          trust_rank?: number
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      states: {
        Row: {
          code: string
          id: number
          is_city_state: boolean
          name_en: string
          name_hi: string | null
          slug: string
        }
        Insert: {
          code: string
          id?: number
          is_city_state?: boolean
          name_en: string
          name_hi?: string | null
          slug: string
        }
        Update: {
          code?: string
          id?: number
          is_city_state?: boolean
          name_en?: string
          name_hi?: string | null
          slug?: string
        }
        Relationships: []
      }
      teacher_claims: {
        Row: {
          created_at: string
          evidence: Json | null
          id: string
          method: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["claim_status"]
          teacher_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          evidence?: Json | null
          id?: string
          method: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          teacher_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          evidence?: Json | null
          id?: string
          method?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          teacher_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "teacher_claims_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      teacher_experience: {
        Row: {
          end_year: number | null
          id: string
          role_title: string
          school_id: string | null
          school_text: string | null
          sort_order: number
          start_year: number
          teacher_id: string
        }
        Insert: {
          end_year?: number | null
          id?: string
          role_title: string
          school_id?: string | null
          school_text?: string | null
          sort_order?: number
          start_year: number
          teacher_id: string
        }
        Update: {
          end_year?: number | null
          id?: string
          role_title?: string
          school_id?: string | null
          school_text?: string | null
          sort_order?: number
          start_year?: number
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_experience_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_experience_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_qualifications: {
        Row: {
          detail: string | null
          id: string
          teacher_id: string
          title: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          detail?: string | null
          id?: string
          teacher_id: string
          title: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          detail?: string | null
          id?: string
          teacher_id?: string
          title?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_qualifications_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_qualifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      teachers: {
        Row: {
          about: string | null
          claimed_by: string | null
          created_at: string
          full_name: string
          headline: string | null
          id: string
          is_listed: boolean
          level: string | null
          locality_id: number | null
          open_to: string[]
          photo_storage_path: string | null
          primary_school_id: string | null
          slug: string
          status: Database["public"]["Enums"]["record_status"]
          subject: string | null
          teacher_code: number
          updated_at: string
          years_teaching: number | null
        }
        Insert: {
          about?: string | null
          claimed_by?: string | null
          created_at?: string
          full_name: string
          headline?: string | null
          id?: string
          is_listed?: boolean
          level?: string | null
          locality_id?: number | null
          open_to?: string[]
          photo_storage_path?: string | null
          primary_school_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["record_status"]
          subject?: string | null
          teacher_code: number
          updated_at?: string
          years_teaching?: number | null
        }
        Update: {
          about?: string | null
          claimed_by?: string | null
          created_at?: string
          full_name?: string
          headline?: string | null
          id?: string
          is_listed?: boolean
          level?: string | null
          locality_id?: number | null
          open_to?: string[]
          photo_storage_path?: string | null
          primary_school_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["record_status"]
          subject?: string | null
          teacher_code?: number
          updated_at?: string
          years_teaching?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "teachers_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_primary_school_id_fkey"
            columns: ["primary_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      update_reports: {
        Row: {
          attachment_path: string | null
          contact: string | null
          created_at: string
          id: string
          message: string
          reporter_id: string | null
          reporter_type: string
          school_id: string | null
          status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          attachment_path?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          message: string
          reporter_id?: string | null
          reporter_type: string
          school_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          attachment_path?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          message?: string
          reporter_id?: string | null
          reporter_type?: string
          school_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: [
          {
            foreignKeyName: "update_reports_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      approve_application: {
        Args: { p_application_id: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_attempts: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      create_application_order: {
        Args: { p_child_id: string; p_product_code: string }
        Returns: string
      }
      current_role_is: {
        Args: { r: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      daitch_mokotoff: { Args: { "": string }; Returns: string[] }
      disablelongtransactions: { Args: never; Returns: string }
      dmetaphone: { Args: { "": string }; Returns: string }
      dmetaphone_alt: { Args: { "": string }; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      event_slug: { Args: { p_code: number; p_title: string }; Returns: string }
      fix_school_display_name: { Args: { input: string }; Returns: string }
      fuzzy_candidates_in_districts: {
        Args: { p_district_ids: number[]; p_limit?: number; p_name: string }
        Returns: {
          address: string
          id: string
          name_en: string
          pincode: string
          sim: number
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_state_code_from_affiliation: {
        Args: { affiliation_number: string }
        Returns: string
      }
      gettransactionid: { Args: never; Returns: unknown }
      is_reserved_school_slug: { Args: { candidate: string }; Returns: boolean }
      is_school_admin: { Args: { sid: string }; Returns: boolean }
      is_school_member: { Args: { sid: string }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      job_slug: { Args: { p_code: number; p_title: string }; Returns: string }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mark_order_paid: {
        Args: { p_order_id: string; p_payment_ref: string }
        Returns: undefined
      }
      mint_event_code: { Args: never; Returns: number }
      mint_job_code: { Args: never; Returns: number }
      mint_post_code: { Args: never; Returns: number }
      mint_school_slug: {
        Args: {
          p_district_id: number
          p_locality_id: number
          p_name: string
          p_self_id: string
        }
        Returns: string
      }
      mint_teacher_code: { Args: never; Returns: number }
      normalize_school_name: { Args: { input: string }; Returns: string }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      post_slug: { Args: { p_code: number; p_title: string }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      purge_expired_documents: { Args: never; Returns: number }
      saras_fuzzy_candidates: {
        Args: { p_district_id: number; p_limit?: number; p_name: string }
        Returns: {
          id: string
          name_en: string
          sim: number
        }[]
      }
      save_order_intake: {
        Args: { p_intake: Json; p_order_id: string }
        Returns: undefined
      }
      school_slug_source: { Args: { input: string }; Returns: string }
      school_slug_taken: {
        Args: { candidate: string; self_id: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slugify_60: { Args: { input: string; max_len?: number }; Returns: string }
      soundex: { Args: { "": string }; Returns: string }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      teacher_slug: {
        Args: { p_code: number; p_full_name: string }
        Returns: string
      }
      text_soundex: { Args: { "": string }; Returns: string }
      title_case_school_name: { Args: { input: string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      admission_lead_status: "new" | "contacted" | "closed"
      admission_status:
        | "not_announced"
        | "upcoming"
        | "open"
        | "closing_soon"
        | "closed"
        | "results_out"
        | "postponed"
        | "cancelled"
      affiliation_status:
        | "pending_teacher"
        | "pending_school"
        | "active"
        | "declined_by_teacher"
        | "declined_by_school"
        | "removed"
      application_status:
        | "not_started"
        | "preparing"
        | "awaiting_parent_approval"
        | "submitted"
        | "fee_pending"
        | "interview_scheduled"
        | "result_selected"
        | "result_waitlisted"
        | "result_not_selected"
        | "withdrawn"
      claim_status: "unclaimed" | "pending" | "claimed" | "rejected"
      consent_purpose:
        | "account"
        | "child_profile"
        | "whatsapp_alerts"
        | "application_help"
        | "document_storage"
        | "marketing"
      doc_type:
        | "birth_certificate"
        | "photo_child"
        | "photo_parent"
        | "address_proof"
        | "aadhaar_masked"
        | "previous_report_card"
        | "transfer_certificate"
        | "caste_certificate"
        | "income_certificate"
        | "medical"
        | "other"
      form_mode: "online" | "offline" | "both" | "unknown"
      job_employment_type: "full_time" | "part_time" | "contract" | "visiting"
      order_status:
        | "draft"
        | "awaiting_payment"
        | "paid"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "refunded"
      post_kind: "news" | "press"
      post_tier: "organic" | "featured" | "press_release"
      provenance_source_type:
        | "official"
        | "school_reported"
        | "schooloye_verified"
        | "user_submitted"
      record_status: "draft" | "published" | "hidden" | "closed" | "opt_out"
      review_status:
        | "pending"
        | "approved"
        | "edited"
        | "rejected"
        | "needs_triage"
      school_event_type:
        | "ptm"
        | "open_house"
        | "admission_test"
        | "sports_day"
        | "cultural"
        | "workshop"
        | "result_day"
        | "holiday"
        | "fee_deadline"
        | "other"
      school_gender: "coed" | "boys" | "girls"
      school_management:
        | "private_unaided"
        | "private_aided"
        | "government"
        | "central_government"
        | "local_body"
        | "other"
      school_member_role: "admin" | "staff"
      school_tier: "A" | "B" | "C"
      seat_confidence: "confirmed" | "reported" | "application_possible"
      seat_public_status: "open" | "limited" | "waitlist" | "closed"
      task_status: "open" | "in_progress" | "blocked" | "done" | "cancelled"
      task_type:
        | "verify_notice"
        | "verify_update"
        | "verify_record"
        | "call_school"
        | "application"
        | "claim_review"
        | "correction_request"
        | "seat_update"
      user_role: "parent" | "school_admin" | "ops" | "admin"
      verification_status:
        | "unverified"
        | "source_verified"
        | "ops_verified"
        | "school_verified"
      verification_status_v2: "unknown" | "pending" | "verified" | "conflicting"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      admission_lead_status: ["new", "contacted", "closed"],
      admission_status: [
        "not_announced",
        "upcoming",
        "open",
        "closing_soon",
        "closed",
        "results_out",
        "postponed",
        "cancelled",
      ],
      affiliation_status: [
        "pending_teacher",
        "pending_school",
        "active",
        "declined_by_teacher",
        "declined_by_school",
        "removed",
      ],
      application_status: [
        "not_started",
        "preparing",
        "awaiting_parent_approval",
        "submitted",
        "fee_pending",
        "interview_scheduled",
        "result_selected",
        "result_waitlisted",
        "result_not_selected",
        "withdrawn",
      ],
      claim_status: ["unclaimed", "pending", "claimed", "rejected"],
      consent_purpose: [
        "account",
        "child_profile",
        "whatsapp_alerts",
        "application_help",
        "document_storage",
        "marketing",
      ],
      doc_type: [
        "birth_certificate",
        "photo_child",
        "photo_parent",
        "address_proof",
        "aadhaar_masked",
        "previous_report_card",
        "transfer_certificate",
        "caste_certificate",
        "income_certificate",
        "medical",
        "other",
      ],
      form_mode: ["online", "offline", "both", "unknown"],
      job_employment_type: ["full_time", "part_time", "contract", "visiting"],
      order_status: [
        "draft",
        "awaiting_payment",
        "paid",
        "in_progress",
        "completed",
        "cancelled",
        "refunded",
      ],
      post_kind: ["news", "press"],
      post_tier: ["organic", "featured", "press_release"],
      provenance_source_type: [
        "official",
        "school_reported",
        "schooloye_verified",
        "user_submitted",
      ],
      record_status: ["draft", "published", "hidden", "closed", "opt_out"],
      review_status: [
        "pending",
        "approved",
        "edited",
        "rejected",
        "needs_triage",
      ],
      school_event_type: [
        "ptm",
        "open_house",
        "admission_test",
        "sports_day",
        "cultural",
        "workshop",
        "result_day",
        "holiday",
        "fee_deadline",
        "other",
      ],
      school_gender: ["coed", "boys", "girls"],
      school_management: [
        "private_unaided",
        "private_aided",
        "government",
        "central_government",
        "local_body",
        "other",
      ],
      school_member_role: ["admin", "staff"],
      school_tier: ["A", "B", "C"],
      seat_confidence: ["confirmed", "reported", "application_possible"],
      seat_public_status: ["open", "limited", "waitlist", "closed"],
      task_status: ["open", "in_progress", "blocked", "done", "cancelled"],
      task_type: [
        "verify_notice",
        "verify_update",
        "verify_record",
        "call_school",
        "application",
        "claim_review",
        "correction_request",
        "seat_update",
      ],
      user_role: ["parent", "school_admin", "ops", "admin"],
      verification_status: [
        "unverified",
        "source_verified",
        "ops_verified",
        "school_verified",
      ],
      verification_status_v2: ["unknown", "pending", "verified", "conflicting"],
    },
  },
} as const
