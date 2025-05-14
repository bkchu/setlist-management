import { Song } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PlusIcon, CheckIcon, XIcon, MoreHorizontal, MusicIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface SongListProps {
  songs: Song[];
  onAddSong: (song: Partial<Song>) => void;
  onEditSong: (id: string, song: Partial<Song>) => void;
  onDeleteSong: (id: string) => void;
}

interface EditableSong extends Partial<Song> {
  isNew?: boolean;
}

export function SongList({
  songs,
  onAddSong,
  onEditSong,
  onDeleteSong,
}: SongListProps) {
  const [editingSongs, setEditingSongs] = useState<Record<string, EditableSong>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSong, setNewSong] = useState<EditableSong>({
    title: "",
    artist: "",
    notes: "",
  });

  const handleStartEdit = (song: Song) => {
    setEditingSongs(prev => ({
      ...prev,
      [song.id]: {
        title: song.title,
        artist: song.artist,
        notes: song.notes,
      }
    }));
  };

  const handleCancelEdit = (songId: string) => {
    setEditingSongs(prev => {
      const { [songId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleSaveEdit = async (songId: string) => {
    const editedSong = editingSongs[songId];
    if (!editedSong?.title) {
      toast({
        title: "Missing title",
        description: "Please provide a song title",
        variant: "destructive",
      });
      return;
    }

    try {
      await onEditSong(songId, editedSong);
      setEditingSongs(prev => {
        const { [songId]: _, ...rest } = prev;
        return rest;
      });
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
  };

  const handleAddNewSong = async () => {
    if (!newSong.title) {
      toast({
        title: "Missing title",
        description: "Please provide a song title",
        variant: "destructive",
      });
      return;
    }

    try {
      await onAddSong(newSong);
      setNewSong({
        title: "",
        artist: "",
        notes: "",
      });
      setShowAddForm(false);
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

  const handleInputChange = (
    songId: string | 'new',
    field: keyof EditableSong,
    value: string
  ) => {
    if (songId === 'new') {
      setNewSong(prev => ({ ...prev, [field]: value }));
    } else {
      setEditingSongs(prev => ({
        ...prev,
        [songId]: { ...prev[songId], [field]: value },
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-lg font-semibold">All Songs</h2>
        <Button
          size="sm"
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Song
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Artist</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Last Played</TableHead>
              <TableHead className="hidden md:table-cell">Last Updated</TableHead>
              <TableHead className="w

-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {songs.length === 0 && !showAddForm ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No songs found. Add your first song!
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {songs.map((song) => {
                    const isEditing = !!editingSongs[song.id];
                    return (
                      <motion.tr
                        key={song.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="group hover:bg-muted/50"
                      >
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingSongs[song.id]?.title || ""}
                              onChange={(e) =>
                                handleInputChange(song.id, "title", e.target.value)
                              }
                              placeholder="Enter song title"
                            />
                          ) : (
                            <Link
                              to={`/song/${song.id}`}
                              className="block font-medium hover:underline"
                            >
                              {song.title}
                            </Link>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingSongs[song.id]?.artist || ""}
                              onChange={(e) =>
                                handleInputChange(song.id, "artist", e.target.value)
                              }
                              placeholder="Enter artist name"
                            />
                          ) : (
                            song.artist
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingSongs[song.id]?.notes || ""}
                              onChange={(e) =>
                                handleInputChange(song.id, "notes", e.target.value)
                              }
                              placeholder="Add notes"
                            />
                          ) : (
                            <span className="line-clamp-1">{song.notes}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {song.lastPlayedKey ? (
                            <div className="flex items-center gap-2">
                              <MusicIcon className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="secondary">
                                {song.lastPlayedKey}
                              </Badge>
                              {song.lastPlayedAt && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(song.lastPlayedAt), "MMM d")}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Never played</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(song.updatedAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSaveEdit(song.id)}
                              >
                                <CheckIcon className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancelEdit(song.id)}
                              >
                                <XIcon className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleStartEdit(song)}
                                >
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
                          )}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                  {showAddForm && (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-muted/30"
                    >
                      <TableCell>
                        <Input
                          value={newSong.title}
                          onChange={(e) =>
                            handleInputChange("new", "title", e.target.value)
                          }
                          placeholder="Enter song title"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={newSong.artist}
                          onChange={(e) =>
                            handleInputChange("new", "artist", e.target.value)
                          }
                          placeholder="Enter artist name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={newSong.notes}
                          onChange={(e) =>
                            handleInputChange("new", "notes", e.target.value)
                          }
                          placeholder="Add notes"
                        />
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="hidden md:table-cell"></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleAddNewSong}
                          >
                            <CheckIcon className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowAddForm(false)}
                          >
                            <XIcon className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  )}
                </>
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}