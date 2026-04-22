import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Recipe } from '@/types/database';

// ============================================================
// Types
// ============================================================

export type RecipeStatus = 'draft' | 'pending' | 'published' | 'rejected';

export interface AdminRecipe extends Recipe {
  status: RecipeStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

export interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
  level: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  dishes_cooked: number;
  avg_ai_score: number | null;
  is_admin: boolean;
  is_blocked: boolean;
  blocked_at: string | null;
  block_reason: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  recipes_count: number;
  cook_sessions_count: number;
}

export interface DashboardStats {
  users_total: number;
  users_blocked: number;
  users_admins: number;
  users_active_24h: number;
  users_new_7d: number;
  recipes_total: number;
  recipes_published: number;
  recipes_pending: number;
  recipes_rejected: number;
  recipes_ugc: number;
  recipes_deleted: number;
  sessions_total: number;
  sessions_24h: number;
  sessions_7d: number;
  avg_score: number | null;
  registrations_chart: Array<{ date: string; count: number }> | null;
  sessions_chart: Array<{ date: string; count: number }> | null;
}

export interface PendingRecipe extends Recipe {
  status: 'pending';
  submitted_at: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

// ============================================================
// Admin check
// ============================================================

export function useIsAdmin(): boolean {
  const profile = useAuthStore((s) => s.profile);
  return (profile as any)?.is_admin === true;
}

// ============================================================
// Moderation — pending recipes queue
// ============================================================

export function usePendingRecipes() {
  const isAdmin = useIsAdmin();

  return useQuery({
    queryKey: ['admin_pending_recipes'],
    enabled: isAdmin,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*, author:profiles!recipes_author_id_fkey(id, username, display_name, avatar_url)')
        .eq('status', 'pending')
        .is('deleted_at', null)
        .order('submitted_at', { ascending: true })
        .returns<PendingRecipe[]>();

      if (error) throw error;
      return data ?? [];
    }
  });
}

export function useApproveRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const { error } = await (supabase as any).rpc('approve_recipe', {
        p_recipe_id: recipeId
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_pending_recipes'] });
      queryClient.invalidateQueries({ queryKey: ['admin_all_recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'feed'] });
    }
  });
}

export function useRejectRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recipeId, reason }: { recipeId: string; reason: string }) => {
      const { error } = await (supabase as any).rpc('reject_recipe', {
        p_recipe_id: recipeId,
        p_reason: reason
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_pending_recipes'] });
      queryClient.invalidateQueries({ queryKey: ['admin_all_recipes'] });
    }
  });
}

// ============================================================
// All recipes management
// ============================================================

export interface RecipesFilters {
  status?: RecipeStatus | 'all' | 'deleted';
  search?: string;
  authorId?: string;
  isUgc?: boolean;
}

export function useAllRecipes(filters: RecipesFilters = {}) {
  const isAdmin = useIsAdmin();

  return useQuery({
    queryKey: ['admin_all_recipes', filters],
    enabled: isAdmin,
    queryFn: async () => {
      let query = supabase
        .from('recipes')
        .select('*, author:profiles!recipes_author_id_fkey(id, username, display_name, avatar_url)')
        .order('created_at', { ascending: false });

      if (filters.status === 'deleted') {
        query = query.not('deleted_at', 'is', null);
      } else if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status).is('deleted_at', null);
      } else {
        query = query.is('deleted_at', null);
      }

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      if (filters.authorId) {
        query = query.eq('author_id', filters.authorId);
      }

      if (filters.isUgc === true) {
        query = query.not('author_id', 'is', null);
      } else if (filters.isUgc === false) {
        query = query.is('author_id', null);
      }

      const { data, error } = await query.returns<AdminRecipe[]>();
      if (error) throw error;
      return data ?? [];
    }
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const { error } = await (supabase as any).rpc('admin_delete_recipe', {
        p_recipe_id: recipeId
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['my_recipes'] });
    }
  });
}

export function useRestoreRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const { error } = await (supabase as any).rpc('admin_restore_recipe', {
        p_recipe_id: recipeId
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_recipes'] });
    }
  });
}

export function useUnpublishRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recipeId, reason }: { recipeId: string; reason: string }) => {
      const { error } = await (supabase as any).rpc('admin_unpublish_recipe', {
        p_recipe_id: recipeId,
        p_reason: reason
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'feed'] });
    }
  });
}

// ============================================================
// Users
// ============================================================

export function useAllUsers() {
  const isAdmin = useIsAdmin();

  return useQuery({
    queryKey: ['admin_all_users'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('admin_list_users');
      if (error) throw new Error(error.message);
      return (data ?? []) as AdminUser[];
    }
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await (supabase as any).rpc('admin_block_user', {
        p_user_id: userId,
        p_reason: reason
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_users'] });
      queryClient.invalidateQueries({ queryKey: ['admin_all_recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'feed'] });
    }
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any).rpc('admin_unblock_user', {
        p_user_id: userId
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_users'] });
    }
  });
}

export function useToggleAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const { error } = await (supabase as any).rpc('admin_toggle_admin', {
        p_user_id: userId,
        p_is_admin: isAdmin
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_users'] });
    }
  });
}

// ============================================================
// Dashboard
// ============================================================

export function useDashboardStats() {
  const isAdmin = useIsAdmin();

  return useQuery({
    queryKey: ['admin_dashboard_stats'],
    enabled: isAdmin,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('admin_dashboard_stats');
      if (error) throw new Error(error.message);
      return data as DashboardStats;
    }
  });
}
