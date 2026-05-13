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
          calories_burned: number | null
          created_at: string
          date: string
          distance_km: number | null
          duration: number | null
          id: string
          incline_pct: number | null
          label: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          activity_type?: string
          calories_burned?: number | null
          created_at?: string
          date?: string
          distance_km?: number | null
          duration?: number | null
          id?: string
          incline_pct?: number | null
          label?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          calories_burned?: number | null
          created_at?: string
          date?: string
          distance_km?: number | null
          duration?: number | null
          id?: string
          incline_pct?: number | null
          label?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          code: string
          coin_reward: number
          created_at: string
          criteria: Json
          description: string
          hidden: boolean
          icon: string
          name: string
          tier: string
          xp_reward: number
        }
        Insert: {
          category: string
          code: string
          coin_reward?: number
          created_at?: string
          criteria: Json
          description: string
          hidden?: boolean
          icon: string
          name: string
          tier?: string
          xp_reward?: number
        }
        Update: {
          category?: string
          code?: string
          coin_reward?: number
          created_at?: string
          criteria?: Json
          description?: string
          hidden?: boolean
          icon?: string
          name?: string
          tier?: string
          xp_reward?: number
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
      clan_members: {
        Row: {
          clan_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          clan_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          clan_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      clans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          tag: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          tag?: string
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
      community_challenges: {
        Row: {
          code: string
          created_at: string
          description: string
          ends_at: string
          id: string
          metric: string
          reward_coins: number
          reward_cosmetic_code: string | null
          starts_at: string
          target: number
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          ends_at: string
          id?: string
          metric: string
          reward_coins?: number
          reward_cosmetic_code?: string | null
          starts_at?: string
          target: number
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          ends_at?: string
          id?: string
          metric?: string
          reward_coins?: number
          reward_cosmetic_code?: string | null
          starts_at?: string
          target?: number
          title?: string
        }
        Relationships: []
      }
      community_contributions: {
        Row: {
          challenge_id: string
          id: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          challenge_id: string
          id?: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          challenge_id?: string
          id?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      cosmetics: {
        Row: {
          available: boolean
          code: string
          created_at: string
          description: string
          id: string
          kind: string
          name: string
          payload: Json
          price_coins: number
          rarity: string
          required_tier: string | null
          season_exclusive_id: string | null
        }
        Insert: {
          available?: boolean
          code: string
          created_at?: string
          description: string
          id?: string
          kind: string
          name: string
          payload?: Json
          price_coins?: number
          rarity?: string
          required_tier?: string | null
          season_exclusive_id?: string | null
        }
        Update: {
          available?: boolean
          code?: string
          created_at?: string
          description?: string
          id?: string
          kind?: string
          name?: string
          payload?: Json
          price_coins?: number
          rarity?: string
          required_tier?: string | null
          season_exclusive_id?: string | null
        }
        Relationships: []
      }
      daily_biometrics: {
        Row: {
          created_at: string | null
          date: string
          hrv_ms: number | null
          id: string
          respiratory_rate: number | null
          resting_hr: number | null
          samsung_stress_score: number | null
          source: string | null
          spo2_pct: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          hrv_ms?: number | null
          id?: string
          respiratory_rate?: number | null
          resting_hr?: number | null
          samsung_stress_score?: number | null
          source?: string | null
          spo2_pct?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          hrv_ms?: number | null
          id?: string
          respiratory_rate?: number | null
          resting_hr?: number | null
          samsung_stress_score?: number | null
          source?: string | null
          spo2_pct?: number | null
          updated_at?: string | null
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
      daily_scores: {
        Row: {
          ai_generated_at: string | null
          ai_insight: Json | null
          created_at: string | null
          date: string
          id: string
          recovery_score: number | null
          sleep_performance: number | null
          strain_score: number | null
          stress_level: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generated_at?: string | null
          ai_insight?: Json | null
          created_at?: string | null
          date: string
          id?: string
          recovery_score?: number | null
          sleep_performance?: number | null
          strain_score?: number | null
          stress_level?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generated_at?: string | null
          ai_insight?: Json | null
          created_at?: string | null
          date?: string
          id?: string
          recovery_score?: number | null
          sleep_performance?: number | null
          strain_score?: number | null
          stress_level?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      duel_progress: {
        Row: {
          baseline: number | null
          duel_id: string
          id: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          baseline?: number | null
          duel_id: string
          id?: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          baseline?: number | null
          duel_id?: string
          id?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "duel_progress_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
        ]
      }
      duels: {
        Row: {
          challenger_id: string
          created_at: string
          duration_days: number
          ends_at: string | null
          exercise_id: string | null
          id: string
          opponent_id: string
          rp_stake: number
          starts_at: string | null
          status: string
          target: number | null
          type: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          challenger_id: string
          created_at?: string
          duration_days?: number
          ends_at?: string | null
          exercise_id?: string | null
          id?: string
          opponent_id: string
          rp_stake?: number
          starts_at?: string | null
          status?: string
          target?: number | null
          type: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          challenger_id?: string
          created_at?: string
          duration_days?: number
          ends_at?: string | null
          exercise_id?: string | null
          id?: string
          opponent_id?: string
          rp_stake?: number
          starts_at?: string | null
          status?: string
          target?: number | null
          type?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      equipped_cosmetics: {
        Row: {
          cosmetic_code: string
          kind: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cosmetic_code: string
          kind: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cosmetic_code?: string
          kind?: string
          updated_at?: string
          user_id?: string
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
          adjust_for_activity: boolean
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
          adjust_for_activity?: boolean
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
          adjust_for_activity?: boolean
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
          leaderboard_visible: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          leaderboard_visible?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          leaderboard_visible?: boolean
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quests: {
        Row: {
          active_from: string
          active_to: string | null
          code: string
          coin_reward: number
          created_at: string
          criteria: Json
          description: string
          id: string
          title: string
          type: string
          xp_reward: number
        }
        Insert: {
          active_from?: string
          active_to?: string | null
          code: string
          coin_reward?: number
          created_at?: string
          criteria: Json
          description: string
          id?: string
          title: string
          type: string
          xp_reward?: number
        }
        Update: {
          active_from?: string
          active_to?: string | null
          code?: string
          coin_reward?: number
          created_at?: string
          criteria?: Json
          description?: string
          id?: string
          title?: string
          type?: string
          xp_reward?: number
        }
        Relationships: []
      }
      season_results: {
        Row: {
          created_at: string
          final_rank: number | null
          final_rp: number
          final_tier: string
          id: string
          season_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          final_rank?: number | null
          final_rp?: number
          final_tier?: string
          id?: string
          season_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          final_rank?: number | null
          final_rp?: number
          final_tier?: string
          id?: string
          season_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_results_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          number: number
          starts_at: string
          status: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          number: number
          starts_at: string
          status?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          number?: number
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          awake_min: number | null
          created_at: string
          date: string
          deep_sleep_min: number | null
          hours: number
          id: string
          light_sleep_min: number | null
          notes: string | null
          quality: number
          rem_sleep_min: number | null
          sleep_efficiency: number | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          awake_min?: number | null
          created_at?: string
          date: string
          deep_sleep_min?: number | null
          hours: number
          id?: string
          light_sleep_min?: number | null
          notes?: string | null
          quality: number
          rem_sleep_min?: number | null
          sleep_efficiency?: number | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          awake_min?: number | null
          created_at?: string
          date?: string
          deep_sleep_min?: number | null
          hours?: number
          id?: string
          light_sleep_min?: number | null
          notes?: string | null
          quality?: number
          rem_sleep_min?: number | null
          sleep_efficiency?: number | null
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
      user_badges: {
        Row: {
          badge_code: string
          id: string
          progress: Json | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_code: string
          id?: string
          progress?: Json | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_code?: string
          id?: string
          progress?: Json | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
          },
        ]
      }
      user_cosmetics: {
        Row: {
          acquired_at: string
          cosmetic_code: string
          id: string
          source: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          cosmetic_code: string
          id?: string
          source?: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          cosmetic_code?: string
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          coins: number
          created_at: string
          current_streak: number
          freeze_tokens: number
          last_active_date: string | null
          level: number
          longest_streak: number
          season_rp: number
          season_tier: string
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          coins?: number
          created_at?: string
          current_streak?: number
          freeze_tokens?: number
          last_active_date?: string | null
          level?: number
          longest_streak?: number
          season_rp?: number
          season_tier?: string
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          coins?: number
          created_at?: string
          current_streak?: number
          freeze_tokens?: number
          last_active_date?: string | null
          level?: number
          longest_streak?: number
          season_rp?: number
          season_tier?: string
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_quests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          progress: number
          quest_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          quest_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          quest_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quests_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
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
          avg_hr: number | null
          calories_burned: number | null
          created_at: string
          date: string
          duration: number
          effort_rating: number | null
          exercises_completed: number
          id: string
          max_hr: number | null
          session_notes: string | null
          started_at: string | null
          total_exercises: number
          user_id: string
          workout_id: string
          workout_name: string
        }
        Insert: {
          avg_hr?: number | null
          calories_burned?: number | null
          created_at?: string
          date?: string
          duration?: number
          effort_rating?: number | null
          exercises_completed?: number
          id?: string
          max_hr?: number | null
          session_notes?: string | null
          started_at?: string | null
          total_exercises?: number
          user_id: string
          workout_id: string
          workout_name: string
        }
        Update: {
          avg_hr?: number | null
          calories_burned?: number | null
          created_at?: string
          date?: string
          duration?: number
          effort_rating?: number | null
          exercises_completed?: number
          id?: string
          max_hr?: number | null
          session_notes?: string | null
          started_at?: string | null
          total_exercises?: number
          user_id?: string
          workout_id?: string
          workout_name?: string
        }
        Relationships: []
      }
      workout_hr_samples: {
        Row: {
          bpm: number
          created_at: string
          id: string
          recorded_at: string
          source: string
          user_id: string
          workout_history_id: string
        }
        Insert: {
          bpm: number
          created_at?: string
          id?: string
          recorded_at: string
          source?: string
          user_id: string
          workout_history_id: string
        }
        Update: {
          bpm?: number
          created_at?: string
          id?: string
          recorded_at?: string
          source?: string
          user_id?: string
          workout_history_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_hr_samples_workout_history_id_fkey"
            columns: ["workout_history_id"]
            isOneToOne: false
            referencedRelation: "workout_history"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          created_at: string
          exercise_id: string
          exercise_name: string
          id: string
          original_exercise_id: string | null
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
          original_exercise_id?: string | null
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
          original_exercise_id?: string | null
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
      xp_events: {
        Row: {
          coins: number
          created_at: string
          id: string
          metadata: Json | null
          source: string
          user_id: string
          xp: number
        }
        Insert: {
          coins?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          source: string
          user_id: string
          xp?: number
        }
        Update: {
          coins?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          source?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      estimate_cardio_burn: {
        Args: {
          _activity_type: string
          _distance_km: number
          _duration_min: number
          _incline_pct: number
          _weight_kg: number
        }
        Returns: number
      }
      estimate_strength_burn: {
        Args: {
          _duration_min: number
          _weight_kg: number
          _workout_history_id: string
        }
        Returns: number
      }
      get_1rm_leaderboard: {
        Args: { p_exercise_id: string; p_time_filter?: string }
        Returns: {
          avatar_url: string
          best_1rm: number
          display_name: string
          is_tested: boolean
          logged_at: string
          rank: number
          reps: number
          user_id: string
          weight: number
        }[]
      }
      get_max_reps_leaderboard: {
        Args: { p_exercise_id: string; p_time_filter?: string }
        Returns: {
          avatar_url: string
          display_name: string
          heaviest_weight: number
          logged_at: string
          max_reps: number
          rank: number
          user_id: string
        }[]
      }
      get_max_weight_leaderboard: {
        Args: { p_exercise_id: string; p_time_filter?: string }
        Returns: {
          avatar_url: string
          display_name: string
          logged_at: string
          max_weight: number
          rank: number
          reps: number
          user_id: string
        }[]
      }
      get_session_volume_leaderboard: {
        Args: { p_session_type?: string; p_time_filter?: string }
        Returns: {
          avatar_url: string
          display_name: string
          rank: number
          session_count: number
          total_volume: number
          user_id: string
        }[]
      }
      get_top_exercises: {
        Args: { p_limit?: number; p_time_filter?: string }
        Returns: {
          exercise_id: string
          exercise_name: string
          log_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_challengeable_users: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          level: number
          season_rp: number
          season_tier: string
          user_id: string
        }[]
      }
      lookup_user_bodyweight: {
        Args: { _on_date: string; _user_id: string }
        Returns: number
      }
      settle_duel: { Args: { p_duel_id: string }; Returns: undefined }
      settle_season: { Args: { p_season_id: string }; Returns: undefined }
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
