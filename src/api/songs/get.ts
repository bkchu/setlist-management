import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { songKeys } from "./keys";
import { Song } from "@/types";
import { signSongFilePath } from "@/lib/storage";

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

export async function fetchSongById(id: string): Promise<Song> {
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
    .eq("id", id)
    .single();

  if (error) throw error;
  return transformSong(data);
}

export type UseGetSongProps = { songId?: string };

export function useGetSong({ songId }: UseGetSongProps) {
  return useQuery({
    queryKey: songId ? songKeys.detail(songId) : songKeys.all,
    queryFn: () => fetchSongById(songId as string),
    enabled: Boolean(songId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

export function useGetSignedSongFileUrl({
  path,
  version,
  expiresIn = 3600,
}: {
  path?: string;
  version?: string | number; // updatedAt or file hash
  expiresIn?: number;
}) {
  const staleTime = Math.max(
    0,
    Math.min(expiresIn * 1000 - 30_000, 5 * 60 * 1000)
  );
  return useQuery({
    queryKey: path
      ? songKeys.fileUrl(path, version)
      : songKeys.fileUrl("", version),
    queryFn: async () => {
      const url = await signSongFilePath(path as string, expiresIn);
      return { url, expiresAt: Date.now() + expiresIn * 1000 } as const;
    },
    enabled: Boolean(path),
    staleTime,
    // Keep entries beyond expiry to reuse meta and avoid thrash; invalidated by version change
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
