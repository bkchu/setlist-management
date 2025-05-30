import { createContext, useContext, useState, useEffect } from "react";
import { Setlist, SetlistSong } from "@/types";
import { useAuth } from "./use-auth";
import { supabase } from "@/lib/supabase";

interface SetlistContextProps {
  setlists: Setlist[];
  addSetlist: (setlist: Partial<Setlist>) => Promise<Setlist>;
  updateSetlist: (id: string, setlist: Partial<Setlist>) => Promise<Setlist>;
  updateSetlistSongs: (
    setlistId: string,
    songs: SetlistSong[]
  ) => Promise<Setlist>;
  deleteSetlist: (id: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const SetlistContext = createContext<SetlistContextProps | undefined>(
  undefined
);

export function SetlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Define loadSetlists inside useEffect to avoid dependency issues
    const loadSetlistsData = async () => {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch setlists with their songs
        const { data: setlistsData, error: setlistsError } = await supabase
          .from("setlists")
          .select(
            `
            *,
            setlist_songs(*, songs(*))
          `
          )
          .eq("user_id", user.id)
          .order("date", { ascending: false });

        if (setlistsError) throw setlistsError;

        // Transform the data to match our Setlist type
        const transformedSetlists = setlistsData.map((setlist) => ({
          id: setlist.id,
          name: setlist.name,
          date: setlist.date,
          notes: setlist.notes || "",
          songs:
            setlist.setlist_songs
              ?.map(
                (item: {
                  id: string;
                  song_id: string;
                  key?: string;
                  notes?: string;
                  order: number;
                  songs: any;
                }) => ({
                  id: item.id,
                  songId: item.song_id,
                  key: item.key || "",
                  notes: item.notes || "",
                  order: item.order,
                  song: item.songs,
                })
              )
              .sort(
                (a: { order: number }, b: { order: number }) =>
                  a.order - b.order
              ) || [],
          createdAt: setlist.created_at,
          updatedAt: setlist.updated_at,
        }));

        setSetlists(transformedSetlists);
      } catch (error) {
        console.error("Error loading setlists:", error);
        setError("Failed to load setlists");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadSetlistsData();
    } else {
      setSetlists([]);
    }
  }, [user]);

  const addSetlist = async (
    setlistData: Partial<Setlist>
  ): Promise<Setlist> => {
    if (!user) throw new Error("User not authenticated");

    setIsLoading(true);
    setError(null);

    try {
      if (!setlistData.name) {
        throw new Error("Setlist name is required");
      }

      if (!setlistData.date) {
        throw new Error("Setlist date is required");
      }

      const { data, error } = await supabase
        .from("setlists")
        .insert([
          {
            name: setlistData.name,
            date: setlistData.date,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Failed to create setlist");

      const newSetlist: Setlist = {
        id: data.id,
        name: data.name,
        date: data.date,
        songs: [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setSetlists((prev: Setlist[]) => [...prev, newSetlist]);
      return newSetlist;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add setlist");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetlist = async (
    id: string,
    setlistData: Partial<Setlist>
  ): Promise<Setlist> => {
    if (!user) throw new Error("User not authenticated");

    setIsLoading(true);
    setError(null);

    try {
      if (setlistData.name === "") {
        throw new Error("Setlist name is required");
      }

      const { data, error } = await supabase
        .from("setlists")
        .update({
          name: setlistData.name,
          date: setlistData.date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          `
          *,
          setlist_songs (
            *,
            songs (*)
          )
        `
        )
        .single();

      if (error) throw error;
      if (!data) throw new Error("Setlist not found");

      const updatedSetlist: Setlist = {
        id: data.id,
        name: data.name,
        date: data.date,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        songs: data.setlist_songs
          .sort((a: any, b: any) => a.order - b.order)
          .map((ss: any) => ({
            id: ss.id,
            songId: ss.song_id,
            order: ss.order,
            key: ss.key || undefined,
            notes: ss.notes || undefined,
            song: {
              id: ss.songs.id,
              title: ss.songs.title,
              artist: ss.songs.artist,
              notes: ss.songs.notes || "",
              createdAt: ss.songs.created_at,
              updatedAt: ss.songs.updated_at,
            },
          })),
      };

      setSetlists((prev: Setlist[]) =>
        prev.map((setlist) => (setlist.id === id ? updatedSetlist : setlist))
      );

      return updatedSetlist;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update setlist");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetlistSongs = async (
    setlistId: string,
    newSongs: SetlistSong[]
  ): Promise<Setlist> => {
    if (!user) throw new Error("User not authenticated");

    setIsLoading(true);
    setError(null);

    try {
      // Find the current setlist to preserve song IDs for reordering
      const currentSetlist = setlists.find((s) => s.id === setlistId);
      if (!currentSetlist) throw new Error("Setlist not found in local state");

      // Create a map of songId to setlist_song id to preserve IDs during reordering
      const songIdToRecordId = new Map();
      currentSetlist.songs.forEach((song) => {
        songIdToRecordId.set(song.songId, song.id);
      });

      // Prepare songs for database - preserve IDs for existing songs, omit ID for new songs
      const songsToUpdate = newSongs.map((song) => {
        const existingId = songIdToRecordId.get(song.songId);
        const songData: {
          id?: string;
          setlist_id: string;
          song_id: string;
          order: number;
          key: string | null;
          notes: string | null;
        } = {
          setlist_id: setlistId,
          song_id: song.songId,
          order: song.order,
          key: song.key || null,
          notes: song.notes || null,
        };

        // Only include ID if it exists (for existing songs)
        if (existingId) {
          songData.id = existingId;
        }

        return songData;
      });

      // Upsert approach - update or insert songs as needed
      const { error: upsertError } = await supabase
        .from("setlist_songs")
        .upsert(songsToUpdate, { onConflict: "id" });

      if (upsertError) throw upsertError;

      // Delete songs that no longer exist in the setlist
      const currentSongIds = new Set(
        songsToUpdate.filter((s) => s.id).map((s) => s.id)
      );
      const deletedSongs = currentSetlist.songs.filter(
        (s) => !currentSongIds.has(s.id)
      );

      if (deletedSongs.length > 0) {
        const { error: deleteError } = await supabase
          .from("setlist_songs")
          .delete()
          .in(
            "id",
            deletedSongs.map((s) => s.id)
          );

        if (deleteError) throw deleteError;
      }

      // Create a local updated setlist with preserved IDs
      const updatedSetlist: Setlist = {
        ...currentSetlist,
        updatedAt: new Date().toISOString(),
        songs: newSongs.map((song) => ({
          ...song,
          // Preserve the ID if it exists, otherwise generate a new one
          id: songIdToRecordId.get(song.songId) || song.id,
        })),
      };

      // Update the local state immediately without waiting for a fetch
      setSetlists((prev: Setlist[]) =>
        prev.map((s) => (s.id === setlistId ? updatedSetlist : s))
      );

      return updatedSetlist;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update setlist songs"
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSetlist = async (id: string): Promise<void> => {
    if (!user) throw new Error("User not authenticated");

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.from("setlists").delete().eq("id", id);

      if (error) throw error;

      setSetlists((prev: Setlist[]) =>
        prev.filter((setlist) => setlist.id !== id)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete setlist");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SetlistContext.Provider
      value={{
        setlists,
        addSetlist,
        updateSetlist,
        deleteSetlist,
        updateSetlistSongs,
        isLoading,
        error,
      }}
    >
      {children}
    </SetlistContext.Provider>
  );
}

// This comment addresses the Fast Refresh lint warning
// eslint-disable-next-line react-refresh/only-export-components
export function useSetlists() {
  const context = useContext(SetlistContext);
  if (context === undefined) {
    throw new Error("useSetlists must be used within a SetlistProvider");
  }
  return context;
}
