import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Edit as EditIcon,
  Music2Icon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SetlistSong } from "@/types";

interface SetlistSongListProps {
  songs: SetlistSong[];
  onReorder: (songId: string, direction: "up" | "down") => void;
  onEdit: (song: SetlistSong) => void;
  onRemove: (songId: string) => void;
}

export function SetlistSongList({
  songs,
  onReorder,
  onEdit,
  onRemove,
}: SetlistSongListProps) {
  if (songs.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <Music2Icon className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium">No songs added yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add songs to your setlist to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {songs.map((setlistSong, index) => (
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
                <p className="text-sm font-medium">{setlistSong.song.title}</p>
                {setlistSong.song.artist && (
                  <p className="text-xs text-muted-foreground">
                    {setlistSong.song.artist}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {setlistSong.key && `Key: ${setlistSong.key}`}
                  {setlistSong.key && setlistSong.notes && " • "}
                  {setlistSong.notes}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onReorder(setlistSong.id, "up")}
                disabled={index === 0}
                className="h-8 w-8"
              >
                <span className="sr-only">Move up</span>
                <ArrowUpIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onReorder(setlistSong.id, "down")}
                disabled={index === songs.length - 1}
                className="h-8 w-8"
              >
                <span className="sr-only">Move down</span>
                <ArrowDownIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(setlistSong)}
                className="h-8 w-8"
              >
                <EditIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onRemove(setlistSong.id)}
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
