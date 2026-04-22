// Типы БД. Source of truth для всей схемы.
// Когда схема стабилизируется — можно заменить на автогенерацию:
//   supabase gen types typescript --project-id YOUR_ID > src/types/database.ts

export type UserLevel = 'novice' | 'amateur' | 'advanced' | 'chef' | 'master_chef';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Plan = 'free' | 'pro' | 'family';
export type FriendshipStatus = 'pending' | 'accepted';

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface RecipeStep {
  order: number;
  text: string;
  timer_seconds?: number;
  image_url?: string;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: UserLevel;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_cooked_at: string | null;
  dishes_cooked: number;
  avg_ai_score: number | null;
  plan: Plan;
  is_admin: boolean;
  created_at: string;
}

export interface Recipe {
  id: string;
  author_id: string | null;
  title: string;
  description: string;
  image_url: string | null;
  cuisine: string;
  category: string;
  difficulty: Difficulty;
  prep_time_min: number;
  cook_time_min: number;
  servings: number;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  tags: string[];
  ingredients: Ingredient[];
  steps: RecipeStep[];
  is_ai_generated: boolean;
  likes_count: number;
  cooked_count: number;
  avg_presentation_score: number | null;
  created_at: string;
}

export interface CookSession {
  id: string;
  user_id: string;
  recipe_id: string;
  photo_url: string;
  ai_score: number;
  ai_comment: string;
  xp_earned: number;
  created_at: string;
}

export interface SavedRecipe {
  id: string;
  user_id: string;
  recipe_id: string;
  created_at: string;
}

export interface FeedLike {
  id: string;
  user_id: string;
  cook_session_id: string;
  created_at: string;
}

export interface FeedComment {
  id: string;
  user_id: string;
  cook_session_id: string;
  text: string;
  created_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  created_at: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  condition: Record<string, any>;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

// ============ Helper для insert-типов ============
type PartialInsert<T, Required extends keyof T> = Partial<T> & Pick<T, Required>;

// ============ Supabase Database типизация ============
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: PartialInsert<Profile, 'id' | 'username' | 'display_name'>;
        Update: Partial<Profile>;
      };
      recipes: {
        Row: Recipe;
        Insert: PartialInsert<Recipe, 'title' | 'cuisine' | 'category' | 'difficulty'>;
        Update: Partial<Recipe>;
      };
      cook_sessions: {
        Row: CookSession;
        Insert: PartialInsert<CookSession, 'user_id' | 'recipe_id' | 'photo_url' | 'ai_score' | 'ai_comment' | 'xp_earned'>;
        Update: Partial<CookSession>;
      };
      saved_recipes: {
        Row: SavedRecipe;
        Insert: PartialInsert<SavedRecipe, 'user_id' | 'recipe_id'>;
        Update: Partial<SavedRecipe>;
      };
      feed_likes: {
        Row: FeedLike;
        Insert: PartialInsert<FeedLike, 'user_id' | 'cook_session_id'>;
        Update: Partial<FeedLike>;
      };
      feed_comments: {
        Row: FeedComment;
        Insert: PartialInsert<FeedComment, 'user_id' | 'cook_session_id' | 'text'>;
        Update: Partial<FeedComment>;
      };
      friendships: {
        Row: Friendship;
        Insert: PartialInsert<Friendship, 'user_id' | 'friend_id'>;
        Update: Partial<Friendship>;
      };
      achievements: {
        Row: Achievement;
        Insert: Achievement;
        Update: Partial<Achievement>;
      };
      user_achievements: {
        Row: UserAchievement;
        Insert: PartialInsert<UserAchievement, 'user_id' | 'achievement_id'>;
        Update: Partial<UserAchievement>;
      };
    };

    // ============ RPC функции ============
    // Supabase требует это поле для .rpc() вызовов
    Functions: {
      record_cook_session: {
        Args: {
          p_recipe_id: string;
          p_photo_url: string;
          p_ai_score: number;
          p_ai_comment: string;
        };
        Returns: {
          session_id: string;
          xp_earned: number;
          new_streak: number;
          level_up: boolean;
          new_level: UserLevel;
          new_achievements: Array<{ id: string; xp: number }>;
        };
      };
    };

    Enums: {
      user_level: UserLevel;
      difficulty: Difficulty;
      plan_type: Plan;
      friendship_status: FriendshipStatus;
    };
  };
}
