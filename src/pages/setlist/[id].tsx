import { useParams, useNavigate } from "react-router-dom";
import { useSetlists } from "@/hooks/use-setlists";
import { useSongs } from "@/hooks/use-songs";
import { useFileSlides } from "@/hooks/use-file-slides";
import { toast } from "sonner";
import { SetlistSong, Setlist, Song } from "@/types";
import { FilesIcon, PlusIcon, GripVertical } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import React from "react";
import { AddSongDialog } from "@/components/setlists/AddSongDialog";
import { EditSongDialog } from "@/components/setlists/EditSongDialog";
import { SetlistSongList } from "@/components/setlists/SetlistSongList";
import { SetlistInfoCard } from "@/components/setlists/SetlistInfoCard";
import { FileViewer } from "@/components/setlists/FileViewer";
import { Header } from "@/components/layout/header";
import { OneTouchSongs } from "@/components/setlists/one-touch-songs";
import { SetlistForm } from "@/components/setlists/setlist-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const { setlists, updateSetlist, updateSetlistSongs, isLoading } =
    useSetlists();
  const { songs } = useSongs();
  const navigate = useNavigate();

  // State management
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [editingSong, setEditingSong] = useState<SetlistSong | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Derived state
  const setlist = useMemo(
    () => setlists.find((s) => s.id === id),
    [setlists, id]
  );

  const songsNotInSetlist = useMemo(
    () =>
      songs.filter((song) => !setlist?.songs.some((s) => s.songId === song.id)),
    [songs, setlist]
  );

  // Memoize the filter and resolver functions to prevent infinite loops
  const songFilter = useCallback(
    (song: Song) => !!setlist?.songs.some((s) => s.songId === song.id),
    [setlist?.songs]
  );

  const keyResolver = useCallback(
    (song: Song) => {
      const setlistSong = setlist?.songs.find((s) => s.songId === song.id);
      return setlistSong?.key || "default";
    },
    [setlist?.songs]
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
    [setlist]
  );

  // Use the new hook for file slides
  const { flattenedSlides } = useFileSlides({
    songs,
    songFilter: setlist ? songFilter : undefined,
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
    if (!setlist) return;
    try {
      await updateSetlist(setlist.id, {
        ...updatedSetlist,
        songs: setlist.songs,
      });
      setIsEditingMetadata(false);
      toast.success("Setlist updated");
    } catch {
      toast.error("Error updating setlist");
    }
  };

  const handleSaveSong = useCallback(
    async (songId: string, updates: Partial<SetlistSong>) => {
      if (!setlist) return;
      try {
        const updatedSongs = setlist.songs.map((s) =>
          s.id === songId ? { ...s, ...updates } : s
        );
        await updateSetlistSongs(setlist.id, updatedSongs);
        setEditingSong(null);
        toast.success("Song updated");
      } catch {
        toast.error("Error updating song");
      }
    },
    [setlist, updateSetlistSongs]
  );

  const handleAddNewSong = useCallback(
    async (newSong: SetlistSong) => {
      if (!setlist) return;
      try {
        const updatedSongs = [...setlist.songs, newSong];
        await updateSetlistSongs(setlist.id, updatedSongs);
      } catch {
        toast.error("Error adding song");
      }
    },
    [setlist, updateSetlistSongs]
  );

  const handleRemoveSong = useCallback(
    async (songId: string) => {
      if (!setlist) return;
      try {
        const updatedSongs = setlist.songs
          .filter((s) => s.id !== songId)
          .map((s, idx) => ({ ...s, order: idx + 1 }));
        await updateSetlistSongs(setlist.id, updatedSongs);
        toast.success("Song removed");
      } catch {
        toast.error("Error removing song");
      }
    },
    [setlist, updateSetlistSongs]
  );

  const handleReorderSong = useCallback(
    async (songId: string, direction: "up" | "down") => {
      if (!setlist) return;
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
        await updateSetlistSongs(setlist.id, reorderedSongs);
        toast.success("Order updated");
      } catch {
        toast.error("Error updating song order");
      }
    },
    [setlist, updateSetlistSongs]
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
            await updateSetlistSongs(setlist.id, reorderedSongs);
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
    [setlist, updateSetlistSongs]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    // Re-enable body scrolling if drag is cancelled
    document.body.style.overflow = "";
  }, []);

  const handleSaveNotesInViewer = async (songId: string, notes: string) => {
    if (!setlist) return;
    const updatedSongs = setlist.songs.map((song) => {
      if (song.songId === songId) {
        return { ...song, notes };
      }
      return song;
    });
    try {
      await updateSetlistSongs(setlist.id, updatedSongs);
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    }
  };

  if (!setlist) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex flex-col">
      <Header title={setlist.name} />

      {showCarousel && (
        <FileViewer
          isOpen={showCarousel}
          onOpenChange={setShowCarousel}
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
        setlists={setlists}
      />

      <EditSongDialog
        editingSong={editingSong}
        onOpenChange={(isOpen) => !isOpen && setEditingSong(null)}
        onSave={handleSaveSong}
      />

      <Dialog open={isEditingMetadata} onOpenChange={setIsEditingMetadata}>
        <DialogContent className="sm:max-w-md">
          <SetlistForm
            setlist={setlist}
            onSubmit={handleEditSetlist}
            onCancel={() => setIsEditingMetadata(false)}
          />
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  onDragStart={handleDragStart}
                  onDragCancel={handleDragCancel}
                >
                  <SortableContext
                    items={[
                      ...setlist.songs.map((song) => song.id),
                      "end-drop-zone",
                    ]}
                    strategy={verticalListSortingStrategy}
                  >
                    <SetlistSongList
                      songs={setlist.songs}
                      onReorder={handleReorderSong}
                      onEdit={setEditingSong}
                      onRemove={handleRemoveSong}
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

          <div className="space-y-4">
            <div className="flex gap-2 flex-col">
              <Button
                size="xl"
                className="flex-1 flex gap-2 border-none min-h-12"
                onClick={() => setShowCarousel(true)}
                disabled={flattenedSlides.length === 0}
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

            <OneTouchSongs onSaveNotes={handleSaveNotesInViewer} />

            <SetlistInfoCard
              setlist={setlist}
              onEdit={() => setIsEditingMetadata(true)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
