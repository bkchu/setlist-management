import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, MusicIcon, PlusIcon, StarIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Song } from "@/types";
import { SongForm } from "./song-form";
import { useSettings } from "@/hooks/use-settings";
import { toast } from "sonner";

interface SongListProps {
  songs: Song[];
  onAddSong: (song: Partial<Song>) => void;
  onEditSong: (id: string, song: Partial<Song>) => void;
  onDeleteSong: (id: string) => void;
}

export function SongList({
  songs,
  onAddSong,
  onEditSong,
  onDeleteSong,
}: SongListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const { settings, updateOneTouchSongs } = useSettings();

  const handleAddSubmit = async (songData: Partial<Song>) => {
    await Promise.resolve(onAddSong(songData));
    setShowAddForm(false);
  };

  const handleEditSubmit = async (songData: Partial<Song>) => {
    if (editingSong) {
      await Promise.resolve(onEditSong(editingSong.id, songData));
      setEditingSong(null);
    }
  };

  const renderActionButtons = (song: Song) => (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className={
          settings.oneTouchSongs.songIds.includes(song.id)
            ? "text-yellow-500"
            : ""
        }
        onClick={() => {
          const isOneTouch = settings.oneTouchSongs.songIds.includes(song.id);
          const newSongIds = isOneTouch
            ? settings.oneTouchSongs.songIds.filter((id) => id !== song.id)
            : [...settings.oneTouchSongs.songIds, song.id].slice(0, 3);

          updateOneTouchSongs(newSongIds)
            .then(() => {
              toast(
                isOneTouch
                  ? "Removed from One-Touch Songs"
                  : "Added to One-Touch Songs",
                {
                  description: isOneTouch
                    ? `"${song.title}" has been removed from your One-Touch Songs`
                    : `"${song.title}" has been added to your One-Touch Songs`,
                }
              );
            })
            .catch(() => {
              toast.error("Error", {
                description: "Failed to update One-Touch Songs",
              });
            });
        }}
      >
        <StarIcon className="h-4 w-4" />
        <span className="sr-only">Toggle One-Touch</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditingSong(song)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDeleteSong(song.id)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-lg font-semibold">All Songs</h2>
        <Button size="sm" onClick={() => setShowAddForm(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Song
        </Button>
      </div>

      {songs.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <MusicIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium">No songs found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first song to get started
          </p>
        </div>
      ) : (
        <AnimatePresence>
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {songs.map((song) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/song/${song.id}`}
                      className="block font-medium hover:underline line-clamp-1"
                    >
                      {song.title}
                    </Link>
                    {song.artist && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {song.artist}
                      </p>
                    )}
                  </div>
                  {renderActionButtons(song)}
                </div>

                {song.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {song.notes}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {song.keyHistory && song.keyHistory.length > 0 ? (
                      <>
                        <MusicIcon className="h-3 w-3" />
                        <Badge variant="secondary" className="text-xs">
                          {song.keyHistory[0].key}
                        </Badge>
                        <span>
                          {format(
                            new Date(song.keyHistory[0].playedAt),
                            "MMM d"
                          )}
                        </span>
                      </>
                    ) : (
                      <span>Never played</span>
                    )}
                  </div>
                  <span>
                    Updated {format(new Date(song.updatedAt), "MMM d")}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Last Played</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Last Updated
                  </TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {songs.map((song) => (
                  <motion.tr
                    key={song.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group hover:bg-muted/50"
                  >
                    <TableCell>
                      <Link
                        to={`/song/${song.id}`}
                        className="block font-medium hover:underline"
                      >
                        {song.title}
                      </Link>
                    </TableCell>
                    <TableCell>{song.artist}</TableCell>
                    <TableCell>
                      <span className="line-clamp-1">{song.notes}</span>
                    </TableCell>
                    <TableCell>
                      {song.keyHistory && song.keyHistory.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <MusicIcon className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="secondary">
                            {song.keyHistory[0].key}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(
                              new Date(song.keyHistory[0].playedAt),
                              "MMM d"
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Never played
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(song.updatedAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{renderActionButtons(song)}</TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </AnimatePresence>
      )}

      {/* Self-contained dialogs */}
      <SongForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onSubmit={handleAddSubmit}
      />
      <SongForm
        open={Boolean(editingSong)}
        onOpenChange={(open) => {
          if (!open) setEditingSong(null);
        }}
        song={editingSong ?? undefined}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}
