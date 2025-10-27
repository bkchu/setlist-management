import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { setlistKeys } from "./keys";
import { Setlist, SetlistSong } from "@/types";
import { transformSetlist } from "./transform";

export type UpdateSetlistPayload = Partial<Pick<Setlist, "name" | "date">> & {
  songs?: SetlistSong[];
};

export type UpdateSetlistVariables = {
  id: string;
  payload: UpdateSetlistPayload;
};

export async function updateSetlistServer(
  id: string,
  payload: UpdateSetlistPayload
): Promise<Setlist> {
  // Update setlist metadata
  if (payload.name !== undefined || payload.date !== undefined) {
    const { error: updateError } = await supabase
      .from("setlists")
      .update({
        name: payload.name,
        date: payload.date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (updateError) throw updateError;
  }

  // If songs provided, upsert/delete accordingly
  if (payload.songs) {
    const newSongs = payload.songs;

    // Load current setlist songs
    const { data: existing, error: existingError } = await supabase
      .from("setlist_songs")
      .select("id, song_id")
      .eq("setlist_id", id);
    if (existingError) throw existingError;

    const songIdToRecordId = new Map<string, string>();
    (existing || []).forEach((row) =>
      songIdToRecordId.set(row.song_id, row.id)
    );

    const existingSongs: Array<{
      id: string;
      setlist_id: string;
      song_id: string;
      order: number;
      key: string | null;
      notes: string | null;
    }> = [];

    const newSongsToInsert: Array<{
      setlist_id: string;
      song_id: string;
      order: number;
      key: string | null;
      notes: string | null;
    }> = [];

    newSongs.forEach((song) => {
      const existingRecordId = songIdToRecordId.get(song.songId);
      if (existingRecordId) {
        existingSongs.push({
          id: existingRecordId,
          setlist_id: id,
          song_id: song.songId,
          order: song.order,
          key: song.key || null,
          notes: song.notes || null,
        });
      } else {
        newSongsToInsert.push({
          setlist_id: id,
          song_id: song.songId,
          order: song.order,
          key: song.key || null,
          notes: song.notes || null,
        });
      }
    });

    // Delete removed songs
    const newSongIds = new Set(newSongs.map((s) => s.songId));
    const toDelete = (existing || [])
      .filter((s) => !newSongIds.has(s.song_id))
      .map((s) => s.id);
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("setlist_songs")
        .delete()
        .in("id", toDelete);
      if (deleteError) throw deleteError;
    }

    // Update existing
    if (existingSongs.length > 0) {
      const { error: updateSongsError } = await supabase
        .from("setlist_songs")
        .upsert(existingSongs, { onConflict: "id" });
      if (updateSongsError) throw updateSongsError;
    }

    // Insert new
    if (newSongsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("setlist_songs")
        .insert(newSongsToInsert);
      if (insertError) throw insertError;
    }
  }

  // Return fresh setlist
  const { data, error } = await supabase
    .from("setlists")
    .select(`*, setlist_songs(*, songs(*))`)
    .eq("id", id)
    .single();
  if (error) throw error;
  return transformSetlist(data);
}

export function useUpdateSetlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: UpdateSetlistVariables) =>
      updateSetlistServer(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(setlistKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: setlistKeys.lists() });
    },
  });
}
