import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { songKeys } from "./keys";
import { Song } from "@/types";

export type CreateSongPayload = {
  title: string;
  artist?: string;
  notes?: string;
  files?: Song["files"];
  keyedFiles?: Song["keyedFiles"];
  organizationId: string;
};

export async function createSongServer(
  payload: CreateSongPayload
): Promise<Song> {
  const { data, error } = await supabase
    .from("songs")
    .insert([
      {
        title: payload.title,
        artist: payload.artist ?? "",
        notes: payload.notes ?? "",
        files: payload.files ?? [],
        keyed_files: payload.keyedFiles ?? {},
        organization_id: payload.organizationId,
      },
    ])
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
      (data.song_keys || []).map(
        (key: {
          id: string;
          key: string;
          played_at: string;
          setlist_id: string;
          setlists?: { name?: string } | null;
        }) => ({
          id: key.id,
          key: key.key,
          playedAt: key.played_at,
          setlistId: key.setlist_id,
          setlistName: key.setlists?.name || "",
        })
      ) || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function useCreateSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSongServer,
    onSuccess: (created) => {
      // Prime detail cache and update lists
      queryClient.setQueryData(songKeys.detail(created.id), created);
      queryClient.invalidateQueries({ queryKey: songKeys.lists() });
    },
  });
}





