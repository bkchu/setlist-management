import { useState, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { signSongFilePath } from "@/lib/storage";
import {
  Song,
  getFilesForKey,
  SlideItem,
  FileWithUrl,
  SongFile,
} from "@/types";
import { isImage, isPDF } from "@/lib/utils";

interface UseFileSlidesOptions {
  songs: Song[];
  songFilter?: (song: Song) => boolean;
  keyResolver?: (song: Song) => string;
  songOrderer?: (songs: Song[]) => Song[];
}

// Safer signing that properly handles special characters in path segments (e.g., "#")
const getSignedUrl = async (filePath: string): Promise<string> =>
  signSongFilePath(filePath, 3600);

export function useFileSlides({
  songs,
  songFilter,
  keyResolver = () => "",
  songOrderer,
}: UseFileSlidesOptions) {
  const [numPages, setNumPages] = useState<Record<string, number>>({});

  // Process songs to get file list
  const processedFiles = useMemo(() => {
    // If no filter is provided, do not process any songs to avoid eager fetching
    // of signed URLs for every song on initial render.
    let filteredSongs = songFilter ? songs.filter(songFilter) : [];

    // Apply custom ordering if provided
    if (songOrderer) {
      filteredSongs = songOrderer(filteredSongs);
    }

    const fileList: Array<{
      file: SongFile;
      song: Song;
      key: string;
    }> = [];

    for (const song of filteredSongs) {
      const key = keyResolver(song);
      const relevantFiles = getFilesForKey(song, key);

      for (const file of relevantFiles) {
        fileList.push({ file, song, key });
      }
    }

    return fileList;
  }, [songs, songFilter, keyResolver, songOrderer]);

  // Use TanStack Query to fetch signed URLs for all files
  const queries = useQueries({
    queries: processedFiles.map(({ file }) => ({
      queryKey: ["signed-url", file.path] as const,
      queryFn: () => getSignedUrl(file.path),
      // Keep cached for most of 8-hour expiry, refresh 10 minutes before expiry
      staleTime: (8 * 60 * 60 - 10 * 60) * 1000, // 7h 50m
      gcTime: 9 * 60 * 60 * 1000, // 9 hours - longer than expiry
      retry: 2,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      enabled: !!file.path,
    })),
  });

  // Combine query results with file data
  const files: FileWithUrl[] = useMemo(() => {
    const result: FileWithUrl[] = [];

    processedFiles.forEach(({ file, song, key }, index) => {
      const query = queries[index];

      if (query.data) {
        result.push({
          ...file,
          url: query.data,
          songTitle: song.title,
          songArtist: song.artist,
          id: file.id || `temp-${file.path}`,
          created_at: file.createdAt || new Date().toISOString(),
          song_id: song.id,
          keyInfo: key,
        });
      }
    });

    return result;
  }, [processedFiles, queries]);

  // Create slides from files
  const flattenedSlides = useMemo(() => {
    const slides: SlideItem[] = [];

    files.forEach((file) => {
      if (isImage(file.name)) {
        slides.push({ ...file, type: "image", key: file.path });
      } else if (isPDF(file.name)) {
        const num = numPages[file.path] || 1;
        for (let i = 1; i <= num; i++) {
          const isMultiPage = num > 1;
          const songTitle = isMultiPage
            ? `${file.name} - Page ${i} of ${num}`
            : file.name;
          slides.push({
            ...file,
            songTitle,
            type: "pdf",
            pageNumber: i,
            key: `${file.path}__page_${i}`,
          });
        }
      }
    });

    return slides;
  }, [files, numPages]);

  // Calculate loading state
  const isLoading = queries.some((query) => query.isLoading);

  return {
    flattenedSlides,
    numPages,
    setNumPages,
    isLoading,
  };
}
