import { useParams, useNavigate } from "react-router-dom";
import { useGetSetlist } from "@/api/setlists/get";
import { useUpdateSetlist } from "@/api/setlists/put";
import { useSongs } from "@/hooks/use-songs";
import { useFileSlides } from "@/hooks/use-file-slides";
import { toast } from "sonner";
import { SetlistSong, Setlist, Song } from "@/types";
import {
  FilesIcon,
  PlusIcon,
  GripVertical,
  Loader2,
  Pencil as EditIcon,
} from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import React from "react";
import { AddSongDialog } from "@/components/setlists/AddSongDialog";
import { EditSongDialog } from "@/components/setlists/EditSongDialog";
import { SetlistSongList } from "@/components/setlists/SetlistSongList";
import { getAllKeyedFiles } from "@/types";
import { FileViewer } from "@/components/setlists/FileViewer";
import { Header } from "@/components/layout/header";
import { OneTouchSongs } from "@/components/setlists/one-touch-songs";
import { SetlistForm } from "@/components/setlists/setlist-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

// Optimized drag preview component using the SetlistSongRow
const DragPreview = React.memo(function DragPreview({
  songId,
  setlist,
}: {
  songId: string;
  setlist: Setlist;
}) {
  const song = setlist.songs.find((s) => s.id === songId);
  const songIndex = setlist.songs.findIndex((s) => s.id === songId);

  if (!song) return null;

  return (
    <div
      className="flex items-center gap-3 rounded-md border p-3 bg-background shadow-2xl opacity-95 cursor-grabbing z-50"
      style={{
        transform: "rotate(5deg)",
        boxShadow:
          "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
      }}
    >
      <GripVertical className="h-5 w-5 text-muted-foreground" />
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground aspect-square">
        {songIndex + 1}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{song.song.title}</p>
        {song.song.artist && (
          <p className="text-xs text-muted-foreground">{song.song.artist}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {song.key && `Key: ${song.key}`}
          {song.key && song.notes && " • "}
          {song.notes}
        </p>
      </div>
    </div>
  );
});

export default function SetlistPage() {
  const { id } = useParams<{ id: string }>();
  const { data: setlist, isLoading } = useGetSetlist({ setlistId: id });
  const updateSetlistMutation = useUpdateSetlist();
  const { songs } = useSongs();
  const navigate = useNavigate();

  // State management
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [editingSong, setEditingSong] = useState<SetlistSong | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showFilesPopover, setShowFilesPopover] = useState(false);

  const songsNotInSetlist = useMemo(
    () =>
      songs.filter((song) => !setlist?.songs.some((s) => s.songId === song.id)),
    [songs, setlist]
  );

  // Create a stable reference to setlist.songs for callbacks
  const setlistSongsJson = useMemo(
    () => JSON.stringify(setlist?.songs ?? []),
    [setlist?.songs]
  );

  // Memoize the filter and resolver functions to prevent infinite loops
  const songFilter = useCallback(
    (song: Song) => !!setlist?.songs.some((s) => s.songId === song.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setlistSongsJson]
  );

  const keyResolver = useCallback(
    (song: Song) => {
      const setlistSong = setlist?.songs.find((s) => s.songId === song.id);
      return setlistSong?.key || song.default_key || "";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setlistSongsJson]
  );

  const songOrderer = useCallback(
    (songs: Song[]) => {
      if (!setlist) return songs;

      // Create a map of song IDs to their order in the setlist
      const orderMap = new Map<string, number>();
      setlist.songs.forEach((setlistSong) => {
        orderMap.set(setlistSong.songId, setlistSong.order);
      });

      // Sort songs by their order in the setlist
      return [...songs].sort((a, b) => {
        const orderA = orderMap.get(a.id) || 0;
        const orderB = orderMap.get(b.id) || 0;
        return orderA - orderB;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setlistSongsJson]
  );

  // Use the new hook for file slides - always provide stable filter function
  const stableSongFilter = useCallback(
    (song: Song) => {
      if (!setlist) return false;
      return songFilter(song);
    },
    [setlist, songFilter]
  );

  const { flattenedSlides, isLoading: isFileSlidesLoading } = useFileSlides({
    songs,
    songFilter: stableSongFilter,
    keyResolver,
    songOrderer,
  });

  // DnD Kit sensors for touch and keyboard support with mobile optimizations
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms delay before drag starts on touch
        tolerance: 5, // 5px tolerance for touch movement
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!setlist && !isLoading) {
      navigate("/setlists");
      toast.error("Setlist not found");
    }
  }, [setlist, navigate, isLoading]);

  // Cleanup effect to re-enable scrolling if component unmounts during drag
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleEditSetlist = async (updatedSetlist: Partial<Setlist>) => {
    if (!setlist || !updateSetlistMutation) return;
    try {
      await updateSetlistMutation.mutateAsync({
        id: setlist.id,
        payload: {
          name: updatedSetlist.name,
          date: updatedSetlist.date,
          songs: setlist.songs,
        },
      });
      setIsEditingMetadata(false);
      toast.success("Setlist updated");
    } catch {
      toast.error("Error updating setlist");
    }
  };

  const handleSaveSong = useCallback(
    async (songId: string, updates: Partial<SetlistSong>) => {
      if (!setlist || !updateSetlistMutation) return;
      try {
        const updatedSongs = setlist.songs.map((s) =>
          s.id === songId ? { ...s, ...updates } : s
        );
        await updateSetlistMutation.mutateAsync({
          id: setlist.id,
          payload: { songs: updatedSongs },
        });
        setEditingSong(null);
        toast.success("Song updated");
      } catch {
        toast.error("Error updating song");
      }
    },
    [setlist, updateSetlistMutation]
  );

  const handleAddNewSong = useCallback(
    async (newSong: SetlistSong) => {
      if (!setlist || !updateSetlistMutation) return;
      try {
        const updatedSongs = [...setlist.songs, newSong];
        await updateSetlistMutation.mutateAsync({
          id: setlist.id,
          payload: { songs: updatedSongs },
        });
      } catch {
        toast.error("Error adding song");
      }
    },
    [setlist, updateSetlistMutation]
  );

  const handleRemoveSong = useCallback(
    async (songId: string) => {
      if (!setlist || !updateSetlistMutation) return;
      try {
        const updatedSongs = setlist.songs
          .filter((s) => s.id !== songId)
          .map((s, idx) => ({ ...s, order: idx + 1 }));
        await updateSetlistMutation.mutateAsync({
          id: setlist.id,
          payload: { songs: updatedSongs },
        });
        toast.success("Song removed");
      } catch {
        toast.error("Error removing song");
      }
    },
    [setlist, updateSetlistMutation]
  );

  const handleReorderSong = useCallback(
    async (songId: string, direction: "up" | "down") => {
      if (!setlist || !updateSetlistMutation) return;
      const songIndex = setlist.songs.findIndex((s) => s.id === songId);
      if (songIndex === -1) return;
      const newIndex = direction === "up" ? songIndex - 1 : songIndex + 1;
      if (newIndex < 0 || newIndex >= setlist.songs.length) return;

      try {
        const updatedSongs = arrayMove(setlist.songs, songIndex, newIndex);
        const reorderedSongs = updatedSongs.map((s, idx) => ({
          ...s,
          order: idx + 1,
        }));
        await updateSetlistMutation.mutateAsync({
          id: setlist.id,
          payload: { songs: reorderedSongs },
        });
        toast.success("Order updated");
      } catch {
        toast.error("Error updating song order");
      }
    },
    [setlist, updateSetlistMutation]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    // Prevent body scrolling during drag on mobile
    document.body.style.overflow = "hidden";
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id && setlist) {
        const oldIndex = setlist.songs.findIndex(
          (song) => song.id === active.id
        );
        let newIndex: number;

        if (over.id === "end-drop-zone") {
          // Drop at the end of the list
          newIndex = setlist.songs.length - 1;
        } else {
          // Drop on another song
          newIndex = setlist.songs.findIndex((song) => song.id === over.id);
        }

        // Only proceed if we're actually moving to a different position
        if (oldIndex !== newIndex) {
          try {
            const updatedSongs = arrayMove(setlist.songs, oldIndex, newIndex);
            const reorderedSongs = updatedSongs.map((s, idx) => ({
              ...s,
              order: idx + 1,
            }));
            await updateSetlistMutation.mutateAsync({
              id: setlist.id,
              payload: { songs: reorderedSongs },
            });
            toast.success("Songs reordered");
          } catch {
            toast.error("Error reordering songs");
          }
        }
      }
      setActiveId(null);
      // Re-enable body scrolling after drag
      document.body.style.overflow = "";
    },
    [setlist, updateSetlistMutation]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    // Re-enable body scrolling if drag is cancelled
    document.body.style.overflow = "";
  }, []);

  const handleSaveNotesInViewer = useCallback(
    async (songId: string, notes: string) => {
      if (!setlist || !updateSetlistMutation) return;
      const updatedSongs = setlist.songs.map((song) => {
        if (song.songId === songId) {
          return { ...song, notes };
        }
        return song;
      });
      try {
        await updateSetlistMutation.mutateAsync({
          id: setlist.id,
          payload: { songs: updatedSongs },
        });
        toast.success("Notes saved");
      } catch {
        toast.error("Failed to save notes");
      }
    },
    [setlist, updateSetlistMutation]
  );

  // Memoize callbacks passed to child components
  const handleShowCarousel = useCallback((open: boolean) => {
    setShowCarousel(open);
  }, []);

  const handleCloseEditDialog = useCallback((isOpen: boolean) => {
    if (!isOpen) setEditingSong(null);
  }, []);

  const handleShowAddModal = useCallback(() => {
    setShowAddSongModal(true);
  }, []);

  const handleShowEditMetadata = useCallback(() => {
    setIsEditingMetadata(true);
  }, []);

  const handleShowCarouselButton = useCallback(() => {
    setShowCarousel(true);
  }, []);

  // Memoize arrays passed as props to prevent unnecessary re-renders
  const sortableItems = useMemo(
    () => [...(setlist?.songs.map((song) => song.id) ?? []), "end-drop-zone"],
    [setlist?.songs]
  );

  const setlistArray = useMemo(() => (setlist ? [setlist] : []), [setlist]);

  const breadcrumbItems = useMemo(
    () => [
      { href: "/setlists", label: "Setlists" },
      ...(setlist
        ? [{ href: `/setlist/${setlist.id}`, label: setlist.name }]
        : []),
    ],
    [setlist]
  );

  // Memoize flattenedSlides length check to prevent flicker
  const hasSlides = useMemo(
    () => flattenedSlides.length > 0,
    [flattenedSlides.length]
  );

  // Compute file availability per setlist song for the selected key
  const fileAvailabilityBySongId = useMemo(() => {
    const availability: Record<string, boolean> = {};
    if (!setlist) return availability;
    for (const setlistSong of setlist.songs) {
      const details = songs.find((s) => s.id === setlistSong.songId);
      if (!details) {
        availability[setlistSong.id] = false;
        continue;
      }
      const selectedKey = (setlistSong.key ?? "").trim();
      if (!selectedKey) {
        availability[setlistSong.id] = false;
        continue;
      }
      const keyed = (getAllKeyedFiles(details) ?? {}) as Record<
        string,
        unknown[] | undefined
      >;
      const count = Array.isArray(keyed[selectedKey])
        ? (keyed[selectedKey] as unknown[]).length
        : 0;
      availability[setlistSong.id] = count > 0;
    }
    return availability;
  }, [setlist, songs]);

  // Calculate file status for contextual messaging
  const fileStatus = useMemo(() => {
    if (!setlist || setlist.songs.length === 0) {
      return { hasFiles: false, message: "" };
    }

    const songsWithFiles = setlist.songs.filter((setlistSong) => {
      const song = songs.find((s) => s.id === setlistSong.songId);
      if (!song) return false;

      // Check if song has files (legacy or keyed)
      const hasLegacyFiles = (song.files?.length ?? 0) > 0;
      const hasKeyedFiles =
        song.keyedFiles && Object.keys(song.keyedFiles).length > 0;

      return hasLegacyFiles || hasKeyedFiles;
    });

    if (songsWithFiles.length === 0) {
      return {
        hasFiles: false,
        message: "Add files to songs to view them here",
      };
    }

    const songsWithKeys = setlist.songs.filter((setlistSong) => {
      return setlistSong.key && setlistSong.key.trim() !== "";
    });

    if (songsWithKeys.length === 0 && songsWithFiles.length > 0) {
      return {
        hasFiles: false,
        message: "Select keys for songs to view files",
      };
    }

    return { hasFiles: true, message: "" };
  }, [setlist, songs]);

  // Show loading state only if we truly don't have data yet
  // Prioritize showing cached data over loading state to prevent flicker on remount
  // isLoading can flicker on remount even with cached data, so check data first
  if (!setlist && isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Loading..." />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading setlist...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!setlist) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <Header title={setlist.name} />

      {showCarousel && (
        <FileViewer
          isOpen={showCarousel}
          onOpenChange={handleShowCarousel}
          slides={flattenedSlides}
          onSaveNotes={handleSaveNotesInViewer}
        />
      )}

      <AddSongDialog
        isOpen={showAddSongModal}
        onOpenChange={setShowAddSongModal}
        setlist={setlist}
        songsNotInSetlist={songsNotInSetlist}
        onSongAdded={handleAddNewSong}
        setlists={setlistArray}
      />

      <EditSongDialog
        editingSong={editingSong}
        onOpenChange={handleCloseEditDialog}
        onSave={handleSaveSong}
      />

      <SetlistForm
        open={isEditingMetadata}
        onOpenChange={setIsEditingMetadata}
        setlist={setlist}
        onSubmit={handleEditSetlist}
      />

      <div className="flex-1 space-y-8 overflow-auto bg-background/90 p-4 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* Minimal setlist summary */}
        <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight truncate">
              {setlist.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {setlist.date && (
                <span>{format(new Date(setlist.date), "MMM d, yyyy")}</span>
              )}
              <span>
                {setlist.songs.length}{" "}
                {setlist.songs.length === 1 ? "song" : "songs"}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShowEditMetadata}
            className="h-8 w-8 shrink-0"
          >
            <EditIcon className="h-4 w-4" />
            <span className="sr-only">Edit setlist</span>
          </Button>
        </div>

        <Card className="!mt-4 border border-white/10 bg-card/80 shadow-glass">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold">Songs</h2>

                <div className="flex items-center gap-2">
                  {setlist.songs.length > 0 && (
                    <Popover
                      open={showFilesPopover}
                      onOpenChange={setShowFilesPopover}
                    >
                      <PopoverTrigger asChild>
                        <div>
                          <Button
                            variant="outline"
                            onClick={(e) => {
                              if (!hasSlides || isFileSlidesLoading) {
                                e.preventDefault();
                                setShowFilesPopover(true);
                              } else {
                                handleShowCarouselButton();
                              }
                            }}
                            className={cn(
                              "gap-2",
                              (!hasSlides || isFileSlidesLoading) &&
                                "opacity-50 cursor-not-allowed"
                            )}
                            aria-disabled={!hasSlides || isFileSlidesLoading}
                          >
                            <FilesIcon className="h-4 w-4" />
                            View Files
                          </Button>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        side="top"
                        align="end"
                        className="w-auto p-2 text-xs"
                      >
                        <p>
                          {isFileSlidesLoading
                            ? "Loading files..."
                            : fileStatus.message || "No files available"}
                        </p>
                      </PopoverContent>
                    </Popover>
                  )}
                  <Button variant="secondary" onClick={handleShowAddModal}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Song
                  </Button>
                </div>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                onDragStart={handleDragStart}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={sortableItems}
                  strategy={verticalListSortingStrategy}
                >
                  <SetlistSongList
                    songs={setlist.songs}
                    onReorder={handleReorderSong}
                    onEdit={setEditingSong}
                    onRemove={handleRemoveSong}
                    onAdd={handleShowAddModal}
                    fileAvailabilityBySongId={fileAvailabilityBySongId}
                  />
                </SortableContext>

                <DragOverlay>
                  {activeId ? (
                    <DragPreview songId={activeId} setlist={setlist} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating OneTouchSongs Button */}
      <OneTouchSongs onSaveNotes={handleSaveNotesInViewer} asFloatingButton />
    </div>
  );
}
