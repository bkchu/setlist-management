import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { setlistKeys } from "./keys";
import { Setlist, SetlistSong } from "@/types";

export type UpdateSetlistPayload = Partial<Pick<Setlist, "name" | "date">> & {
  songs?: SetlistSong[];
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
  return {
    id: data.id,
    name: data.name,
    date: data.date,
    songs:
      data.setlist_songs
        ?.map((item: any) => ({
          id: item.id,
          songId: item.song_id,
          key: item.key || "",
          notes: item.notes || "",
          order: item.order,
          song: {
            id: item.songs.id,
            title: item.songs.title,
            artist: item.songs.artist,
            notes: item.songs.notes || "",
            createdAt: item.songs.created_at,
            updatedAt: item.songs.updated_at,
          },
        }))
        .sort((a: any, b: any) => a.order - b.order) || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function useUpdateSetlist(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSetlistPayload) =>
      updateSetlistServer(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(setlistKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: setlistKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: setlistKeys.songs(id) });
      queryClient.invalidateQueries({ queryKey: setlistKeys.all });
    },
  });
}
