import { Header } from "@/components/layout/header";
import { NotesWindow } from "@/components/setlists/notes-window";
import { OneTouchSongs } from "@/components/setlists/one-touch-songs";
import { SetlistForm } from "@/components/setlists/setlist-form";
import { SongSearchCombobox } from "@/components/songs/song-search-combobox";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DataList,
  DataListItem,
  DataListLabel,
  DataListValue,
} from "@/components/ui/data-list";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";
import { useSetlists } from "@/hooks/use-setlists";
import { useSongs } from "@/hooks/use-songs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  SetlistSong,
  Setlist,
  getFilesForKey,
  getAllKeyedFiles,
  hasFilesForKey,
} from "@/types";
import { format } from "date-fns";
import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Edit as EditIcon,
  FileIcon,
  FilesIcon,
  Music2Icon,
  PlusIcon,
  StickyNoteIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useNavigate, useParams } from "react-router-dom";

interface FileWithUrl {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  created_at: string;
  song_id: string;
  path: string;
  songTitle?: string;
  songArtist?: string;
  keyInfo?: string; // Add key information for display
}

interface EditableSetlistSong extends Omit<SetlistSong, "song"> {
  isEditing?: boolean;
  tempKey?: string;
  tempBpm?: number;
  tempNotes?: string;
  songTitle?: string;
  songArtist?: string;
  song?: {
    title: string;
    artist: string;
    [key: string]: unknown; // Allow additional song properties
  };
}

// Set worker URL for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const KEY_OPTIONS = [
  "G",
  "Gb",
  "F#",
  "F",
  "E",
  "Eb",
  "D",
  "Db",
  "C#",
  "C",
  "B",
  "Bb",
  "A",
  "Ab",
];

