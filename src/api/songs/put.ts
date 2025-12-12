import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { songKeys } from "./keys";
import { Song } from "@/types";
import { Tables } from "@/types/supabase";

type SongKeyRow = {
  id: string;
  key: string;
  played_at: string;
  setlist_id: string;
  setlists?: { name?: string } | null;
};

type SongRow = Tables<"songs"> & { song_keys?: SongKeyRow[] | null };

export async function updateSongServer(
  id: string,
  payload: Partial<Song>
): Promise<Song> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.artist !== undefined) updateData.artist = payload.artist;
  if (payload.notes !== undefined) updateData.notes = payload.notes;
  if (payload.files !== undefined) updateData.files = payload.files;
  if (payload.keyedFiles !== undefined)
    updateData.keyed_files = payload.keyedFiles;
  if (payload.defaultSectionOrder !== undefined)
    updateData.default_section_order = payload.defaultSectionOrder;

  const { data, error } = await supabase
    .from("songs")
    .update(updateData)
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

  const row = data as SongRow;

  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    notes: row.notes || "",
    files: (row.files as unknown as Song["files"]) || [],
    keyedFiles: (row.keyed_files as unknown as Song["keyedFiles"]) || {},
    defaultSectionOrder:
      (row.default_section_order as unknown as Song["defaultSectionOrder"]) ||
      undefined,
    keyHistory:
      row.song_keys
        ?.map((key: SongKeyRow) => ({
          id: key.id,
          key: key.key,
          playedAt: key.played_at,
          setlistId: key.setlist_id,
          setlistName: key.setlists?.name ?? "",
        }))
        .sort(
          (a, b) =>
            new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
        ) || [],
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

export type UpdateSongVariables = { id: string; payload: Partial<Song> };

export function useUpdateSong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: UpdateSongVariables) =>
      updateSongServer(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(songKeys.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: songKeys.lists() });
    },
  });
}
