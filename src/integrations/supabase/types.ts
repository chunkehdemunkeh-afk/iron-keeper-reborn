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
      activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          date: string
          duration: number | null
          id: string
          label: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          activity_type?: string
          created_at?: string
          date?: string
          duration?: number | null
          id?: string
          label?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          date?: string
          duration?: number | null
          id?: string
          label?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          body_fat_pct: number | null
          body_weight: number | null
          created_at: string
          date: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          body_fat_pct?: number | null
          body_weight?: number | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          body_fat_pct?: number | null
          body_weight?: number | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      coach_notifications: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          new_weight: number
          previous_weight: number
          read: boolean
          reps: number
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          new_weight: number
          previous_weight?: number
          read?: boolean
          reps?: number
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          new_weight?: number
          previous_weight?: number
          read?: boolean
          reps?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          calorie_goal: number
          calories: number
          carbs_g: number
          carbs_goal_g: number
          created_at: string
          date: string
          fat_g: number
          fat_goal_g: number
          id: string
          protein_g: number
          protein_goal_g: number
          user_id: string
          water_goal_ml: number
          water_ml: number
          weight_kg: number | null
        }
        Insert: {
          calorie_goal?: number
          calories?: number
          carbs_g?: number
          carbs_goal_g?: number
          created_at?: string
          date: string
          fat_g?: number
          fat_goal_g?: number
          id?: string
          protein_g?: number
          protein_goal_g?: number
          user_id: string
          water_goal_ml?: number
          water_ml?: number
          weight_kg?: number | null
        }
        Update: {
          calorie_goal?: number
          calories?: number
          carbs_g?: number
          carbs_goal_g?: number
          created_at?: string
          date?: string
          fat_g?: number
          fat_goal_g?: number
          id?: string
          protein_g?: number
          protein_goal_g?: number
          user_id?: string
          water_goal_ml?: number
          water_ml?: number
          weight_kg?: number | null
        }
        Relationships: []
      }
      favourite_foods: {
        Row: {
          barcode: string | null
          brand: string | null
          calories: number
          carbs_g: number
          created_at: string
          fat_g: number
          fibre_g: number | null
          food_name: string
          id: string
          protein_g: number
          salt_g: number | null
          saturated_fat_g: number | null
          serving_qty: number
          serving_size: string | null
          sugar_g: number | null
          user_id: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          fibre_g?: number | null
          food_name: string
          id?: string
          protein_g?: number
          salt_g?: number | null
          saturated_fat_g?: number | null
          serving_qty?: number
          serving_size?: string | null
          sugar_g?: number | null
          user_id: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          fibre_g?: number | null
          food_name?: string
          id?: string
          protein_g?: number
          salt_g?: number | null
          saturated_fat_g?: number | null
          serving_qty?: number
          serving_size?: string | null
          sugar_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          barcode: string | null
          brand: string | null
          calories: number
          carbs_g: number
          created_at: string
          date: string
          fat_g: number
          fibre_g: number | null
          food_name: string
          id: string
          meal_type: string
          protein_g: number
          salt_g: number | null
          saturated_fat_g: number | null
          serving_qty: number
          serving_size: string | null
          sugar_g: number | null
          user_id: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories?: number
          carbs_g?: number
          created_at?: string
          date?: string
          fat_g?: number
          fibre_g?: number | null
          food_name: string
          id?: string
          meal_type?: string
          protein_g?: number
          salt_g?: number | null
          saturated_fat_g?: number | null
          serving_qty?: number
          serving_size?: string | null
          sugar_g?: number | null
          user_id: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories?: number
          carbs_g?: number
          created_at?: string
          date?: string
          fat_g?: number
          fibre_g?: number | null
          food_name?: string
          id?: string
          meal_type?: string
          protein_g?: number
          salt_g?: number | null
          saturated_fat_g?: number | null
          serving_qty?: number
          serving_size?: string | null
          sugar_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_goals: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          fat_g: number
          id: string
          protein_g: number
          tdee_activity_level: string | null
          tdee_age: number | null
          tdee_gender: string | null
          tdee_goal: string | null
          tdee_height_cm: number | null
          tdee_weight_kg: number | null
          updated_at: string
          user_id: string
          water_goal_ml: number
        }
        Insert: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          id?: string
          protein_g?: number
          tdee_activity_level?: string | null
          tdee_age?: number | null
          tdee_gender?: string | null
          tdee_goal?: string | null
          tdee_height_cm?: number | null
          tdee_weight_kg?: number | null
          updated_at?: string
          user_id: string
          water_goal_ml?: number
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          id?: string
          protein_g?: number
          tdee_activity_level?: string | null
          tdee_age?: number | null
          tdee_gender?: string | null
          tdee_goal?: string | null
          tdee_height_cm?: number | null
          tdee_weight_kg?: number | null
          updated_at?: string
          user_id?: string
          water_goal_ml?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          last_seen_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          pose: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          pose?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          pose?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          created_at: string
          date: string
          hours: number
          id: string
          notes: string | null
          quality: number
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          hours: number
          id?: string
          notes?: string | null
          quality: number
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hours?: number
          id?: string
          notes?: string | null
          quality?: number
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stretch_completions: {
        Row: {
          created_at: string
          date: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
      water_intake: {
        Row: {
          amount_ml: number
          created_at: string
          date: string
          id: string
          user_id: string
        }
        Insert: {
          amount_ml?: number
          created_at?: string
          date?: string
          id?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          created_at: string
          focus_next: string | null
          id: string
          photo_id: string | null
          rating: number
          to_improve: string | null
          updated_at: string
          user_id: string
          week_start: string
          went_well: string | null
        }
        Insert: {
          created_at?: string
          focus_next?: string | null
          id?: string
          photo_id?: string | null
          rating: number
          to_improve?: string | null
          updated_at?: string
          user_id: string
          week_start: string
          went_well?: string | null
        }
        Update: {
          created_at?: string
          focus_next?: string | null
          id?: string
          photo_id?: string | null
          rating?: number
          to_improve?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
          went_well?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reviews_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "progress_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_history: {
        Row: {
          created_at: string
          date: string
          duration: number
          effort_rating: number | null
          exercises_completed: number
          id: string
          session_notes: string | null
          total_exercises: number
          user_id: string
          workout_id: string
          workout_name: string
        }
        Insert: {
          created_at?: string
          date?: string
          duration?: number
          effort_rating?: number | null
          exercises_completed?: number
          id?: string
          session_notes?: string | null
          total_exercises?: number
          user_id: string
          workout_id: string
          workout_name: string
        }
        Update: {
          created_at?: string
          date?: string
          duration?: number
          effort_rating?: number | null
          exercises_completed?: number
          id?: string
          session_notes?: string | null
          total_exercises?: number
          user_id?: string
          workout_id?: string
          workout_name?: string
        }
        Relationships: []
      }
      workout_sets: {
        Row: {
          created_at: string
          exercise_id: string
          exercise_name: string
          id: string
          reps: number
          set_type: string
          user_id: string
          weight: number
          workout_history_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          exercise_name?: string
          id?: string
          reps?: number
          set_type?: string
          user_id: string
          weight?: number
          workout_history_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          exercise_name?: string
          id?: string
          reps?: number
          set_type?: string
          user_id?: string
          weight?: number
          workout_history_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_history_id_fkey"
            columns: ["workout_history_id"]
            isOneToOne: false
            referencedRelation: "workout_history"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coach" | "user"
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
      app_role: ["admin", "coach", "user"],
    },
  },
} as const
