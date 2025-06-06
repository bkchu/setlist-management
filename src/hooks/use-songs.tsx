import { createContext, useContext, useState, useEffect } from "react";
import { Song } from "@/types";
import { useAuth } from "./use-auth";
import { supabase } from "@/lib/supabase";
import { toast } from "./use-toast";

interface SongContextProps {
  songs: Song[];
  addSong: (song: Partial<Song>) => Promise<Song>;
  updateSong: (id: string, song: Partial<Song>) => Promise<Song>;
  deleteSong: (id: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const SongContext = createContext<SongContextProps | undefined>(undefined);

export function SongProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSongs();
    } else {
      setSongs([]);
    }
  }, [user]);

  const loadSongs = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch songs with their key history
      const { data: songsData, error: songsError } = await supabase
        .from("songs")
        .select(
          `
          *,
          song_keys (
            id,
            key,
            played_at,
            setlist_id,
            setlists (
              name
            )
          )
        `
        )
        .order("created_at", { ascending: false });

      if (songsError) throw songsError;

      setSongs(
        songsData.map((song) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          notes: song.notes || "",
          files: song.files || [],
          keyedFiles: song.keyed_files || {},
          keyHistory:
            song.song_keys
              ?.map((key) => ({
                id: key.id,
                key: key.key,
                playedAt: key.played_at,
                setlistId: key.setlist_id,
                setlistName: key.setlists?.name,
              }))
              .sort(
                (a, b) =>
                  new Date(b.playedAt).getTime() -
                  new Date(a.playedAt).getTime()
              ) || [],
          createdAt: song.created_at,
          updatedAt: song.updated_at,
        }))
      );
    } catch (err) {
      setError("Failed to load songs");
      toast({
        title: "Error",
        description: "Failed to load songs",
        variant: "destructive",
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const addSong = async (songData: Partial<Song>): Promise<Song> => {
    if (!user) throw new Error("User not authenticated");

    setIsLoading(true);
    setError(null);

    try {
      if (!songData.title) {
        throw new Error("Song title is required");
      }

      const { data, error } = await supabase
        .from("songs")
        .insert([
          {
            title: songData.title,
            artist: songData.artist || "",
            notes: songData.notes || "",
            files: songData.files || [],
            keyed_files: songData.keyedFiles || {},
            user_id: user.id,
          },
        ])
        .select(
          `
          *,
          song_keys (
            id,
            key,
            played_at,
            setlist_id,
            setlists (
              name
            )
          )
        `
        )
        .single();

      if (error) throw error;
      if (!data) throw new Error("Failed to create song");

      const newSong: Song = {
        id: data.id,
        title: data.title,
        artist: data.artist,
        notes: data.notes || "",
        files: data.files || [],
        keyedFiles: data.keyed_files || {},
        keyHistory:
          data.song_keys?.map((key) => ({
            id: key.id,
            key: key.key,
            playedAt: key.played_at,
            setlistId: key.setlist_id,
            setlistName: key.setlists?.name,
          })) || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setSongs((prev) => [newSong, ...prev]);
      return newSong;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add song");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSong = async (
    id: string,
    songData: Partial<Song>
  ): Promise<Song> => {
    if (!user) throw new Error("User not authenticated");

    setIsLoading(true);
    setError(null);

    try {
      if (songData.title === "") {
        throw new Error("Song title is required");
      }

      const { data, error } = await supabase
        .from("songs")
        .update({
          title: songData.title,
          artist: songData.artist,
          notes: songData.notes,
          files: songData.files,
          keyed_files: songData.keyedFiles,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          `
          *,
          song_keys (
            id,
            key,
            played_at,
            setlist_id,
            setlists (
              name
            )
          )
        `
        )
        .single();

      if (error) throw error;
      if (!data) throw new Error("Song not found");

      const updatedSong: Song = {
        id: data.id,
        title: data.title,
        artist: data.artist,
        notes: data.notes || "",
        files: data.files || [],
        keyedFiles: data.keyed_files || {},
        keyHistory:
          data.song_keys
            ?.map((key) => ({
              id: key.id,
              key: key.key,
              playedAt: key.played_at,
              setlistId: key.setlist_id,
              setlistName: key.setlists?.name,
            }))
            .sort(
              (a, b) =>
                new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
            ) || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setSongs((prev) =>
        prev.map((song) => (song.id === id ? updatedSong : song))
      );

      return updatedSong;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update song");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSong = async (id: string): Promise<void> => {
    if (!user) throw new Error("User not authenticated");

    setIsLoading(true);
    setError(null);

    try {
      // Get the song to delete its files first
      const songToDelete = songs.find((s) => s.id === id);

      // Collect all file paths from both old files and keyed files
      const filePaths: string[] = [];

      // Add paths from old files structure
      if (songToDelete?.files?.length) {
        filePaths.push(...songToDelete.files.map((f) => f.path));
      }

      // Add paths from keyed files structure
      if (songToDelete?.keyedFiles) {
        Object.values(songToDelete.keyedFiles).forEach((keyFiles) => {
          if (keyFiles?.length) {
            filePaths.push(...keyFiles.map((f) => f.path));
          }
        });
      }

      // Remove all files from storage
      if (filePaths.length > 0) {
        await supabase.storage.from("song-files").remove(filePaths);
      }

      const { error } = await supabase.from("songs").delete().eq("id", id);

      if (error) throw error;

      setSongs((prev) => prev.filter((song) => song.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete song");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SongContext.Provider
      value={{ songs, addSong, updateSong, deleteSong, isLoading, error }}
    >
      {children}
    </SongContext.Provider>
  );
}

export function useSongs() {
  const context = useContext(SongContext);
  if (context === undefined) {
    throw new Error("useSongs must be used within a SongProvider");
  }
  return context;
}
