import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { settingsKeys } from "./get";

export interface UpdateSettingsPayload {
  userId: string;
  oneTouchSongs: { songIds: string[] };
}

export async function upsertUserSettings({
  userId,
  oneTouchSongs,
}: UpdateSettingsPayload) {
  // First check if a record exists
  const { data: existing } = await supabase
    .from("user_settings")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("user_settings")
      .update({
        one_touch_songs: oneTouchSongs,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("user_settings").insert({
      user_id: userId,
      one_touch_songs: oneTouchSongs,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  return { userId, oneTouchSongs } as const;
}

export function useUpdateUserSettings(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { oneTouchSongs: { songIds: string[] } }) =>
      upsertUserSettings({ userId, oneTouchSongs: payload.oneTouchSongs }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: settingsKeys.detail(userId) });
    },
  });
}
