import { FullscreenFileViewer } from "@/components/files/fullscreen-file-viewer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSettings } from "@/hooks/use-settings";
import { useSongs } from "@/hooks/use-songs";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Song, getFilesForKey } from "@/types";
import { Music2Icon, StarIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface FileWithUrl {
  id: string;
  key: string;
  name: string;
  path: string;
  type: "image" | "pdf";
  url: string;
  song_id: string;
  songTitle?: string;
  songArtist?: string;
  pageNumber?: number;
}

interface OneTouchSongsProps {
  onSongSelect?: (songId: string) => void;
  className?: string;
}

export function OneTouchSongs({ onSongSelect, className }: OneTouchSongsProps) {
  const { settings } = useSettings();
  const { songs } = useSongs();
  const navigate = useNavigate();
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [songFiles, setSongFiles] = useState<FileWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  // Get the actual song objects for the one-touch songs
  const oneTouchSongs = settings.oneTouchSongs.songIds
    .map((id) => songs.find((song) => song.id === id))
    .filter((song) => song !== undefined) as Song[];

  // Listen for fullscreen changes
  useEffect(() => {
    const onFullscreenChange = () => {
      // Close dialog when exiting fullscreen
      if (!document.fullscreenElement) setShowFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  if (oneTouchSongs.length === 0) {
    return null;
  }

  // Function to load song files with URLs
  const loadSongFiles = async (songId: string) => {
    setIsLoading(true);

    try {
      const song = songs.find((s) => s.id === songId);
      if (!song) {
        return [];
      }

      // For one-touch songs, we'll load default files since no specific key is selected
      const relevantFiles = getFilesForKey(song, "default");

      if (relevantFiles.length === 0) {
        return [];
      }

      // Get URLs for all files
      const filesWithUrls = await Promise.all(
        relevantFiles.map(async (file) => {
          const { data } = await supabase.storage
            .from("song-files")
            .createSignedUrl(file.path, 3600);

          const isImage = /\.(jpe?g|png|gif|bmp|webp)$/i.test(file.name);
          const isPDF = /\.pdf$/i.test(file.name);

          if (isPDF) {
            return {
              id: file.path,
              key: `${file.path}-${song.id}-page-1`,
              name: file.name,
              path: file.path,
              type: "pdf" as const,
              url: data?.signedUrl || "",
              song_id: song.id,
              songTitle: song.title,
              songArtist: song.artist,
              pageNumber: 1,
              keyInfo: "default",
            };
          } else if (isImage) {
            return {
              id: file.path,
              key: `${file.path}-${song.id}`,
              name: file.name,
              path: file.path,
              type: "image" as const,
              url: data?.signedUrl || "",
              song_id: song.id,
              songTitle: song.title,
              songArtist: song.artist,
              keyInfo: "default",
            };
          }

          return null;
        })
      );

      return filesWithUrls.filter(
        (file) => file !== null && file.url
      ) as FileWithUrl[];
    } catch (error) {
      console.error("Error loading files:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const handleSongClick = async (songId: string) => {
    if (onSongSelect) {
      onSongSelect(songId);
    } else {
      const files = await loadSongFiles(songId);

      if (files.length > 0) {
        // First update state with the files
        setSongFiles(files);

        // Then open fullscreen viewer with a slight delay to ensure state is updated
        setTimeout(() => {
          setShowFullscreen(true);
        }, 0);
      } else {
        // If no files, navigate to song page
        navigate(`/song/${songId}`);
      }
    }
  };

  return (
    <>
      <div className={cn("border rounded-md overflow-hidden", className)}>
        <div className="flex items-center justify-between p-2 bg-muted/50 cursor-pointer">
          <div className="flex items-center gap-2">
            <StarIcon className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">One-Touch Songs</span>
          </div>
        </div>

        <div className="p-2 space-y-1">
          {oneTouchSongs.map((song) => (
            <Button
              key={song.id}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-left h-auto py-2"
              onClick={() => handleSongClick(song.id)}
            >
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{song.title}</span>
                {song.artist && (
                  <span className="text-xs text-muted-foreground">
                    {song.artist}
                  </span>
                )}
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Regular File Viewer Dialog - Keep for compatibility */}
      <Dialog open={showFileViewer} onOpenChange={setShowFileViewer}>
        <DialogContent
          ref={dialogContentRef}
          className="max-w-6xl w-[95vw] sm:w-full overflow-y-auto max-h-[90vh]"
        >
          <div className="relative space-y-4 w-full h-full">
            {isLoading ? (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-center">
                  <div className="mb-2 animate-spin">
                    <Music2Icon className="h-8 w-8" />
                  </div>
                  <p>Loading files...</p>
                </div>
              </div>
            ) : songFiles.length === 0 ? (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-center">
                  <p>No files available for this song</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4">
                {songFiles.map((file) => (
                  <div key={file.key} className="w-full">
                    {file.type === "image" && file.url && (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="max-w-full h-auto rounded-lg mx-auto"
                      />
                    )}
                    {/* PDF files would be displayed here, but we're using FullscreenFileViewer instead */}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen File Viewer - Better user experience */}
      <FullscreenFileViewer
        files={songFiles}
        open={showFullscreen}
        onOpenChange={setShowFullscreen}
        initialIndex={0}
      />
    </>
  );
}