function getKeyHistoryForSong(songId: string, setlists: Setlist[]) {
  // Returns [{ key, date, setlistName }]
  const history: { key: string; date: string; setlistName: string }[] = [];
  setlists.forEach((setlist) => {
    setlist.songs.forEach((song: SetlistSong) => {
      if (song.songId === songId && song.key) {
        history.push({
          key: song.key,
          date: setlist.date,
          setlistName: setlist.name,
        });
      }
    });
  });
  // Group by key and sort by most recent
  const grouped: Record<string, { date: string; setlistName: string }[]> = {};
  history.forEach(({ key, date, setlistName }) => {
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ date, setlistName });
  });
  // Return [{key, usages: [{date, setlistName}]}]
  return Object.entries(grouped)
    .map(([key, usages]) => ({
      key,
      usages: usages.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export default function SetlistPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { setlists, updateSetlist, updateSetlistSongs, isLoading } =
    useSetlists();
  const { songs } = useSongs();
  const navigate = useNavigate();

  // State management
  const [isEditing, setIsEditing] = useState(false);
  const [editingSongs, setEditingSongs] = useState<
    Record<string, EditableSetlistSong>
  >({});
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [addSongForm, setAddSongForm] = useState({
    songId: "",
    key: "",
    notes: "",
  });
  const [allFiles, setAllFiles] = useState<FileWithUrl[]>([]);
  interface SlideItem extends FileWithUrl {
    key: string;
    type: "image" | "pdf";
    pageNumber?: number;
    songTitle?: string;
    // Add these to match what we're accessing in the code
    song_id: string;
  }

  const [flattenedSlides, setFlattenedSlides] = useState<SlideItem[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
  });

  const [numPages, setNumPages] = useState<Record<string, number>>({});
  const [showCarousel, setShowCarousel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNotesWindowOpen, setIsNotesWindowOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState<string>("");
  const [notesDirty, setNotesDirty] = useState(false);

  const dialogContentRef = useRef<HTMLDivElement>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [editingSong, setEditingSong] = useState<SetlistSong | null>(null);

  // Derived state
  const setlist = setlists.find((s) => s.id === id);

  useEffect(() => {
    if (!setlist && !isLoading) {
      navigate("/setlists");
      toast({
        title: "Setlist not found",
        variant: "destructive",
      });
    }
  }, [setlist, navigate, isLoading, toast]);

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.querySelector(".carousel-container");
      if (container) {
        setContainerDimensions({
          width: container.clientWidth - 48, // Subtract padding
          height: container.clientHeight - 180, // Subtract header and padding
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, [showCarousel]);

  useEffect(() => {
    if (setlist) {
      const loadFiles = async () => {
        const files: FileWithUrl[] = [];
        for (const setlistSong of setlist.songs) {
          const song = songs.find((s) => s.id === setlistSong.songId);
          if (song) {
            // 🎯 Get files for the specific key selected in the setlist, with fallback to default
            const relevantFiles = getFilesForKey(song, setlistSong.key);

            for (const file of relevantFiles) {
              try {
                const { data, error } = await supabase.storage
                  .from("song-files")
                  .createSignedUrl(file.path, 3600);
                if (error) {
                  console.error("Error getting signed URL:", error);
                  continue;
                }
                // Ensure all required properties for FileWithUrl are included
                files.push({
                  ...file,
                  url: data.signedUrl,
                  songTitle: song.title,
                  songArtist: song.artist,
                  id: file.id || `temp-${file.path}`,
                  created_at: file.createdAt || new Date().toISOString(),
                  song_id: song.id,
                  // Add key information for display
                  keyInfo: setlistSong.key || "default",
                });
              } catch (error) {
                console.error("Error loading file:", error);
              }
            }
          }
        }
        setAllFiles(files);
      };
      loadFiles();
    }
  }, [setlist, songs]);

  // Flatten allFiles into slides (images as single slide, PDFs as one slide per page)
  useEffect(() => {
    const slides: SlideItem[] = [];
    allFiles.forEach((file) => {
      if (isImage(file.name)) {
        slides.push({
          ...file,
          type: "image",
          key: file.path,
        });
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
    setFlattenedSlides(slides);
  }, [allFiles, numPages]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollPrev();
      const newIndex = emblaApi.selectedScrollSnap();
      setCurrentSlideIndex(newIndex);
    }
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollNext();
      const newIndex = emblaApi.selectedScrollSnap();
      setCurrentSlideIndex(newIndex);
    }
  }, [emblaApi]);

  useEffect(() => {
    if (emblaApi) {
      const onSelect = () => {
        setCurrentSlideIndex(emblaApi.selectedScrollSnap());
      };

      emblaApi.on("select", onSelect);
      // Initialize with current slide
      setCurrentSlideIndex(emblaApi.selectedScrollSnap());

      return () => {
        emblaApi.off("select", onSelect);
      };
    }
  }, [emblaApi]);

  // Keyboard navigation for carousel
  useEffect(() => {
    if (!showCarousel) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        scrollPrev();
      } else if (e.key === "ArrowRight") {
        scrollNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCarousel, scrollPrev, scrollNext]);

  const onDocumentLoadSuccess = (
    { numPages }: { numPages: number },
    path: string
  ) => {
    setNumPages((prev) => ({ ...prev, [path]: numPages }));
  };

  const getFileExtension = (filename: string) => {
    return filename
      .slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2)
      .toLowerCase();
  };

  const isImage = (filename: string) => {
    const ext = getFileExtension(filename);
    return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  };

  const isPDF = (filename: string) => {
    return getFileExtension(filename) === "pdf";
  };

  const songsNotInSetlist = songs.filter(
    (song) => !setlist?.songs.some((s) => s.songId === song.id)
  );

  const handleEditSetlist = async (updatedSetlist: Partial<Setlist>) => {
    if (!setlist) return;

    try {
      // Preserve songs array and update other fields
      await updateSetlist(setlist.id, {
        ...updatedSetlist,
        songs: setlist.songs,
      });

      setIsEditing(false);
      toast({
        title: "Setlist updated",
        description: "The setlist has been updated successfully",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update setlist",
        variant: "destructive",
      });
    }
  };

  const handleEditSong = useCallback((setlistSong: SetlistSong) => {
    setEditingSong(setlistSong);
    setEditingSongs((prev) => ({
      ...prev,
      [setlistSong.id]: {
        ...setlistSong,
        isEditing: true,
      },
    }));
  }, []);

  const handleSaveSong = useCallback(
    async (songId: string) => {
      if (!setlist || !editingSongs[songId]) return;
      try {
        const updatedSongs = setlist.songs.map((s) =>
          s.id === songId
            ? {
                ...s,
                key: editingSongs[songId].key,
                notes: editingSongs[songId].notes,
              }
            : s
        );
        await updateSetlistSongs(setlist.id, updatedSongs);
        setEditingSongs((prev) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [songId]: _, ...rest } = prev;
          return rest;
        });
        setEditingSong(null);
        toast({
          title: "Song updated",
          description: "Changes have been saved successfully",
        });
      } catch {
        toast({
          title: "Error",
          description: "Failed to update song",
          variant: "destructive",
        });
      }
    },
    [
      setlist,
      editingSongs,
      updateSetlistSongs,
      setEditingSongs,
      setEditingSong,
      toast,
    ]
  );

  const handleAddNewSong = async () => {
    if (!setlist) {
      toast({
        title: "No setlist selected",
        description: "Unable to determine which setlist to add the song to",
        variant: "destructive",
      });
      return;
    }

    if (!addSongForm.songId) {
      toast({
        title: "No song selected",
        description: "Please select a song to add",
        variant: "destructive",
      });
      return;
    }

    // Check if song is already in the setlist
    const songAlreadyInSetlist = setlist.songs.some(
      (song) => song.songId === addSongForm.songId
    );
    if (songAlreadyInSetlist) {
      toast({
        title: "Song already in setlist",
        description: "This song is already in the setlist",
        variant: "destructive",
      });
      return;
    }

    const song = songs.find((s) => s.id === addSongForm.songId);
    if (!song) {
      toast({
        title: "Song not found",
        description: "The selected song could not be found",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create the new song object with a temporary ID
      const tempId = crypto.randomUUID();
      const newSong: SetlistSong = {
        id: tempId,
        songId: addSongForm.songId,
        order: setlist.songs.length + 1,
        key: addSongForm.key,
        notes: addSongForm.notes,
        title: song.title,
        artist: song.artist,
        song,
      };

      // Update the setlist with the new song
      const updatedSongs = [...setlist.songs, newSong];

      // Update in the database - the updateSetlistSongs function will handle ID generation
      await updateSetlistSongs(setlist.id, updatedSongs);

      // Reset form and close modal
      setAddSongForm({
        songId: "",
        key: "",
        notes: "",
      });
      setShowAddSongModal(false);

      toast({
        title: "Song added",
        description: `${song.title} has been added to the setlist`,
      });
    } catch (error) {
      console.error("Error adding song to setlist:", error);
      toast({
        title: "Error adding song",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!setlist) return;

    try {
      const updatedSongs = setlist.songs
        .filter((s) => s.id !== songId)
        .map((s, idx) => ({ ...s, order: idx + 1 }));

      await updateSetlistSongs(setlist.id, updatedSongs);
      toast({
        title: "Song removed",
        description: "The song has been removed from the setlist",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove song",
        variant: "destructive",
      });
    }
  };

  const handleReorderSong = async (
    songId: string,
    direction: "up" | "down"
  ) => {
    if (!setlist) return;

    const songIndex = setlist.songs.findIndex((s) => s.id === songId);
    if (songIndex === -1) return;

    const newIndex = direction === "up" ? songIndex - 1 : songIndex + 1;
    if (newIndex < 0 || newIndex >= setlist.songs.length) return;

    try {
      const updatedSongs = [...setlist.songs];
      const [removed] = updatedSongs.splice(songIndex, 1);
      updatedSongs.splice(newIndex, 0, removed);

      const reorderedSongs = updatedSongs.map((s, idx) => ({
        ...s,
        order: idx + 1,
      }));

      await updateSetlistSongs(setlist.id, reorderedSongs);
      toast({
        title: "Order updated",
        description: "The song order has been updated",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update song order",
        variant: "destructive",
      });
    }
  };

  // Handler for opening dialog and requesting fullscreen
  const handleViewFiles = () => {
    setShowCarousel(true);
    setIsNotesWindowOpen(false);
    setTimeout(() => {
      if (
        dialogContentRef.current &&
        dialogContentRef.current.requestFullscreen
      ) {
        dialogContentRef.current.requestFullscreen();
      }
    }, 0);
  };

  // Listen for fullscreen changes (must not be conditional)
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Optionally close dialog when exiting fullscreen
      if (!document.fullscreenElement) setShowCarousel(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!setlist || !flattenedSlides[currentSlideIndex]) return;

    // Get the songId for the current slide
    const slide = flattenedSlides[currentSlideIndex];
    const songId = slide.song_id;

    // Find the song in the setlist that matches this songId
    const song = setlist.songs.find((song) => song.songId === songId);

    // Use the notes from the song, ensuring all pages of the same song share notes
    setLocalNotes(song?.notes || "");
  }, [currentSlideIndex, setlist, flattenedSlides]);

  if (!setlist) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <Header title={setlist.name} />

      {/* File Carousel Dialog */}
      <Dialog open={showCarousel} onOpenChange={setShowCarousel}>
        <DialogContent
          ref={dialogContentRef}
          className={
            isFullscreen
              ? "fixed inset-0 z-50 bg-background m-0 w-screen h-dvh max-w-none rounded-none flex flex-col"
              : "max-w-6xl w-[95vw] sm:w-full overflow-y-auto max-h-[90vh]"
          }
          style={isFullscreen ? { padding: 0, margin: 0 } : {}}
        >
          {/* Best Practice: Wrap content in relative container for proper positioning context */}
          <div className="relative space-y-4 w-full h-full">
            <div
              ref={carouselContainerRef}
              className={
                isFullscreen
                  ? "carousel-container relative h-dvh"
                  : "carousel-container relative h-[calc(100vh-200px)]"
              }
            >
              <div className="overflow-hidden h-full" ref={emblaRef}>
                <div className="flex h-full">
                  {flattenedSlides.map((slide) => (
                    <div
                      key={slide.key}
                      className="relative min-w-full flex-[0_0_100%] h-full"
                    >
                      <div className="space-y-4 flex flex-col h-full">
                        <div className="flex flex-1 justify-center overflow-y-auto bg-muted/20 rounded-lg">
                          {slide.type === "image" && slide.url && (
                            <img
                              src={slide.url}
                              alt={slide.name}
                              className="h-auto max-w-full rounded-lg object-contain"
                              style={{
                                maxHeight: "calc(100vh - 106px)",
                                maxWidth: "100%",
                              }}
                            />
                          )}
                          {slide.type === "pdf" && slide.url && (
                            <Document
                              file={slide.url}
                              onLoadSuccess={(pdf) =>
                                onDocumentLoadSuccess(pdf, slide.path)
                              }
                              loading={
                                <div className="flex h-[400px] items-center justify-center">
                                  <div className="text-center">
                                    <div className="mb-2 animate-spin">
                                      <Music2Icon className="h-8 w-8" />
                                    </div>
                                    <p>Loading PDF...</p>
                                  </div>
                                </div>
                              }
                            >
                              <Page
                                pageNumber={slide.pageNumber}
                                width={Math.min(800, containerDimensions.width)}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                              />
                            </Document>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Access Buttons */}
              {isFullscreen && (
                <div className="absolute bottom-0 right-0 flex flex-col gap-2">
                  {/* Notes Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-auto px-4 gap-2 h-12 rounded-md bg-white/60 backdrop-blur-sm hover:bg-white/80"
                    onClick={() => setIsNotesWindowOpen((prev) => !prev)}
                  >
                    {isNotesWindowOpen ? (
                      <XIcon className="h-6 w-6 text-black" />
                    ) : (
                      <StickyNoteIcon className="h-6 w-6 text-black" />
                    )}
                    <p className="text-black">
                      {isNotesWindowOpen ? "Close" : "Open"} Notes
                    </p>
                  </Button>
                </div>
              )}

              {/* Notes Window Toggle and Window */}
              {isFullscreen && (
                <NotesWindow
                  isOpen={isNotesWindowOpen}
                  onOpenChange={(open) => {
                    setIsNotesWindowOpen(open);
                  }}
                  notes={localNotes}
                  onNotesChange={(val) => {
                    setLocalNotes(val);
                    setNotesDirty(
                      val !== (setlist?.songs[currentSlideIndex]?.notes || "")
                    );
                  }}
                  onSaveNotes={async () => {
                    if (!setlist || !flattenedSlides[currentSlideIndex]) return;

                    // Find the songId for the current slide
                    const slide = flattenedSlides[currentSlideIndex];
                    const songId = slide.song_id;
                    if (!songId) return;

                    // Find all indices in setlist.songs that match this songId
                    const updatedSongs = setlist.songs.map((song) => {
                      if (song.songId === songId) {
                        return {
                          ...song,
                          notes: localNotes,
                        };
                      }
                      return song;
                    });
                    try {
                      await updateSetlistSongs(setlist.id, updatedSongs);
                      setNotesDirty(false);
                      toast({
                        title: "Notes saved",
                        description: "Your notes were updated.",
                      });
                    } catch (error: unknown) {
                      toast({
                        title: "Failed to save notes",
                        description:
                          error instanceof Error
                            ? error.message
                            : "Unknown error",
                        variant: "destructive",
                      });
                    }
                  }}
                  notesDirty={notesDirty}
                  songTitle={
                    flattenedSlides[currentSlideIndex]?.songTitle || ""
                  }
                  pageNumber={flattenedSlides[currentSlideIndex]?.pageNumber}
                  totalPages={(() => {
                    const slide = flattenedSlides[currentSlideIndex];
                    if (!slide || slide.type !== "pdf") return undefined;
                    return numPages[slide.path];
                  })()}
                  containerRef={
                    carouselContainerRef || {
                      current: document.body as HTMLDivElement,
                    }
                  }
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Song Dialog */}
      <Dialog
        open={!!editingSong}
        onOpenChange={(open) => !open && setEditingSong(null)}
      >
        <DialogContent className="sm:max-w-md w-[95vw] sm:w-full overflow-y-auto max-h-[90vh]">
          <div className="p-4">
            <DialogTitle className="text-xl font-semibold mb-4">
              Edit Song
            </DialogTitle>
            {editingSong && editingSongs[editingSong.id] && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-medium text-foreground">
                    {editingSong.song.title} - {editingSong.song.artist}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Key</Label>
                    <div className="flex flex-wrap gap-2">
                      {KEY_OPTIONS.map((key) => (
                        <Button
                          key={key}
                          variant={
                            editingSongs[editingSong.id]?.key === key
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="h-10 w-12 font-mono"
                          onClick={() =>
                            setEditingSongs((prev) => ({
                              ...prev,
                              [editingSong.id]: {
                                ...prev[editingSong.id],
                                key,
                              },
                            }))
                          }
                        >
                          {key}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Available Files Section */}
                  {(() => {
                    const song = songs.find((s) => s.id === editingSong.songId);
                    if (!song) return null;

                    const currentKey = editingSongs[editingSong.id]?.key || "";
                    const filesForCurrentKey = getFilesForKey(song, currentKey);
                    const allKeyedFiles = getAllKeyedFiles(song);
                    const keysWithFiles = Object.entries(allKeyedFiles).filter(
                      ([, files]) => files && files.length > 0
                    );

                    // Check if we're showing default files as fallback
                    const hasKeySpecificFiles =
                      currentKey &&
                      currentKey !== "default" &&
                      allKeyedFiles[currentKey as keyof typeof allKeyedFiles] &&
                      (
                        allKeyedFiles[
                          currentKey as keyof typeof allKeyedFiles
                        ] || []
                      ).length > 0;
                    const isUsingDefaultFallback =
                      !hasKeySpecificFiles &&
                      currentKey &&
                      currentKey !== "default" &&
                      filesForCurrentKey.length > 0;

                    if (keysWithFiles.length === 0) return null;

                    return (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Available Files
                        </Label>
                        <div className="rounded-lg border border-dashed p-3 space-y-3">
                          {/* Current key files */}
                          {filesForCurrentKey.length > 0 && (
                            <div className="space-y-2">
                              <p
                                className={`text-xs font-medium ${
                                  isUsingDefaultFallback
                                    ? "text-amber-600"
                                    : "text-green-600"
                                }`}
                              >
                                {isUsingDefaultFallback ? "⚡" : "✓"} Files
                                available for key {currentKey || "Default"}
                                {isUsingDefaultFallback && (
                                  <span className="text-amber-700">
                                    {" "}
                                    (using default files)
                                  </span>
                                )}{" "}
                                ({filesForCurrentKey.length} file
                                {filesForCurrentKey.length !== 1 ? "s" : ""})
                              </p>
                              <div className="space-y-1">
                                {filesForCurrentKey
                                  .slice(0, 3)
                                  .map((file, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-2 text-xs text-muted-foreground"
                                    >
                                      <FileIcon className="h-3 w-3" />
                                      <span className="truncate">
                                        {file.name}
                                      </span>
                                      {isUsingDefaultFallback && (
                                        <span className="text-amber-600 text-xs">
                                          (default)
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                {filesForCurrentKey.length > 3 && (
                                  <p className="text-xs text-muted-foreground">
                                    ...and {filesForCurrentKey.length - 3} more
                                    {isUsingDefaultFallback && (
                                      <span className="text-amber-600">
                                        {" "}
                                        (default files)
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {filesForCurrentKey.length === 0 && (
                            <div className="text-center py-2">
                              <p className="text-xs text-muted-foreground">
                                ⚠️ No files available for key{" "}
                                {currentKey || "Default"}
                              </p>
                              {keysWithFiles.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Consider switching to a key with available
                                  files
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Notes</Label>
                    <Textarea
                      value={editingSongs[editingSong.id]?.notes || ""}
                      onChange={(e) =>
                        setEditingSongs((prev) => ({
                          ...prev,
                          [editingSong.id]: {
                            ...prev[editingSong.id],
                            notes: e.target.value,
                          },
                        }))
                      }
                      placeholder="Add performance notes, cues, or other details"
                      className="min-h-[120px] text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingSong(null)}
                    className="px-4"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleSaveSong(editingSong.id)}
                    className="px-4"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Song Modal */}
      <Dialog open={showAddSongModal} onOpenChange={setShowAddSongModal}>
        <DialogContent className="sm:max-w-md w-[95vw] sm:w-full overflow-y-auto max-h-[90vh] p-4">
          <div className="space-y-6">
            <DialogTitle className="text-xl font-semibold">
              Add Song to Setlist
            </DialogTitle>
            <div className="space-y-4">
              <div className="space-y-2 flex flex-col gap-2">
                <Label className="text-sm font-medium">Select Song</Label>
                <SongSearchCombobox
                  songs={songsNotInSetlist}
                  onSelect={(songId) =>
                    setAddSongForm((prev) => ({
                      ...prev,
                      songId,
                    }))
                  }
                  placeholder="Search for a song to add..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Key</Label>
                <div className="flex flex-wrap gap-2">
                  {KEY_OPTIONS.map((key) => (
                    <Button
                      key={key}
                      variant={addSongForm.key === key ? "default" : "outline"}
                      size="sm"
                      className="h-10 w-12 font-mono"
                      onClick={() =>
                        setAddSongForm((prev) => ({
                          ...prev,
                          key,
                        }))
                      }
                    >
                      {key}
                    </Button>
                  ))}
                </div>
                {/* Key History Section */}
                {addSongForm.songId && (
                  <div className="mt-4 border-t pt-3">
                    <div className="mb-2 text-xs text-muted-foreground font-medium">
                      Previously used keys for this song:
                    </div>
                    <div className="flex flex-col gap-2">
                      {getKeyHistoryForSong(addSongForm.songId, setlists)
                        .length > 0 ? (
                        getKeyHistoryForSong(addSongForm.songId, setlists).map(
                          (item) => (
                            <div
                              key={item.key}
                              onClick={() =>
                                setAddSongForm((prev) => ({
                                  ...prev,
                                  key: item.key,
                                }))
                              }
                              className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
                                addSongForm.key === item.key
                                  ? "bg-primary/10 border border-primary/20"
                                  : "border border-transparent"
                              }`}
                            >
                              <Button
                                variant={
                                  addSongForm.key === item.key
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                className="h-7 w-10 px-0 font-mono text-xs font-medium flex-shrink-0"
                              >
                                {item.key}
                              </Button>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">
                                  {item.usages[0].setlistName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(
                                    new Date(item.usages[0].date),
                                    "MMM d, yyyy"
                                  )}
                                </p>
                              </div>
                            </div>
                          )
                        )
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No previous keys found.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* File availability preview */}
                {addSongForm.songId &&
                  addSongForm.key &&
                  (() => {
                    const selectedSong = songs.find(
                      (s) => s.id === addSongForm.songId
                    );
                    if (!selectedSong) return null;

                    const filesForSelectedKey = getFilesForKey(
                      selectedSong,
                      addSongForm.key
                    );
                    const hasKeySpecificFiles = hasFilesForKey(
                      selectedSong,
                      addSongForm.key
                    );
                    const hasDefaultFiles = hasFilesForKey(
                      selectedSong,
                      "default"
                    );

                    return (
                      <div className="text-sm p-3 rounded-md border bg-muted/20 mt-4">
                        <div className="flex items-center gap-2">
                          <FilesIcon className="h-4 w-4" />
                          <span className="font-medium">
                            {filesForSelectedKey.length} chord sheet(s)
                            available
                          </span>
                        </div>

                        {filesForSelectedKey.length === 0 && (
                          <div className="mt-2 text-amber-600 text-xs">
                            ⚠️ No files for key {addSongForm.key}.
                            {hasDefaultFiles && " Default files will be used."}
                            {!hasDefaultFiles &&
                              " No files available for this song."}
                          </div>
                        )}

                        {filesForSelectedKey.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {hasKeySpecificFiles
                              ? `Using ${addSongForm.key} specific files`
                              : "Using default files"}
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Notes</Label>
                <Textarea
                  value={addSongForm.notes || ""}
                  onChange={(e) =>
                    setAddSongForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Add performance notes, cues, or other details"
                  className="min-h-[120px] text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAddSongModal(false)}
                className="px-4"
              >
                Cancel
              </Button>
              <Button onClick={handleAddNewSong} className="px-4">
                Add Song
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 space-y-8 overflow-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <Breadcrumb
            items={[
              { href: "/setlists", label: "Setlists" },
              { href: `/setlist/${setlist.id}`, label: setlist.name },
            ]}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Songs</h2>
                </div>

                {setlist.songs.length === 0 ? (
                  <div className="rounded-md border border-dashed p-8 text-center">
                    <Music2Icon className="mx-auto h-8 w-8 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-medium">
                      No songs added yet
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add songs to your setlist to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {setlist.songs.map((setlistSong, index) => {
                        return (
                          <motion.div
                            key={setlistSong.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            layout
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                            }}
                            className="flex items-center justify-between rounded-md border p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground aspect-square">
                                {index + 1}
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  {setlistSong.song.title}
                                </p>
                                {setlistSong.song.artist && (
                                  <p className="text-xs text-muted-foreground">
                                    {setlistSong.song.artist}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {setlistSong.key && `Key: ${setlistSong.key}`}
                                  {setlistSong.key &&
                                    setlistSong.notes &&
                                    " • "}
                                  {setlistSong.notes}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleReorderSong(setlistSong.id, "up")
                                }
                                disabled={index === 0}
                                className="h-8 w-8"
                              >
                                <span className="sr-only">Move up</span>
                                <ArrowUpIcon className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleReorderSong(setlistSong.id, "down")
                                }
                                disabled={index === setlist.songs.length - 1}
                                className="h-8 w-8"
                              >
                                <span className="sr-only">Move down</span>
                                <ArrowDownIcon className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditSong(setlistSong)}
                                className="h-8 w-8"
                              >
                                <EditIcon className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveSong(setlistSong.id)}
                              >
                                <XIcon className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex gap-2 flex-col">
              <Button
                size="xl"
                className="flex-1 flex gap-2 border-none min-h-12"
                onClick={handleViewFiles}
                disabled={allFiles.length === 0}
              >
                <FilesIcon /> View Files
              </Button>
              <Button
                size="xl"
                variant="secondary"
                className="flex-1 min-h-12"
                onClick={() => setShowAddSongModal(true)}
                disabled={songsNotInSetlist.length === 0}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Song
              </Button>
            </div>

            {/* One-Touch Songs - Desktop */}
            <OneTouchSongs className="hidden md:block" />
            {/* Let the component handle file loading and display on its own */}
            {/* Information Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-lg font-semibold">Information</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <EditIcon className="mr-2 h-3 w-3" />
                    Edit
                  </Button>
                </div>
                <DataList orientation="vertical" className="gap-4" size="sm">
                  <DataListItem>
                    <DataListLabel className="font-bold text-xs tracking-wide uppercase w-32">
                      Name
                    </DataListLabel>
                    <DataListValue className="font-medium  max-w-[200px] truncate">
                      {setlist?.name}
                    </DataListValue>
                  </DataListItem>

                  <DataListItem>
                    <DataListLabel className="font-bold text-xs tracking-wide uppercase w-32">
                      Date
                    </DataListLabel>
                    <DataListValue>
                      {setlist?.date
                        ? format(new Date(setlist.date), "MMMM d, yyyy")
                        : "Not scheduled"}
                    </DataListValue>
                  </DataListItem>

                  <DataListItem>
                    <DataListLabel className="font-bold text-xs tracking-wide uppercase w-32">
                      Songs
                    </DataListLabel>
                    <DataListValue>{setlist?.songs.length || 0}</DataListValue>
                  </DataListItem>

                  <DataListItem>
                    <DataListLabel className="font-bold text-xs tracking-wide uppercase w-32">
                      Created
                    </DataListLabel>
                    <DataListValue>
                      {setlist?.createdAt
                        ? format(new Date(setlist.createdAt), "MMM d, yyyy")
                        : ""}
                    </DataListValue>
                  </DataListItem>

                  <DataListItem>
                    <DataListLabel className="font-bold text-xs tracking-wide uppercase w-32">
                      Last updated
                    </DataListLabel>
                    <DataListValue>
                      {setlist?.updatedAt
                        ? format(new Date(setlist.updatedAt), "MMM d, yyyy")
                        : ""}
                    </DataListValue>
                  </DataListItem>
                </DataList>
              </CardContent>
            </Card>

            {/* <DataList orientation="horizontal" className="gap-4">
              <DataListItem>
                <DataListLabel className="w-32">Status:</DataListLabel>
                <DataListValue>
                  <Badge className="py-0 px-1.5 bg-emerald-500/20 text-emerald-500 font-semibold">
                    Authorized
                  </Badge>
                </DataListValue>
              </DataListItem>

              <DataListItem>
                <DataListLabel className="w-32">ID:</DataListLabel>
                <DataListValue className="flex items-center gap-2">
                  #123456789
                  <Copy className="w-3.5 h-3.5 opacity-70" />
                </DataListValue>
              </DataListItem>

              <DataListItem>
                <DataListLabel className="w-32">Name: </DataListLabel>
                <DataListValue>Allipio Pereira</DataListValue>
              </DataListItem>

              <DataListItem>
                <DataListLabel className="w-32">Company: </DataListLabel>
                <DataListValue>allipiopereira</DataListValue>
              </DataListItem>
            </DataList> */}
          </div>
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-md">
          <SetlistForm
            setlist={setlist}
            onSubmit={handleEditSetlist}
            onCancel={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
