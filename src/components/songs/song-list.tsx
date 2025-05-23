import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { MoreHorizontal, MusicIcon, PlusIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Song } from "@/types";
import { SongForm } from "./song-form";

interface SongListProps {
  songs: Song[];
  onAddSong: (song: Partial<Song>) => void;
  onEditSong: (id: string, song: Partial<Song>) => void;
  onDeleteSong: (id: string) => void;
}

// Removed unused interface

export function SongList({
  songs,
  onAddSong,
  onEditSong,
  onDeleteSong,
}: SongListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  const handleAddSubmit = (songData: Partial<Song>) => {
    onAddSong(songData);
    setShowAddForm(false);
  };

  const handleEditSubmit = (songData: Partial<Song>) => {
    if (editingSong) {
      onEditSong(editingSong.id, songData);
      setEditingSong(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-lg font-semibold">All Songs</h2>
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Song
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <SongForm
              onSubmit={handleAddSubmit}
              onCancel={() => setShowAddForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
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
            <AnimatePresence>
              {songs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No songs found. Add your first song!
                  </TableCell>
                </TableRow>
              ) : (
                songs.map((song) => (
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
                            {format(new Date(song.keyHistory[0].playedAt), "MMM d")}
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
                    <TableCell>
                      <Dialog
                        open={editingSong?.id === song.id}
                        onOpenChange={(open) => {
                          if (!open) setEditingSong(null);
                        }}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.preventDefault()}
                          >
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                onClick={() => setEditingSong(song)}
                              >
                                Edit
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onDeleteSong(song.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <DialogContent className="sm:max-w-md">
                          <SongForm
                            song={song}
                            onSubmit={handleEditSubmit}
                            onCancel={() => setEditingSong(null)}
                          />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
