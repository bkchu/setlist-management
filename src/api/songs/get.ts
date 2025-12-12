import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { songKeys } from "./keys";
import { Song } from "@/types";
import { Tables } from "@/types/supabase";
import { signSongFilePath } from "@/lib/storage";

type SongKeyRow = {
  id: string;
  key: string;
  played_at: string;
  setlist_id: string;
  setlists?: { name?: string } | null;
};

type SongRow = Tables<"songs"> & { song_keys?: SongKeyRow[] | null };

function transformSong(row: SongRow): Song {
  const files = (row.files as unknown as Song["files"]) || [];
  const keyedFiles = (row.keyed_files as unknown as Song["keyedFiles"]) || {};
  const defaultSectionOrder =
    (row.default_section_order as unknown as Song["defaultSectionOrder"]) ||
    undefined;

  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    notes: row.notes || "",
    files,
    keyedFiles,
    defaultSectionOrder,
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
