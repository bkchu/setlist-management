import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Setlist, SetlistSong } from "@/types";
import { useAuth } from "./use-auth";
import { supabase } from "@/lib/supabase";
import { useGetSetlistsByOrganization } from "@/api/setlists/list";

// TypeScript interfaces for Supabase response types
interface SupabaseSetlistSong {
  id: string;
  song_id: string;
  setlist_id: string;
  order: number;
  key?: string | null;
  notes?: string | null;
  songs: SupabaseSong;
}

interface SupabaseSong {
  id: string;
  title: string;
  artist: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

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

// transformSetlist no longer needed; list data comes from API hook

// Helper function to transform setlist song data
const transformSetlistSong = (ss: SupabaseSetlistSong): SetlistSong => ({
  id: ss.id,
  songId: ss.song_id,
  order: ss.order,
  key: ss.key || undefined,
  notes: ss.notes || undefined,
  title: ss.songs.title,
  artist: ss.songs.artist,
  files: [],
  keyedFiles: {},
  song: {
    id: ss.songs.id,
    title: ss.songs.title,
    artist: ss.songs.artist,
    files: [],
    keyedFiles: {},
  },
});

export function SetlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    data: setlistsData,
    isLoading: setlistsLoading,
    error: setlistsError,
  } = useGetSetlistsByOrganization(user?.organizationId);

  useEffect(() => {
    if (!user?.organizationId) {
      setSetlists([]);
      setIsLoading(false);
      return;
    }
    if (setlistsLoading !== isLoading) setIsLoading(setlistsLoading);
  }, [user?.organizationId, setlistsLoading, isLoading]);

  useEffect(() => {
    if ((setlistsError as unknown as Error | null)?.message && !error) {
      setError((setlistsError as unknown as Error).message);
    }
  }, [setlistsError, error]);

  useEffect(() => {
    if (setlistsData && setlists !== setlistsData) setSetlists(setlistsData);
  }, [setlistsData, setlists]);

  // Memoized function to add a new setlist
  const addSetlist = useCallback(
    async (setlistData: Partial<Setlist>): Promise<Setlist> => {
      if (!user?.organizationId)
        throw new Error("User not authenticated or no organization");

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
              organization_id: user.organizationId,
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

        setSetlists((prev) => [...prev, newSetlist]);
        return newSetlist;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add setlist");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  // Memoized function to update a setlist
  const updateSetlist = useCallback(
    async (id: string, setlistData: Partial<Setlist>): Promise<Setlist> => {
      if (!user?.organizationId)
        throw new Error("User not authenticated or no organization");

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
            .sort(
              (a: SupabaseSetlistSong, b: SupabaseSetlistSong) =>
                a.order - b.order
            )
            .map(transformSetlistSong),
        };

        setSetlists((prev) =>
          prev.map((setlist) => (setlist.id === id ? updatedSetlist : setlist))
        );

        return updatedSetlist;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update setlist"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  // Memoized function to update setlist songs with smooth animations
  const updateSetlistSongs = useCallback(
    async (setlistId: string, newSongs: SetlistSong[]): Promise<Setlist> => {
      if (!user?.organizationId)
        throw new Error("User not authenticated or no organization");

      setIsLoading(true);
      setError(null);

      try {
        // Find the current setlist to preserve existing song IDs
        const currentSetlist = setlists.find((s) => s.id === setlistId);
        if (!currentSetlist)
          throw new Error("Setlist not found in local state");

        // Create maps for tracking existing songs
        const songIdToRecordId = new Map<string, string>();
        currentSetlist.songs.forEach((song) => {
          songIdToRecordId.set(song.songId, song.id);
        });

        // Separate existing songs from new songs
        const existingSongs: Array<{
          id: string;
          setlist_id: string;
          song_id: string;
          order: number;
          key: string | null;
          notes: string | null;
        }> = [];

        const newSongsToInsert: Array<{
          setlist_id: string;
          song_id: string;
          order: number;
          key: string | null;
          notes: string | null;
        }> = [];

        newSongs.forEach((song) => {
          const existingRecordId = songIdToRecordId.get(song.songId);
          if (existingRecordId) {
            // This is an existing song - preserve its ID
            existingSongs.push({
              id: existingRecordId,
              setlist_id: setlistId,
              song_id: song.songId,
              order: song.order,
              key: song.key || null,
              notes: song.notes || null,
            });
          } else {
            // This is a new song - don't include ID, let database generate it
            newSongsToInsert.push({
              setlist_id: setlistId,
              song_id: song.songId,
              order: song.order,
              key: song.key || null,
              notes: song.notes || null,
            });
          }
        });

        // Delete songs that are no longer in the setlist
        const newSongIds = new Set(newSongs.map((s) => s.songId));
        const songsToDelete = currentSetlist.songs.filter(
          (s) => !newSongIds.has(s.songId)
        );

        if (songsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from("setlist_songs")
            .delete()
            .in(
              "id",
              songsToDelete.map((s) => s.id)
            );

          if (deleteError) throw deleteError;
        }

        // Update existing songs
        if (existingSongs.length > 0) {
          const { error: updateError } = await supabase
            .from("setlist_songs")
            .upsert(existingSongs, { onConflict: "id" });

          if (updateError) throw updateError;
        }

        // Insert new songs and get their generated IDs
        let insertedSongs: SupabaseSetlistSong[] = [];
        if (newSongsToInsert.length > 0) {
          const { data, error: insertError } = await supabase
            .from("setlist_songs")
            .insert(newSongsToInsert).select(`
            *,
            songs (*)
          `);

          if (insertError) throw insertError;
          insertedSongs = data || [];
        }

        // Build the updated songs list preserving existing IDs and using new database IDs
        const updatedSongs: SetlistSong[] = newSongs.map((song) => {
          const existingRecordId = songIdToRecordId.get(song.songId);

          if (existingRecordId) {
            // Use existing ID and song data
            return {
              ...song,
              id: existingRecordId,
            };
          } else {
            // Find the inserted song with the database-generated ID
            const insertedSong = insertedSongs.find(
              (inserted) =>
                inserted.song_id === song.songId &&
                inserted.order === song.order
            );

            return {
              ...song,
              id: insertedSong?.id || song.id, // Fallback to original ID if not found
            };
          }
        });

        // Update local state with preserved and new IDs
        const updatedSetlist: Setlist = {
          ...currentSetlist,
          updatedAt: new Date().toISOString(),
          songs: updatedSongs,
        };

        setSetlists((prev) =>
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
    },
    [user, setlists]
  );

  // Memoized function to delete a setlist
  const deleteSetlist = useCallback(
    async (id: string): Promise<void> => {
      if (!user?.organizationId)
        throw new Error("User not authenticated or no organization");

      setIsLoading(true);
      setError(null);

      try {
        const { error } = await supabase.from("setlists").delete().eq("id", id);

        if (error) throw error;

        setSetlists((prev) => prev.filter((setlist) => setlist.id !== id));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete setlist"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      setlists,
      addSetlist,
      updateSetlist,
      deleteSetlist,
      updateSetlistSongs,
      isLoading,
      error,
    }),
    [
      setlists,
      addSetlist,
      updateSetlist,
      deleteSetlist,
      updateSetlistSongs,
      isLoading,
      error,
    ]
  );

  return (
    <SetlistContext.Provider value={contextValue}>
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
