import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSettings } from "@/hooks/use-settings";
import { useSongs } from "@/hooks/use-songs";
import { useFileSlides } from "@/hooks/use-file-slides";
import { cn } from "@/lib/utils";
import { Song, getAllKeyedFiles } from "@/types";
import { StarIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FileViewer } from "@/components/setlists/FileViewer";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";
import { KeyPickerContent, KeyOption } from "@/components/songs/key-picker";

interface QuickAccessSongsProps {
  onSongSelect?: (songId: string) => void;
  onSaveNotes?: (songId: string, notes: string) => void;
  className?: string;
  asFloatingButton?: boolean;
}

export function OneTouchSongs({
  onSongSelect,
  onSaveNotes,
  className,
  asFloatingButton = false,
}: QuickAccessSongsProps) {
  const { settings } = useSettings();
  const { songs } = useSongs();
  const navigate = useNavigate();
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isKeyPickerOpen, setIsKeyPickerOpen] = useState(false);
  const [anchorSongId, setAnchorSongId] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Get the actual song objects for the quick access songs
  const quickAccessSongs = settings.oneTouchSongs.songIds
    .map((id) => songs.find((song) => song.id === id))
    .filter((song) => song !== undefined) as Song[];

  // Memoize the filter and resolver functions to prevent infinite loops
  const songFilter = useCallback(
    (song: Song) => song.id === selectedSongId,
    [selectedSongId]
  );

  const keyResolver = useCallback(
    (song: Song) => {
      void song;
      return selectedKey && selectedKey !== "__legacy__" ? selectedKey : "";
    },
    [selectedKey]
  );

  const sectionOrderResolver = useCallback(
    (song: Song) => song.defaultSectionOrder,
    []
  );

  // Get slides for the selected song
  const { flattenedSlides, isLoading, setNumPages } = useFileSlides({
    songs,
    songFilter: selectedSongId ? songFilter : undefined,
    keyResolver,
    sectionOrderResolver,
  });

  // Callback to update PDF page counts when FileViewer discovers them
  const handlePdfPageCountDiscovered = useCallback(
    (path: string, numPages: number) => {
      setNumPages((prev) => {
        if (prev[path] === numPages) return prev;
        return { ...prev, [path]: numPages };
      });
    },
    [setNumPages]
  );

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

  if (quickAccessSongs.length === 0) {
    return null;
  }

  function getKeysWithFiles(song: Song): {
    keys: KeyOption[];
    legacyCount: number;
  } {
    const keyed = getAllKeyedFiles(song) as Record<
      string,
      unknown[] | undefined
    >;
    const entries = Object.entries(keyed ?? {});
    const keys: KeyOption[] = entries.reduce(
      (acc: KeyOption[], [name, files]) => {
        const count = Array.isArray(files) ? files.length : 0;
        if (count > 0) acc.push({ name, count });
        return acc;
      },
      []
    );
    const legacyCount = song.files?.length ?? 0;
    return { keys, legacyCount };
  }

  const handleSongClick = (songId: string) => {
    if (onSongSelect) {
      onSongSelect(songId);
    } else {
      const song = songs.find((s) => s.id === songId);
      if (!song) return;

      const { keys, legacyCount } = getKeysWithFiles(song);

      if (legacyCount > 0 && keys.length === 0) {
        setSelectedKey("__legacy__");
        setSelectedSongId(songId);
        setShowFileViewer(true);
        return;
      }

      if (keys.length === 1) {
        setSelectedKey(keys[0].name);
        setSelectedSongId(songId);
        setShowFileViewer(true);
        return;
      }

      if (keys.length > 1) {
        setAnchorSongId(songId);
        setIsKeyPickerOpen(true);
      } else {
        // no files at all fallback
        setSelectedSongId(songId);
        setShowFileViewer(true);
      }
    }
  };

  const handleFileViewerClose = () => {
    setShowFileViewer(false);
    setSelectedSongId(null);
    setSelectedKey(null);
    setIsKeyPickerOpen(false);
    setAnchorSongId(null);
  };

  const handleSaveNotesInViewer = async (songId: string, notes: string) => {
    if (onSaveNotes) {
      onSaveNotes(songId, notes);
    }
  };

  // Popover content with Command list and inline key selection
  const songListContent = (
    <div>
      <Command>
        <CommandList>
          <CommandEmpty>No favorites yet.</CommandEmpty>
          <CommandGroup heading="Quick Access Songs">
            {quickAccessSongs.map((song) => {
              const { keys } = getKeysWithFiles(song);
              const hasMultipleKeys = keys.length > 1;
              return (
                <CommandItem
                  key={song.id}
                  value={`${song.title} ${song.artist || ""}`}
                  onSelect={() => handleSongClick(song.id)}
                >
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-sm font-medium truncate">
                      {song.title}
                    </span>
                    {song.artist && (
                      <span className="text-xs text-muted-foreground truncate w-full">
                        {song.artist}
                      </span>
                    )}
                    {hasMultipleKeys &&
                      anchorSongId === song.id &&
                      isKeyPickerOpen && (
                        <div className="mt-2 w-full">
                          <KeyPickerContent
                            songTitle={song.title}
                            keys={keys}
                            onSelect={(k) => {
                              setSelectedKey(k);
                              setSelectedSongId(song.id);
                              setShowFileViewer(true);
                              setIsKeyPickerOpen(false);
                              setAnchorSongId(null);
                              setIsPopoverOpen(false);
                            }}
                          />
                        </div>
                      )}
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );

  // Floating button version
  if (asFloatingButton) {
    return (
      <>
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "fixed bottom-20 right-6 z-[60] h-14 w-14 rounded-full shadow-lg transition-all hover:scale-110",
                "md:bottom-6",
                "animate-in fade-in slide-in-from-bottom-4 duration-500",
                "flex items-center justify-center",
                "bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30",
                "hover:from-yellow-500/30 hover:to-amber-500/30 hover:ring-yellow-500/50",
                "hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/50",
                className
              )}
            >
              <StarIcon className="h-6 w-6 text-yellow-500" />
              <span className="sr-only">Quick Access Songs</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="p-0">
            {songListContent}
          </PopoverContent>
        </Popover>

        {/* File Viewer */}
        {showFileViewer && (
          <FileViewer
            isOpen={showFileViewer}
            onOpenChange={handleFileViewerClose}
            slides={flattenedSlides}
            onSaveNotes={handleSaveNotesInViewer}
            onPdfPageCountDiscovered={handlePdfPageCountDiscovered}
          />
        )}
      </>
    );
  }

  // Original inline version (for backwards compatibility if needed)

  return (
    <>
      <div className={cn("border rounded-md overflow-hidden", className)}>
        <div className="flex items-center justify-between p-2 bg-muted/50 cursor-pointer">
          <div className="flex items-center gap-2">
            <StarIcon className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Quick Access Songs</span>
          </div>
        </div>

        <div className="p-2">{songListContent}</div>
      </div>

      {/* File Viewer - Same as setlist page */}
      {showFileViewer && (
        <FileViewer
          isOpen={showFileViewer}
          onOpenChange={handleFileViewerClose}
          slides={flattenedSlides}
          onSaveNotes={handleSaveNotesInViewer}
          onPdfPageCountDiscovered={handlePdfPageCountDiscovered}
        />
      )}
    </>
  );
}
