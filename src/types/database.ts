export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      assignments: {
        Row: {
          assigned_by: string;
          created_at: string;
          id: string;
          need_id: string;
          note: string | null;
          responder_id: string;
          status: Database["public"]["Enums"]["assignment_status"];
          updated_at: string;
        };
        Insert: {
          assigned_by: string;
          created_at?: string;
          id?: string;
          need_id: string;
          note?: string | null;
          responder_id: string;
          status?: Database["public"]["Enums"]["assignment_status"];
          updated_at?: string;
        };
        Update: {
          assigned_by?: string;
          created_at?: string;
          id?: string;
          need_id?: string;
          note?: string | null;
          responder_id?: string;
          status?: Database["public"]["Enums"]["assignment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_need_id_fkey";
            columns: ["need_id"];
            isOneToOne: false;
            referencedRelation: "needs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_need_id_fkey";
            columns: ["need_id"];
            isOneToOne: false;
            referencedRelation: "public_needs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_responder_id_fkey";
            columns: ["responder_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: Database["public"]["Enums"]["user_role"] | null;
          created_at: string;
          entity_id: string | null;
          entity_table: string;
          id: number;
          summary: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["user_role"] | null;
          created_at?: string;
          entity_id?: string | null;
          entity_table: string;
          id?: never;
          summary?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["user_role"] | null;
          created_at?: string;
          entity_id?: string | null;
          entity_table?: string;
          id?: never;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      hazards: {
        Row: {
          client_token: string;
          created_at: string;
          description: string | null;
          expires_at: string;
          id: string;
          lat: number;
          lng: number;
          severity: Database["public"]["Enums"]["urgency"];
          status: Database["public"]["Enums"]["need_status"];
          type: Database["public"]["Enums"]["hazard_type"];
          updated_at: string;
          verification: Database["public"]["Enums"]["verification_status"];
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          client_token?: string;
          created_at?: string;
          description?: string | null;
          expires_at?: string;
          id?: string;
          lat: number;
          lng: number;
          severity?: Database["public"]["Enums"]["urgency"];
          status?: Database["public"]["Enums"]["need_status"];
          type: Database["public"]["Enums"]["hazard_type"];
          updated_at?: string;
          verification?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          client_token?: string;
          created_at?: string;
          description?: string | null;
          expires_at?: string;
          id?: string;
          lat?: number;
          lng?: number;
          severity?: Database["public"]["Enums"]["urgency"];
          status?: Database["public"]["Enums"]["need_status"];
          type?: Database["public"]["Enums"]["hazard_type"];
          updated_at?: string;
          verification?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hazards_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      missing_persons: {
        Row: {
          age: number | null;
          client_token: string;
          created_at: string;
          description: string | null;
          full_name: string;
          id: string;
          last_seen_at: string | null;
          last_seen_lat: number | null;
          last_seen_lng: number | null;
          last_seen_note: string | null;
          reporter_name: string | null;
          reporter_phone: string | null;
          status: Database["public"]["Enums"]["need_status"];
          updated_at: string;
          verification: Database["public"]["Enums"]["verification_status"];
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          age?: number | null;
          client_token?: string;
          created_at?: string;
          description?: string | null;
          full_name: string;
          id?: string;
          last_seen_at?: string | null;
          last_seen_lat?: number | null;
          last_seen_lng?: number | null;
          last_seen_note?: string | null;
          reporter_name?: string | null;
          reporter_phone?: string | null;
          status?: Database["public"]["Enums"]["need_status"];
          updated_at?: string;
          verification?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          age?: number | null;
          client_token?: string;
          created_at?: string;
          description?: string | null;
          full_name?: string;
          id?: string;
          last_seen_at?: string | null;
          last_seen_lat?: number | null;
          last_seen_lng?: number | null;
          last_seen_note?: string | null;
          reporter_name?: string | null;
          reporter_phone?: string | null;
          status?: Database["public"]["Enums"]["need_status"];
          updated_at?: string;
          verification?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "missing_persons_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      needs: {
        Row: {
          address_note: string | null;
          category: Database["public"]["Enums"]["need_category"];
          claimed_by: string | null;
          client_token: string;
          contact_name: string | null;
          contact_phone: string | null;
          created_at: string;
          description: string | null;
          expires_at: string;
          id: string;
          lat: number;
          lng: number;
          people_count: number;
          status: Database["public"]["Enums"]["need_status"];
          updated_at: string;
          urgency: Database["public"]["Enums"]["urgency"];
          verification: Database["public"]["Enums"]["verification_status"];
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          address_note?: string | null;
          category: Database["public"]["Enums"]["need_category"];
          claimed_by?: string | null;
          client_token?: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          description?: string | null;
          expires_at?: string;
          id?: string;
          lat: number;
          lng: number;
          people_count?: number;
          status?: Database["public"]["Enums"]["need_status"];
          updated_at?: string;
          urgency?: Database["public"]["Enums"]["urgency"];
          verification?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          address_note?: string | null;
          category?: Database["public"]["Enums"]["need_category"];
          claimed_by?: string | null;
          client_token?: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          description?: string | null;
          expires_at?: string;
          id?: string;
          lat?: number;
          lng?: number;
          people_count?: number;
          status?: Database["public"]["Enums"]["need_status"];
          updated_at?: string;
          urgency?: Database["public"]["Enums"]["urgency"];
          verification?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "needs_claimed_by_fkey";
            columns: ["claimed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "needs_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          is_active: boolean;
          organization: string | null;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
          is_active?: boolean;
          organization?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          is_active?: boolean;
          organization?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      resource_supplies: {
        Row: {
          category: Database["public"]["Enums"]["supply_category"];
          created_at: string;
          id: string;
          label: string | null;
          quantity: number | null;
          resource_id: string;
          status: Database["public"]["Enums"]["supply_status"];
          unit: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          category: Database["public"]["Enums"]["supply_category"];
          created_at?: string;
          id?: string;
          label?: string | null;
          quantity?: number | null;
          resource_id: string;
          status?: Database["public"]["Enums"]["supply_status"];
          unit?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          category?: Database["public"]["Enums"]["supply_category"];
          created_at?: string;
          id?: string;
          label?: string | null;
          quantity?: number | null;
          resource_id?: string;
          status?: Database["public"]["Enums"]["supply_status"];
          unit?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "resource_supplies_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "public_resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resource_supplies_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resource_supplies_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      resources: {
        Row: {
          address_note: string | null;
          capacity_note: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          expires_at: string;
          id: string;
          is_open: boolean;
          lat: number;
          lng: number;
          name: string;
          type: Database["public"]["Enums"]["resource_type"];
          updated_at: string;
          verification: Database["public"]["Enums"]["verification_status"];
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          address_note?: string | null;
          capacity_note?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          expires_at?: string;
          id?: string;
          is_open?: boolean;
          lat: number;
          lng: number;
          name: string;
          type: Database["public"]["Enums"]["resource_type"];
          updated_at?: string;
          verification?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          address_note?: string | null;
          capacity_note?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          expires_at?: string;
          id?: string;
          is_open?: boolean;
          lat?: number;
          lng?: number;
          name?: string;
          type?: Database["public"]["Enums"]["resource_type"];
          updated_at?: string;
          verification?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "resources_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resources_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      public_hazards: {
        Row: {
          created_at: string | null;
          description: string | null;
          expires_at: string | null;
          id: string | null;
          lat: number | null;
          lng: number | null;
          severity: Database["public"]["Enums"]["urgency"] | null;
          status: Database["public"]["Enums"]["need_status"] | null;
          type: Database["public"]["Enums"]["hazard_type"] | null;
          updated_at: string | null;
          verification:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          verified_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          expires_at?: string | null;
          id?: string | null;
          lat?: never;
          lng?: never;
          severity?: Database["public"]["Enums"]["urgency"] | null;
          status?: Database["public"]["Enums"]["need_status"] | null;
          type?: Database["public"]["Enums"]["hazard_type"] | null;
          updated_at?: string | null;
          verification?:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          verified_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          expires_at?: string | null;
          id?: string | null;
          lat?: never;
          lng?: never;
          severity?: Database["public"]["Enums"]["urgency"] | null;
          status?: Database["public"]["Enums"]["need_status"] | null;
          type?: Database["public"]["Enums"]["hazard_type"] | null;
          updated_at?: string | null;
          verification?:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      public_needs: {
        Row: {
          category: Database["public"]["Enums"]["need_category"] | null;
          created_at: string | null;
          description: string | null;
          expires_at: string | null;
          id: string | null;
          lat: number | null;
          lng: number | null;
          people_count: number | null;
          status: Database["public"]["Enums"]["need_status"] | null;
          updated_at: string | null;
          urgency: Database["public"]["Enums"]["urgency"] | null;
          verification:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          verified_at: string | null;
        };
        Insert: {
          category?: Database["public"]["Enums"]["need_category"] | null;
          created_at?: string | null;
          description?: string | null;
          expires_at?: string | null;
          id?: string | null;
          lat?: never;
          lng?: never;
          people_count?: number | null;
          status?: Database["public"]["Enums"]["need_status"] | null;
          updated_at?: string | null;
          urgency?: Database["public"]["Enums"]["urgency"] | null;
          verification?:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          verified_at?: string | null;
        };
        Update: {
          category?: Database["public"]["Enums"]["need_category"] | null;
          created_at?: string | null;
          description?: string | null;
          expires_at?: string | null;
          id?: string | null;
          lat?: never;
          lng?: never;
          people_count?: number | null;
          status?: Database["public"]["Enums"]["need_status"] | null;
          updated_at?: string | null;
          urgency?: Database["public"]["Enums"]["urgency"] | null;
          verification?:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      public_resources: {
        Row: {
          address_note: string | null;
          capacity_note: string | null;
          created_at: string | null;
          description: string | null;
          expires_at: string | null;
          id: string | null;
          is_open: boolean | null;
          lat: number | null;
          lng: number | null;
          name: string | null;
          supplies: Json | null;
          type: Database["public"]["Enums"]["resource_type"] | null;
          updated_at: string | null;
          verification:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          verified_at: string | null;
        };
        Insert: {
          address_note?: string | null;
          capacity_note?: string | null;
          created_at?: string | null;
          description?: string | null;
          expires_at?: string | null;
          id?: string | null;
          is_open?: boolean | null;
          lat?: number | null;
          lng?: number | null;
          name?: string | null;
          supplies?: never;
          type?: Database["public"]["Enums"]["resource_type"] | null;
          updated_at?: string | null;
          verification?:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          verified_at?: string | null;
        };
        Update: {
          address_note?: string | null;
          capacity_note?: string | null;
          created_at?: string | null;
          description?: string | null;
          expires_at?: string | null;
          id?: string | null;
          is_open?: boolean | null;
          lat?: number | null;
          lng?: number | null;
          name?: string | null;
          supplies?: never;
          type?: Database["public"]["Enums"]["resource_type"] | null;
          updated_at?: string | null;
          verification?:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          verified_at?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      app_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      blur_coord: { Args: { value: number }; Returns: number };
      is_coordinator: { Args: never; Returns: boolean };
      is_responder: { Args: never; Returns: boolean };
    };
    Enums: {
      assignment_status:
        | "assigned"
        | "accepted"
        | "en_route"
        | "completed"
        | "cancelled";
      hazard_type:
        | "building_collapse"
        | "fire"
        | "flood"
        | "gas_leak"
        | "road_blocked"
        | "power_line"
        | "aftershock"
        | "other";
      need_category:
        | "rescue"
        | "medical"
        | "water"
        | "food"
        | "shelter"
        | "evacuation"
        | "other";
      need_status:
        | "open"
        | "in_progress"
        | "resolved"
        | "cancelled"
        | "expired";
      resource_type:
        | "water_point"
        | "food_distribution"
        | "shelter"
        | "clinic"
        | "charging_station"
        | "distribution_center"
        | "other";
      supply_category:
        | "water"
        | "food"
        | "medical"
        | "shelter_beds"
        | "hygiene"
        | "power"
        | "infant"
        | "other";
      supply_status: "ok" | "low" | "out";
      urgency: "critical" | "high" | "medium" | "low";
      user_role: "volunteer" | "coordinator";
      verification_status: "unverified" | "verified" | "disputed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      assignment_status: [
        "assigned",
        "accepted",
        "en_route",
        "completed",
        "cancelled",
      ],
      hazard_type: [
        "building_collapse",
        "fire",
        "flood",
        "gas_leak",
        "road_blocked",
        "power_line",
        "aftershock",
        "other",
      ],
      need_category: [
        "rescue",
        "medical",
        "water",
        "food",
        "shelter",
        "evacuation",
        "other",
      ],
      need_status: ["open", "in_progress", "resolved", "cancelled", "expired"],
      resource_type: [
        "water_point",
        "food_distribution",
        "shelter",
        "clinic",
        "charging_station",
        "distribution_center",
        "other",
      ],
      supply_category: [
        "water",
        "food",
        "medical",
        "shelter_beds",
        "hygiene",
        "power",
        "infant",
        "other",
      ],
      supply_status: ["ok", "low", "out"],
      urgency: ["critical", "high", "medium", "low"],
      user_role: ["volunteer", "coordinator"],
      verification_status: ["unverified", "verified", "disputed"],
    },
  },
} as const;
