import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface UserSettingsRow {
  id: string;
  user_id: string;
  one_touch_songs: { songIds: string[] } | null;
}

export const settingsKeys = {
  all: ["settings"] as const,
  detail: (userId: string | undefined) => ["settings", userId] as const,
};

export async function fetchUserSettings(userId: string) {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as UserSettingsRow | null) ?? null;
}

export function useGetUserSettings(userId?: string) {
  return useQuery({
    queryKey: settingsKeys.detail(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchUserSettings(userId as string),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 2,
  });
}
