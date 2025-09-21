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

export async function fetchSetlistsByOrganization(
  orgId: string
): Promise<Setlist[]> {
  const { data, error } = await supabase
    .from("setlists")
    .select(`*, setlist_songs(*, songs(*))`)
    .eq("organization_id", orgId)
    .order("date", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(transformSetlist);
}

export function useGetSetlistsByOrganization(orgId?: string) {
  return useQuery({
    queryKey: orgId ? setlistKeys.list({ orgId }) : setlistKeys.lists(),
    queryFn: () => fetchSetlistsByOrganization(orgId as string),
    enabled: Boolean(orgId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
