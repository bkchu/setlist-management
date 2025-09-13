import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { songKeys } from "./keys";
import { Song } from "@/types";

export async function updateSongServer(
  id: string,
  payload: Partial<Song>
): Promise<Song> {
  const { data, error } = await supabase
    .from("songs")
    .update({
      title: payload.title,
      artist: payload.artist,
      notes: payload.notes,
      files: payload.files,
      keyed_files: payload.keyedFiles,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      `
        *,
        song_keys (
          id,
          key,
          played_at,
          setlist_id,
          setlists (
            name
          )
        )
      `
    )
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    artist: data.artist,
    notes: data.notes || "",
    files: data.files || [],
    keyedFiles: data.keyed_files || {},
    keyHistory:
      data.song_keys
        ?.map((key: any) => ({
          id: key.id,
          key: key.key,
          playedAt: key.played_at,
          setlistId: key.setlist_id,
          setlistName: key.setlists?.name,
        }))
        .sort(
          (a: any, b: any) =>
            new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
        ) || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function useUpdateSong(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Song>) => updateSongServer(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(songKeys.detail(id), updated);
      qc.invalidateQueries({ queryKey: songKeys.detail(id) });
      qc.invalidateQueries({ queryKey: songKeys.all });
    },
  });
}
