import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { setlistKeys } from "./keys";

export async function deleteSetlistServer(id: string): Promise<void> {
  const { error } = await supabase.from("setlists").delete().eq("id", id);
  if (error) throw error;
}

export function useDeleteSetlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSetlistServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: setlistKeys.lists() });
    },
  });
}
