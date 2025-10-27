import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { setlistKeys } from "./keys";
import { Setlist } from "@/types";
import { transformSetlist } from "./transform";

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
