import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { setlistKeys } from "./keys";
import { Setlist } from "@/types";
import { transformSetlists } from "./transform";

export async function fetchSetlistsByOrganization(
  orgId: string
): Promise<Setlist[]> {
  const { data, error } = await supabase
    .from("setlists")
    .select(`*, setlist_songs(*, songs(*))`)
    .eq("organization_id", orgId)
    .order("date", { ascending: false });

  if (error) throw error;
  return transformSetlists(data ?? []);
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
