import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useSettings } from "@/hooks/use-settings";
import { useSongs } from "@/hooks/use-songs";
import { toast } from "@/hooks/use-toast";
import { Song } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { OneTouchSongItem } from "@/components/settings/one-touch-song-item";
import { SongSearchCombobox } from "@/components/songs/song-search-combobox";
import { PlusIcon, StarIcon, XIcon } from "lucide-react";

export default function Settings() {
  const {
    settings,
    updateOneTouchSongs,
    isLoading: isSettingsLoading,
  } = useSettings();
  const { songs } = useSongs();
  const [isAdding, setIsAdding] = useState(false);

  // Get the actual song objects for the one-touch songs
  const oneTouchSongs = settings.oneTouchSongs.songIds
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
      const oldIndex = oneTouchSongs.findIndex((song) => song.id === active.id);
      const newIndex = oneTouchSongs.findIndex((song) => song.id === over.id);

      const newOrder = arrayMove(oneTouchSongs, oldIndex, newIndex);
      updateOneTouchSongs(newOrder.map((song) => song.id))
        .then(() => {
          toast({
            title: "Songs reordered",
            description: "Your One-Touch Songs have been reordered",
          });
        })
        .catch(() => {
          toast({
            title: "Error",
            description: "Failed to reorder songs",
            variant: "destructive",
          });
        });
    }
  };

  const handleAddSong = (songId: string) => {
    if (!songId) return;

    // Check if song is already in the list
    if (settings.oneTouchSongs.songIds.includes(songId)) {
      toast({
        title: "Song already added",
        description: "This song is already in your One-Touch Songs",
        variant: "destructive",
      });
      return;
    }

    // Add the song to the list (limited to 3)
    const newSongIds = [...settings.oneTouchSongs.songIds, songId].slice(0, 3);

    updateOneTouchSongs(newSongIds)
      .then(() => {
        toast({
          title: "Song added",
          description: "Song added to your One-Touch Songs",
        });
        setIsAdding(false);
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to add song",
          variant: "destructive",
        });
      });
  };

  const handleRemoveSong = (songId: string) => {
    const newSongIds = settings.oneTouchSongs.songIds.filter(
      (id) => id !== songId
    );

    updateOneTouchSongs(newSongIds)
      .then(() => {
        toast({
          title: "Song removed",
          description: "Song removed from your One-Touch Songs",
        });
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to remove song",
          variant: "destructive",
        });
      });
  };

  return (
    <>
      <Header title="Settings" />

      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StarIcon className="h-5 w-5 text-yellow-500" />
                One-Touch Songs
              </CardTitle>
              <CardDescription>
                Add up to three songs that you can quickly access from anywhere
                in the app
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSettingsLoading ? (
                <div className="flex justify-center p-4">
                  <div className="animate-pulse">Loading...</div>
                </div>
              ) : (
                <>
                  {oneTouchSongs.length === 0 && !isAdding ? (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground mb-4">
                        No One-Touch Songs added yet
                      </p>
                      <Button
                        onClick={() => setIsAdding(true)}
                        variant="outline"
                        className="gap-2"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add Your First Song
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {oneTouchSongs.length > 0 && (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={oneTouchSongs.map((song) => song.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {oneTouchSongs.map((song, index) => (
                                <OneTouchSongItem
                                  key={song.id}
                                  song={song}
                                  index={index}
                                  onRemove={() => handleRemoveSong(song.id)}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}

                      {isAdding ? (
                        <div className="pt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-medium">Add a song</h3>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setIsAdding(false)}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                          <SongSearchCombobox
                            songs={songs}
                            onSelect={handleAddSong}
                            placeholder="Search for a song to add..."
                          />
                        </div>
                      ) : (
                        oneTouchSongs.length < 3 && (
                          <Button
                            onClick={() => setIsAdding(true)}
                            variant="outline"
                            size="sm"
                            className="gap-2 mt-2"
                          >
                            <PlusIcon className="h-4 w-4" />
                            Add Song ({oneTouchSongs.length}/3)
                          </Button>
                        )
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
