import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import useEmblaCarousel from "embla-carousel-react";
import { supabase } from "@/lib/supabase";
import { useSetlists } from "@/hooks/use-setlists";
import { useSongs } from "@/hooks/use-songs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SetlistSong } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Edit as EditIcon,
  Music2Icon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatePresence, motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { SetlistForm } from "@/components/setlists/setlist-form";

interface KeyHistoryItem {
  key: string;
  usages: { date: string; setlistName: string }[];
}

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

function getKeyHistoryForSong(songId: string, setlists: any) {
  // Returns [{ key, date, setlistName }]
  const history: { key: string; date: string; setlistName: string }[] = [];
  setlists.forEach((setlist: any) => {
    setlist.songs.forEach((song: any) => {
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
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
  });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [numPages, setNumPages] = useState<Record<string, number>>({});
  const [showCarousel, setShowCarousel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
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
        description: "The requested setlist could not be found.",
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
          if (song?.files) {
            for (const file of song.files) {
              try {
                const { data, error } = await supabase.storage
                  .from("song-files")
                  .createSignedUrl(file.path, 3600);

                if (error) {
                  console.error("Error getting signed URL:", error);
                  continue;
                }

                files.push({
                  ...file,
                  url: data.signedUrl,
                  songTitle: song.title,
                  songArtist: song.artist,
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

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.on("select", () => {
        setCurrentSlide(emblaApi.selectedScrollSnap());
      });
    }
  }, [emblaApi]);

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

  const handleEditSetlist = async (setlistData: Partial<typeof setlist>) => {
    if (!setlist) return;

    try {
      await updateSetlist(setlist.id, setlistData);
      setIsEditing(false);
      toast({
        title: "Setlist updated",
        description: "The setlist has been updated successfully",
      });
    } catch (error) {
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
        songId: setlistSong.songId,
        key: setlistSong.key,
        notes: setlistSong.notes,
        order: setlistSong.order,
        song: setlistSong.song,
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
          const { [songId]: _, ...rest } = prev;
          return rest;
        });
        setEditingSong(null);
        toast({
          title: "Song updated",
          description: "Changes have been saved successfully",
        });
      } catch (error) {
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
    if (!setlist || !addSongForm.songId) {
      toast({
        title: "No song selected",
        description: "Please select a song to add",
        variant: "destructive",
      });
      return;
    }

    const song = songs.find((s) => s.id === addSongForm.songId);
    if (!song) return;

    try {
      const newSong: SetlistSong = {
        id: crypto.randomUUID(),
        songId: addSongForm.songId,
        order: setlist.songs.length + 1,
        key: addSongForm.key,
        notes: addSongForm.notes,
        song,
      };

      await updateSetlistSongs(setlist.id, [...setlist.songs, newSong]);
      setAddSongForm({
        songId: "",
        key: "",
        notes: "",
      });
      setShowAddSongModal(false);
      toast({
        title: "Song added",
        description: "New song has been added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add song",
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
    } catch (error) {
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
      const temp = updatedSongs[songIndex];
      updatedSongs[songIndex] = updatedSongs[newIndex];
      updatedSongs[newIndex] = temp;

      const reorderedSongs = updatedSongs.map((s, idx) => ({
        ...s,
        order: idx + 1,
      }));

      await updateSetlistSongs(setlist.id, reorderedSongs);
      toast({
        title: "Order updated",
        description: "The song order has been updated",
      });
    } catch (error) {
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
          fullscreen={isFullscreen}
          className={
            isFullscreen
              ? "fixed inset-0 z-50 bg-background p-0 m-0 w-screen h-screen max-w-none rounded-none flex flex-col"
              : "max-w-6xl"
          }
          style={isFullscreen ? { padding: 0, margin: 0 } : {}}
        >
          {isFullscreen && (
            <Button
              className="absolute top-4 right-4 z-50 bg-white/80 shadow"
              onClick={() => document.exitFullscreen()}
            >
              Exit Fullscreen
            </Button>
          )}
          <div className="space-y-4">
            <DialogTitle className="text-xl font-semibold">
              Files ({currentSlide + 1} of {allFiles.length})
            </DialogTitle>
            <div
              className={
                isFullscreen
                  ? "carousel-container relative h-[calc(100vh-80px)]"
                  : "carousel-container relative h-[calc(100vh-200px)]"
              }
            >
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex">
                  {allFiles.map((file, index) => (
                    <div
                      key={file.path}
                      className="relative min-w-full flex-[0_0_100%]"
                    >
                      <div className="space-y-4 flex flex-col">
                        <div>
                          <h3 className="text-lg font-medium">
                            {file.songTitle}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {file.songArtist}
                          </p>
                        </div>
                        <div
                          className="flex flex-1 justify-center overflow-y-auto bg-muted/20 rounded-lg p-4"
                          style={{
                            minHeight: "400px",
                          }}
                        >
                          {isImage(file.name) && file.url && (
                            <img
                              src={file.url}
                              alt={file.name}
                              className="h-auto max-w-full rounded-lg object-contain"
                              style={{
                                maxHeight: "calc(100vh - 109px)",
                                maxWidth: "100%",
                              }}
                            />
                          )}
                          {isPDF(file.name) && file.url && (
                            <Document
                              file={file.url}
                              onLoadSuccess={(pdf) =>
                                onDocumentLoadSuccess(pdf, file.path)
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
                              {Array.from(
                                new Array(numPages[file.path] || 0),
                                (_, pageIndex) => (
                                  <div
                                    key={`page_${pageIndex + 1}`}
                                    className="mb-4"
                                  >
                                    <Page
                                      pageNumber={pageIndex + 1}
                                      width={Math.min(
                                        800,
                                        containerDimensions.width
                                      )}
                                      renderTextLayer={false}
                                      renderAnnotationLayer={false}
                                    />
                                  </div>
                                )
                              )}
                            </Document>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {allFiles.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm"
                    onClick={scrollPrev}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm"
                    onClick={scrollNext}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </>
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
        <DialogContent className="sm:max-w-md p-0">
          <div className="">
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
        <DialogContent className="sm:max-w-md">
          <div className="space-y-6">
            <DialogTitle className="text-xl font-semibold">
              Add Song to Setlist
            </DialogTitle>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Song</Label>
                <Select
                  value={addSongForm.songId}
                  onValueChange={(value) =>
                    setAddSongForm((prev) => ({
                      ...prev,
                      songId: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select a song" />
                  </SelectTrigger>
                  <SelectContent>
                    {songsNotInSetlist.map((song) => (
                      <SelectItem key={song.id} value={song.id}>
                        {song.title} - {song.artist}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                                  ? 'bg-primary/10 border border-primary/20'
                                  : 'border border-transparent'
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
                          No previous key history found for this song.
                        </p>
                      )}
                    </div>
                  </div>
                )}
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleViewFiles}
              disabled={allFiles.length === 0}
            >
              View Files
            </Button>
            <Button onClick={() => setIsEditing(true)}>
              <EditIcon className="mr-2 h-4 w-4" />
              Edit Setlist
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Songs</h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddSongModal(true)}
                    disabled={songsNotInSetlist.length === 0}
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Song
                  </Button>
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
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-between rounded-md border p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                {index + 1}
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  {setlistSong.song.title} -{" "}
                                  {setlistSong.song.artist}
                                </p>
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

          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold">Information</h2>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>
                      {format(new Date(setlist.date), "MMMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Songs</span>
                    <span>{setlist.songs.length}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>
                      {format(new Date(setlist.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last updated</span>
                    <span>
                      {format(new Date(setlist.updatedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
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
