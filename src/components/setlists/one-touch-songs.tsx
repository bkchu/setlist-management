import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";
import { useSongs } from "@/hooks/use-songs";
import { useFileSlides } from "@/hooks/use-file-slides";
import { cn } from "@/lib/utils";
import { Song } from "@/types";
import { StarIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FileViewer } from "@/components/setlists/FileViewer";

interface OneTouchSongsProps {
  onSongSelect?: (songId: string) => void;
  onSaveNotes?: (songId: string, notes: string) => void;
  className?: string;
}

export function OneTouchSongs({
  onSongSelect,
  onSaveNotes,
  className,
}: OneTouchSongsProps) {
  const { settings } = useSettings();
  const { songs } = useSongs();
  const navigate = useNavigate();
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);

  // Get the actual song objects for the one-touch songs
  const oneTouchSongs = settings.oneTouchSongs.songIds
    .map((id) => songs.find((song) => song.id === id))
    .filter((song) => song !== undefined) as Song[];

  // Memoize the filter and resolver functions to prevent infinite loops
  const songFilter = useCallback(
    (song: Song) => song.id === selectedSongId,
    [selectedSongId]
  );

  const keyResolver = useCallback((song: Song) => song.default_key || "", []);

  // Get slides for the selected song
  const { flattenedSlides, isLoading } = useFileSlides({
    songs,
    songFilter: selectedSongId ? songFilter : undefined,
    keyResolver,
  });

  // Handle case when no files are available - navigate to song page
  useEffect(() => {
    if (
      selectedSongId &&
      !isLoading &&
      flattenedSlides.length === 0 &&
      showFileViewer
    ) {
      setShowFileViewer(false);
      setSelectedSongId(null);
      navigate(`/song/${selectedSongId}`);
    }
  }, [
    selectedSongId,
    isLoading,
    flattenedSlides.length,
    showFileViewer,
    navigate,
  ]);

  if (oneTouchSongs.length === 0) {
    return null;
  }

  const handleSongClick = (songId: string) => {
    if (onSongSelect) {
      onSongSelect(songId);
    } else {
      // Set the selected song and show file viewer
      setSelectedSongId(songId);
      setShowFileViewer(true);
    }
  };

  const handleFileViewerClose = () => {
    setShowFileViewer(false);
    setSelectedSongId(null);
  };

  const handleSaveNotesInViewer = async (songId: string, notes: string) => {
    if (onSaveNotes) {
      onSaveNotes(songId, notes);
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

      {/* File Viewer - Same as setlist page */}
      {showFileViewer && (
        <FileViewer
          isOpen={showFileViewer}
          onOpenChange={handleFileViewerClose}
          slides={flattenedSlides}
          onSaveNotes={handleSaveNotesInViewer}
        />
      )}
    </>
  );
}
