import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { songKeys } from "./keys";
import { Song } from "@/types";

function transformSong(row: any): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    notes: row.notes || "",
    files: row.files || [],
    keyedFiles: row.keyed_files || {},
    keyHistory:
      row.song_keys
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchSongsByOrganization(orgId: string): Promise<Song[]> {
  const { data, error } = await supabase
    .from("songs")
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
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(transformSong);
}

export function useGetSongsByOrganization(orgId?: string) {
  return useQuery({
    queryKey: orgId ? songKeys.list({ orgId }) : songKeys.lists(),
    queryFn: () => fetchSongsByOrganization(orgId as string),
    enabled: Boolean(orgId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
