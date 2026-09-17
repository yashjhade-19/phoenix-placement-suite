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
      announcements: {
        Row: {
          audience_branch: string | null
          audience_drive_id: string | null
          audience_type: string
          audience_year: number | null
          category: string
          content: string
          created_at: string
          expires_at: string | null
          id: string
          org_id: string
          publish_at: string
          title: string
        }
        Insert: {
          audience_branch?: string | null
          audience_drive_id?: string | null
          audience_type?: string
          audience_year?: number | null
          category?: string
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          org_id: string
          publish_at?: string
          title: string
        }
        Update: {
          audience_branch?: string | null
          audience_drive_id?: string | null
          audience_type?: string
          audience_year?: number | null
          category?: string
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          org_id?: string
          publish_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_audience_drive_id_fkey"
            columns: ["audience_drive_id"]
            isOneToOne: false
            referencedRelation: "drives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      application_responses: {
        Row: {
          application_id: string
          created_at: string
          field_id: string
          field_type: string
          id: string
          label: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          application_id: string
          created_at?: string
          field_id: string
          field_type: string
          id?: string
          label: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          application_id?: string
          created_at?: string
          field_id?: string
          field_type?: string
          id?: string
          label?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "application_responses_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_responses_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          admin_notes: string | null
          created_at: string
          drive_id: string
          id: string
          org_id: string
          responses: Json
          status: Database["public"]["Enums"]["application_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          drive_id: string
          id?: string
          org_id: string
          responses?: Json
          status?: Database["public"]["Enums"]["application_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          drive_id?: string
          id?: string
          org_id?: string
          responses?: Json
          status?: Database["public"]["Enums"]["application_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "drives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          company_size: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          industry: string | null
          linkedin_url: string | null
          location: string | null
          logo_url: string | null
          name: string
          org_id: string
          website: string | null
        }
        Insert: {
          company_size?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          location?: string | null
          logo_url?: string | null
          name: string
          org_id: string
          website?: string | null
        }
        Update: {
          company_size?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string
          org_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drives: {
        Row: {
          benefits: string | null
          company_id: string
          created_at: string
          ctc: number | null
          deadline: string | null
          description: string | null
          drive_date: string | null
          eligible_batches: number[]
          employment_type: string
          id: string
          location: string | null
          opens_at: string | null
          org_id: string
          ppt_at: string | null
          status: Database["public"]["Enums"]["drive_status"]
          stipend: number | null
          title: string
          updated_at: string
          work_mode: string
        }
        Insert: {
          benefits?: string | null
          company_id: string
          created_at?: string
          ctc?: number | null
          deadline?: string | null
          description?: string | null
          drive_date?: string | null
          eligible_batches?: number[]
          employment_type?: string
          id?: string
          location?: string | null
          opens_at?: string | null
          org_id: string
          ppt_at?: string | null
          status?: Database["public"]["Enums"]["drive_status"]
          stipend?: number | null
          title: string
          updated_at?: string
          work_mode?: string
        }
        Update: {
          benefits?: string | null
          company_id?: string
          created_at?: string
          ctc?: number | null
          deadline?: string | null
          description?: string | null
          drive_date?: string | null
          eligible_batches?: number[]
          employment_type?: string
          id?: string
          location?: string | null
          opens_at?: string | null
          org_id?: string
          ppt_at?: string | null
          status?: Database["public"]["Enums"]["drive_status"]
          stipend?: number | null
          title?: string
          updated_at?: string
          work_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "drives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      eligibility_rules: {
        Row: {
          drive_id: string
          field: string
          group_index: number
          id: string
          operator: string
          value: string
        }
        Insert: {
          drive_id: string
          field: string
          group_index?: number
          id?: string
          operator: string
          value: string
        }
        Update: {
          drive_id?: string
          field?: string
          group_index?: number
          id?: string
          operator?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "eligibility_rules_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "drives"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string
          drive_id: string
          field_type: string
          help_text: string | null
          id: string
          label: string
          options: string[]
          placeholder: string | null
          profile_field: string | null
          required: boolean
          sort_order: number
          updated_at: string
          validation: Json
        }
        Insert: {
          created_at?: string
          drive_id: string
          field_type: string
          help_text?: string | null
          id?: string
          label: string
          options?: string[]
          placeholder?: string | null
          profile_field?: string | null
          required?: boolean
          sort_order?: number
          updated_at?: string
          validation?: Json
        }
        Update: {
          created_at?: string
          drive_id?: string
          field_type?: string
          help_text?: string | null
          id?: string
          label?: string
          options?: string[]
          placeholder?: string | null
          profile_field?: string | null
          required?: boolean
          sort_order?: number
          updated_at?: string
          validation?: Json
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "drives"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          academic_year: string | null
          admin_code: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          website: string | null
        }
        Insert: {
          academic_year?: string | null
          admin_code?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name: string
          website?: string | null
        }
        Update: {
          academic_year?: string | null
          admin_code?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          org_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          org_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_stages: {
        Row: {
          drive_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          drive_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          drive_id?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_stages_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "drives"
            referencedColumns: ["id"]
          },
        ]
      }
      student_certifications: {
        Row: {
          created_at: string
          credential_url: string | null
          id: string
          issue_date: string | null
          issuer: string | null
          name: string
          sort_order: number
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential_url?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name: string
          sort_order?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential_url?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name?: string
          sort_order?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_certifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          sort_order: number
          student_id: string
          technologies: string[]
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          student_id: string
          technologies?: string[]
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          student_id?: string
          technologies?: string[]
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_projects_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          active_backlogs: number
          batch: string | null
          branch: string | null
          certifications: string | null
          cgpa: number | null
          course: string | null
          created_at: string
          date_of_birth: string | null
          diploma_percentage: number | null
          email: string
          enrollment_no: string
          full_name: string
          gender: string | null
          github_url: string | null
          graduation_year: number | null
          id: string
          linkedin_url: string | null
          org_id: string
          phone: string | null
          photo_url: string | null
          portfolio_url: string | null
          projects: string | null
          resume_url: string | null
          skills: string[]
          tenth_percentage: number | null
          total_backlogs: number
          twelfth_percentage: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active_backlogs?: number
          batch?: string | null
          branch?: string | null
          certifications?: string | null
          cgpa?: number | null
          course?: string | null
          created_at?: string
          date_of_birth?: string | null
          diploma_percentage?: number | null
          email: string
          enrollment_no: string
          full_name: string
          gender?: string | null
          github_url?: string | null
          graduation_year?: number | null
          id?: string
          linkedin_url?: string | null
          org_id: string
          phone?: string | null
          photo_url?: string | null
          portfolio_url?: string | null
          projects?: string | null
          resume_url?: string | null
          skills?: string[]
          tenth_percentage?: number | null
          total_backlogs?: number
          twelfth_percentage?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active_backlogs?: number
          batch?: string | null
          branch?: string | null
          certifications?: string | null
          cgpa?: number | null
          course?: string | null
          created_at?: string
          date_of_birth?: string | null
          diploma_percentage?: number | null
          email?: string
          enrollment_no?: string
          full_name?: string
          gender?: string | null
          github_url?: string | null
          graduation_year?: number | null
          id?: string
          linkedin_url?: string | null
          org_id?: string
          phone?: string | null
          photo_url?: string | null
          portfolio_url?: string | null
          projects?: string | null
          resume_url?: string | null
          skills?: string[]
          tenth_percentage?: number | null
          total_backlogs?: number
          twelfth_percentage?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_admin: { Args: { _code: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      my_org: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "student"
      application_status:
        | "applied"
        | "under_review"
        | "shortlisted"
        | "selected"
        | "rejected"
        | "withdrawn"
      drive_status:
        | "draft"
        | "published"
        | "applications_open"
        | "applications_closed"
        | "selection_in_progress"
        | "completed"
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
      app_role: ["admin", "student"],
      application_status: [
        "applied",
        "under_review",
        "shortlisted",
        "selected",
        "rejected",
        "withdrawn",
      ],
      drive_status: [
        "draft",
        "published",
        "applications_open",
        "applications_closed",
        "selection_in_progress",
        "completed",
      ],
    },
  },
} as const
