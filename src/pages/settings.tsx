import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useSettings } from "@/hooks/use-settings";
import { useSongs } from "@/hooks/use-songs";
import { toast } from "sonner";
import { Song } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { OneTouchSongItem as QuickAccessSongItem } from "@/components/settings/one-touch-song-item";
import { SongSearchCombobox } from "@/components/songs/song-search-combobox";
import { JoinCodeManager } from "@/components/organization/join-code-manager";
import {
  PlusIcon,
  StarIcon,
  SparklesIcon,
  GripVerticalIcon,
  UsersIcon,
} from "lucide-react";

const MAX_QUICK_ACCESS_SONGS = 3;

function QuickAccessSongSlot({
  index,
  song,
  onRemove,
  onAdd,
  songs,
  existingSongIds,
  isLoading,
}: {
  index: number;
  song?: Song;
  onRemove?: () => void;
  onAdd: (songId: string) => void;
  songs: Song[];
  existingSongIds: string[];
  isLoading: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);

  const availableSongs = songs.filter(
    (s) => !existingSongIds.includes(s.id) || s.id === song?.id
  );

  const handleAddSong = (songId: string) => {
    onAdd(songId);
    setIsAdding(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 animate-pulse">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
          <span className="text-sm font-semibold text-muted-foreground">
            {index + 1}
          </span>
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-white/5" />
          <div className="h-3 w-24 rounded bg-white/5" />
        </div>
      </div>
    );
  }

  // Empty slot - show add UI
  if (!song) {
    if (isAdding) {
      return (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/30">
              <span className="text-sm font-semibold text-primary">
                {index + 1}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">
              Choose a song
            </span>
          </div>
          <SongSearchCombobox
            songs={availableSongs}
            onSelect={handleAddSong}
            placeholder="Search songs..."
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-muted-foreground"
            onClick={() => setIsAdding(false)}
          >
            Cancel
          </Button>
        </div>
      );
    }

    return (
      <button
        onClick={() => setIsAdding(true)}
        className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-left transition-all duration-200 hover:border-primary/30 hover:bg-primary/5"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 transition-colors group-hover:bg-primary/10 group-hover:ring-2 group-hover:ring-primary/30">
          <span className="text-sm font-semibold text-muted-foreground transition-colors group-hover:text-primary">
            {index + 1}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            Add song to slot {index + 1}
          </p>
          <p className="text-xs text-muted-foreground/60">
            Click to search your library
          </p>
        </div>
        <PlusIcon className="h-5 w-5 text-muted-foreground/40 transition-all group-hover:scale-110 group-hover:text-primary" />
      </button>
    );
  }

  // Filled slot - show sortable item
  return (
    <QuickAccessSongItem
      song={song}
      index={index}
      onRemove={onRemove!}
    />
  );
}

export default function Settings() {
  const {
    settings,
    updateOneTouchSongs,
    isLoading: isSettingsLoading,
  } = useSettings();
  const { songs } = useSongs();

  // Get the actual song objects for the quick access songs
  const quickAccessSongs = settings.oneTouchSongs.songIds
    .map((id) => songs.find((song) => song.id === id))
    .filter((song) => song !== undefined) as Song[];

  // DnD setup for reordering
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = quickAccessSongs.findIndex((song) => song.id === active.id);
      const newIndex = quickAccessSongs.findIndex((song) => song.id === over.id);

      const newOrder = arrayMove(quickAccessSongs, oldIndex, newIndex);
      updateOneTouchSongs(newOrder.map((song) => song.id))
        .then(() => {
          toast.success("Reordered", {
            description: "Quick access order updated",
          });
        })
        .catch(() => {
          toast.error("Failed to reorder", {
            description: "Please try again",
          });
        });
    }
  };

  const handleAddSong = (songId: string, slotIndex: number) => {
    if (!songId) return;

    // Check if song is already in the list
    if (settings.oneTouchSongs.songIds.includes(songId)) {
      toast.error("Already added", {
        description: "This song is already in your quick access list",
      });
      return;
    }

    // Insert at the correct position
    const newSongIds = [...settings.oneTouchSongs.songIds];
    newSongIds.splice(slotIndex, 0, songId);

    updateOneTouchSongs(newSongIds.slice(0, MAX_QUICK_ACCESS_SONGS))
      .then(() => {
        const song = songs.find((s) => s.id === songId);
        toast.success("Added to quick access", {
          description: song ? `"${song.title}" is now in slot ${slotIndex + 1}` : "Song added",
        });
      })
      .catch(() => {
        toast.error("Failed to add", {
          description: "Please try again",
        });
      });
  };

  const handleRemoveSong = (songId: string) => {
    const song = songs.find((s) => s.id === songId);
    const newSongIds = settings.oneTouchSongs.songIds.filter(
      (id) => id !== songId
    );

    updateOneTouchSongs(newSongIds)
      .then(() => {
        toast.success("Removed", {
          description: song ? `"${song.title}" removed from quick access` : "Song removed",
        });
      })
      .catch(() => {
        toast.error("Failed to remove", {
          description: "Please try again",
        });
      });
  };

  // Create slots array - filled slots + empty slots up to MAX
  const slots = Array.from({ length: MAX_QUICK_ACCESS_SONGS }, (_, i) => {
    return quickAccessSongs[i] || null;
  });

  return (
    <AppLayout title="Settings">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Quick Access Songs Section */}
        <section className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 ring-1 ring-yellow-500/30">
              <StarIcon className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Quick Access Songs</h2>
              <p className="text-sm text-muted-foreground">
                Instantly jump to your go-to songs from anywhere
              </p>
            </div>
          </div>

          {/* Main Card */}
          <Card className="border-white/10 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl">
            <CardContent className="p-0">
              {/* Info Banner */}
              <div className="flex items-start gap-3 border-b border-white/5 bg-white/[0.02] p-4 rounded-t-xl">
                <SparklesIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  These songs appear in the sidebar for quick access during live sessions. 
                  <span className="text-foreground font-medium"> Drag to reorder</span> your favorites.
                </p>
              </div>

              {/* Slots List */}
              <div className="p-4 space-y-3">
                {quickAccessSongs.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={quickAccessSongs.map((song) => song.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {slots.map((song, index) => (
                          <QuickAccessSongSlot
                            key={song?.id || `empty-${index}`}
                            index={index}
                            song={song || undefined}
                            onRemove={song ? () => handleRemoveSong(song.id) : undefined}
                            onAdd={(songId) => handleAddSong(songId, index)}
                            songs={songs}
                            existingSongIds={settings.oneTouchSongs.songIds}
                            isLoading={isSettingsLoading}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="space-y-3">
                    {slots.map((_, index) => (
                      <QuickAccessSongSlot
                        key={`empty-${index}`}
                        index={index}
                        onAdd={(songId) => handleAddSong(songId, index)}
                        songs={songs}
                        existingSongIds={[]}
                        isLoading={isSettingsLoading}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Help Footer */}
              {quickAccessSongs.length > 0 && (
                <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.02] px-4 py-3 rounded-b-xl">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <GripVerticalIcon className="h-3.5 w-3.5" />
                    <span>Drag songs to reorder</span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {quickAccessSongs.length}/{MAX_QUICK_ACCESS_SONGS} slots used
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Team Management Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 ring-1 ring-blue-500/30">
              <UsersIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Team Management</h2>
              <p className="text-sm text-muted-foreground">
                Invite members to collaborate on setlists
              </p>
            </div>
          </div>

          <JoinCodeManager />
        </section>
      </div>
    </AppLayout>
  );
}
