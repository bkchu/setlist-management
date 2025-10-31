import React, { createContext, useContext, useCallback, useMemo } from "react";
import { Song } from "@/types";
import type { SongFile } from "@/types";
import { useAuth } from "./use-auth";
import { supabase } from "@/lib/supabase";
import { useGetSongsByOrganization } from "@/api/songs/list";
import { useQueryClient } from "@tanstack/react-query";
import { songKeys } from "@/api/songs/keys";
import { createSongServer } from "@/api/songs/post";
import { updateSongServer } from "@/api/songs/put";
import { deleteSongServer } from "@/api/songs/delete";

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
  const {
    data: songsData,
    isLoading: songsLoading,
    error: songsError,
  } = useGetSongsByOrganization(user?.organizationId);
  const queryClient = useQueryClient();
  const songs = useMemo(() => songsData ?? [], [songsData]);
  const error = songsError
    ? (songsError as unknown as Error)?.message ?? "Failed to load songs"
    : null;
  const isLoading = songsLoading;

  const addSong = useCallback(
    async (songData: Partial<Song>): Promise<Song> => {
      if (!user?.organizationId)
        throw new Error("User not authenticated or no organization");
      if (!songData.title) {
        throw new Error("Song title is required");
      }

      const created = await createSongServer({
        title: songData.title,
        artist: songData.artist,
        notes: songData.notes,
        files: songData.files,
        keyedFiles: songData.keyedFiles,
        organizationId: user.organizationId,
      });

      queryClient.setQueryData(songKeys.detail(created.id), created);
      queryClient.invalidateQueries({ queryKey: songKeys.lists() });
      return created;
    },
    [user?.organizationId, queryClient]
  );

  const updateSong = useCallback(
    async (id: string, songData: Partial<Song>): Promise<Song> => {
      if (!user?.organizationId)
        throw new Error("User not authenticated or no organization");
      if (songData.title === "") {
        throw new Error("Song title is required");
      }

      const updated = await updateSongServer(id, songData);
      queryClient.setQueryData(songKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: songKeys.lists() });
      return updated;
    },
    [user?.organizationId, queryClient]
  );

  const deleteSong = useCallback(
    async (id: string): Promise<void> => {
      if (!user?.organizationId)
        throw new Error("User not authenticated or no organization");
      // Get the song to delete its files first
      const songToDelete = songs.find((s) => s.id === id);

      // Collect all file paths from both old files and keyed files
      const filePaths: string[] = [];

      if (songToDelete?.files?.length) {
        filePaths.push(...songToDelete.files.map((f) => f.path));
      }

      if (songToDelete?.keyedFiles) {
        Object.values(songToDelete.keyedFiles).forEach(
          (keyFiles: SongFile[] | undefined) => {
            if (keyFiles?.length) {
              filePaths.push(...keyFiles.map((f: SongFile) => f.path));
            }
          }
        );
      }

      if (filePaths.length > 0) {
        await supabase.storage.from("song-files").remove(filePaths);
      }

      await deleteSongServer(id);
      queryClient.invalidateQueries({ queryKey: songKeys.lists() });
    },
    [user?.organizationId, songs, queryClient]
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<SongContextProps>(
    () => ({
      songs,
      addSong,
      updateSong,
      deleteSong,
      isLoading,
      error,
    }),
    [songs, addSong, updateSong, deleteSong, isLoading, error]
  );

  return (
    <SongContext.Provider value={contextValue}>{children}</SongContext.Provider>
  );
}

export function useSongs() {
  const context = useContext(SongContext);
  if (context === undefined) {
    throw new Error("useSongs must be used within a SongProvider");
  }
  return context;
}
