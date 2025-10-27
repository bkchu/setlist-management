import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { setlistKeys } from "./keys";
import { Setlist } from "@/types";
import { transformSetlist } from "./transform";

export type CreateSetlistPayload = {
  name: string;
  date: string;
  organizationId: string;
};

export async function createSetlistServer(
  payload: CreateSetlistPayload
): Promise<Setlist> {
  const { data, error } = await supabase
    .from("setlists")
    .insert([
      {
        name: payload.name,
        date: payload.date,
        organization_id: payload.organizationId,
      },
    ])
    .select(`*, setlist_songs(*, songs(*))`)
    .single();
  if (error) throw error;
  return transformSetlist(data);
}

export function useCreateSetlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSetlistServer,
    onSuccess: (created) => {
      // Prime detail cache
      queryClient.setQueryData(setlistKeys.detail(created.id), created);
      // Optimistically add to any cached list queries
      const cachedLists = queryClient.getQueriesData<Setlist[]>({
        queryKey: setlistKeys.lists(),
      });
      cachedLists.forEach(([key, current]) => {
        if (!current) return;
        const exists = current.some((s) => s.id === created.id);
        if (!exists) {
          queryClient.setQueryData(key, [created, ...current]);
        }
      });
      // Ensure all list queries refetch in background
      queryClient.invalidateQueries({
        queryKey: setlistKeys.lists(),
        refetchType: "all",
      });
    },
  });
}
