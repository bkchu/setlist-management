import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { songKeys } from "./keys";

export async function deleteSongServer(id: string): Promise<void> {
  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (error) throw error;
}

export function useDeleteSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSongServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: songKeys.lists() });
    },
  });
}

