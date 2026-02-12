import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WeeklyEntry {
  id: string;
  user_id: string;
  week_number: number;
  contest_name: string | null;
  problems_in_contest: number;
  problems_solved_contest: number;
  practice_problems_solved: number;
  created_at: string;
  updated_at: string;
}

export function useWeeklyEntries(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  return useQuery({
    queryKey: ["weekly_entries", targetId],
    queryFn: async () => {
      if (!targetId) return [];
      const { data, error } = await supabase
        .from("weekly_entries")
        .select("*")
        .eq("user_id", targetId)
        .order("week_number", { ascending: true });
      if (error) throw error;
      return data as WeeklyEntry[];
    },
    enabled: !!targetId,
  });
}

export function useSubmitEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entry: { week_number: number; contest_name?: string; problems_solved_contest: number; practice_problems_solved: number }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("weekly_entries")
        .upsert(
          { ...entry, user_id: user.id },
          { onConflict: "user_id,week_number" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly_entries"] });
    },
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weekly_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weekly_entries"] }),
  });
}
