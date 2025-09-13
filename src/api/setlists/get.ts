import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { setlistKeys } from "./keys";
import { Setlist } from "@/types";

function transformSetlist(data: any): Setlist {
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

export async function fetchSetlistById(id: string): Promise<Setlist> {
  const { data, error } = await supabase
    .from("setlists")
    .select(`*, setlist_songs(*, songs(*))`)
    .eq("id", id)
    .single();

  if (error) throw error;
  return transformSetlist(data);
}

export type UseGetSetlistProps = { setlistId?: string };

export function useGetSetlist({ setlistId }: UseGetSetlistProps) {
  return useQuery({
    queryKey: setlistId ? setlistKeys.detail(setlistId) : setlistKeys.all,
    queryFn: () => fetchSetlistById(setlistId as string),
    enabled: Boolean(setlistId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
