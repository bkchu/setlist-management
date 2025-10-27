import { Setlist } from "@/types";
import { Tables } from "@/types/supabase";

type SupabaseSongRow = Tables<"songs">;
type SupabaseSetlistSongJoined = Tables<"setlist_songs"> & {
  songs: SupabaseSongRow;
};
type SupabaseSetlistRow = Tables<"setlists">;
type SupabaseSetlistJoined = SupabaseSetlistRow & {
  setlist_songs?: SupabaseSetlistSongJoined[] | null;
};

export function transformSetlist(data: SupabaseSetlistJoined): Setlist {
  return {
    id: data.id,
    name: data.name,
    date: data.date,
    songs:
      data.setlist_songs
        ?.map((item) => ({
          id: item.id,
          songId: item.song_id,
          title: item.songs.title,
          artist: item.songs.artist,
          key: item.key || "",
          notes: item.notes || "",
          order: item.order,
          song: {
            id: item.songs.id,
            title: item.songs.title,
            artist: item.songs.artist,
            notes: item.songs.notes || "",
            createdAt: item.songs.created_at ?? "",
            updatedAt: item.songs.updated_at ?? "",
          },
        }))
        .sort((a, b) => a.order - b.order) || [],
    createdAt: data.created_at ?? "",
    updatedAt: data.updated_at ?? "",
  };
}

export function transformSetlists(data: SupabaseSetlistJoined[]): Setlist[] {
  return (data ?? []).map(transformSetlist);
}
