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
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  MusicIcon,
  Plus,
  StarIcon,
  CalendarIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Song } from "@/types";
import { SongForm } from "./song-form";
import { useSettings } from "@/hooks/use-settings";
import { toast } from "sonner";
import { SongSearchCombobox } from "./song-search-combobox";
import { cn } from "@/lib/utils";

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

  const handleOpenEditForm = (song: Song) => {
    // Defer opening so the dropdown can fully close/unmount first
    setEditingSong(song);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingSong(null);
  };

  const toggleOneTouch = (song: Song, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isOneTouch = settings.oneTouchSongs.songIds.includes(song.id);
    const newSongIds = isOneTouch
      ? settings.oneTouchSongs.songIds.filter((id) => id !== song.id)
      : [...settings.oneTouchSongs.songIds, song.id].slice(0, 3);

    updateOneTouchSongs(newSongIds)
      .then(() => {
        toast(
          isOneTouch
            ? "Removed from Quick Access"
            : "Added to Quick Access",
          {
            description: isOneTouch
              ? `"${song.title}" removed`
              : `"${song.title}" added`,
          }
        );
      })
      .catch(() => {
        toast.error("Couldn't update Quick Access");
      });
  };

  const renderActionButtons = (song: Song) => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
          settings.oneTouchSongs.songIds.includes(song.id) &&
            "text-yellow-500 opacity-100"
        )}
        onClick={(e) => toggleOneTouch(song, e)}
      >
        <StarIcon className="h-4 w-4" />
        <span className="sr-only">Toggle Quick Access</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => handleOpenEditForm(song)}>
            Edit Song
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
            onSelect={() => onDeleteSong(song.id)}
          >
            Delete Song
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Enhanced Toolbar: Single row on mobile/desktop */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <SongSearchCombobox songs={songs} />
        </div>

        {/* Desktop: Full Button */}
        <Button
          onClick={() => setShowAddForm(true)}
          className="hidden sm:flex shadow-glow-sm gap-2"
        >
          <Plus className="h-4 w-4" />
          New Song
        </Button>

        {/* Mobile: Icon Button */}
        <Button
          onClick={() => setShowAddForm(true)}
          size="icon"
          className="sm:hidden shadow-glow-sm shrink-0 h-10 w-10 rounded-lg"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {songs.length === 0 ? (
        <Card className="border-dashed border-white/10 bg-white/5">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-white/5 p-4">
              <MusicIcon className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No songs yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Add your first song to start building your library.
            </p>
            <Button
              onClick={() => setShowAddForm(true)}
              variant="outline"
              className="mt-6"
            >
              Add Song
            </Button>
          </div>
        </Card>
      ) : (
        <AnimatePresence>
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-4">
            {songs.map((song) => {
              const hasKeyHistory = song.keyHistory && song.keyHistory.length > 0;
              const isOneTouch = settings.oneTouchSongs.songIds.includes(song.id);

              return (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border border-white/10 bg-card/50 p-4 shadow-sm backdrop-blur-md transition-all",
                    isOneTouch && "shadow-glow-sm border-yellow-500/20"
                  )}
                >
                  <Link to={`/song/${song.id}`} className="block">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1 min-w-0">
                        <h3 className="font-semibold text-lg leading-tight text-foreground line-clamp-1">
                          {song.title}
                        </h3>
                        {song.artist && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {song.artist}
                          </p>
                        )}
                      </div>

                      {isOneTouch && (
                        <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 pointer-events-none shrink-0">
                          <StarIcon className="h-3 w-3 mr-1" />
                          Quick
                        </Badge>
                      )}
                    </div>

                    {song.notes && (
                      <p className="mt-3 text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
                        {song.notes}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {hasKeyHistory ? (
                          <>
                            <Badge
                              variant="secondary"
                              className="text-xs font-medium"
                            >
                              {song.keyHistory![0].key}
                            </Badge>
                            <span>
                              {format(
                                new Date(song.keyHistory![0].playedAt),
                                "MMM d"
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground/60">
                            Never played
                          </span>
                        )}
                      </div>
                      {/* Mobile Actions */}
                      <div onClick={(e) => e.preventDefault()}>
                        {renderActionButtons(song)}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block rounded-xl border border-white/10 bg-card/50 backdrop-blur-xl shadow-glass overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead className="w-[30%] pl-6">Song</TableHead>
                  <TableHead className="w-[20%]">Artist</TableHead>
                  <TableHead className="w-[20%]">Last Played</TableHead>
                  <TableHead className="w-[20%]">Updated</TableHead>
                  <TableHead className="w-[10%] text-right pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {songs.map((song) => {
                  const hasKeyHistory =
                    song.keyHistory && song.keyHistory.length > 0;
                  const isOneTouch = settings.oneTouchSongs.songIds.includes(
                    song.id
                  );

                  return (
                    <motion.tr
                      key={song.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group border-white/5 transition-colors hover:bg-white/5"
                    >
                      <TableCell className="pl-6 font-medium">
                        <Link
                          to={`/song/${song.id}`}
                          className="flex items-center gap-3 py-2"
                        >
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
                              isOneTouch
                                ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"
                                : "border-white/10 bg-white/5 text-muted-foreground"
                            )}
                          >
                            {isOneTouch ? (
                              <StarIcon className="h-4 w-4" />
                            ) : (
                              <MusicIcon className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-foreground group-hover:text-primary transition-colors truncate">
                              {song.title}
                            </span>
                            {song.notes && (
                              <span className="text-xs text-muted-foreground/60 truncate block max-w-[200px]">
                                {song.notes}
                              </span>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {song.artist || "—"}
                      </TableCell>
                      <TableCell>
                        {hasKeyHistory ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="text-xs font-medium"
                            >
                              {song.keyHistory![0].key}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(
                                new Date(song.keyHistory![0].playedAt),
                                "MMM d"
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">
                            Never played
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {format(new Date(song.updatedAt), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end">
                          {renderActionButtons(song)}
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </AnimatePresence>
      )}

      {/* Single dialog for both add and edit */}
      <SongForm
        open={showAddForm || Boolean(editingSong)}
        onOpenChange={(open) => {
          if (!open) handleCloseForm();
        }}
        song={editingSong ?? undefined}
        onSubmit={editingSong ? handleEditSubmit : handleAddSubmit}
      />
    </div>
  );
}
