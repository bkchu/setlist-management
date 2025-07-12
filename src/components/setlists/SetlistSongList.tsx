import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Edit as EditIcon,
  Music2Icon,
  XIcon,
  GripVertical,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import React from "react";

import { Button } from "@/components/ui/button";
import { SetlistSong } from "@/types";

// Drop zone indicator component for the end of the list
const EndDropZone = React.memo(function EndDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: "end-drop-zone",
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative h-4 transition-all duration-200 ${
        isOver ? "h-8" : ""
      }`}
    >
      {isOver && (
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-0.5 bg-primary rounded-full" />
        </div>
      )}
    </div>
  );
});

interface SetlistSongRowProps {
  song: SetlistSong;
  index: number;
  onReorder: (songId: string, direction: "up" | "down") => void;
  onEdit: (song: SetlistSong) => void;
  onRemove: (songId: string) => void;
  isOverlay?: boolean;
}

const SetlistSongRow = React.memo(function SetlistSongRow({
  song,
  index,
  onReorder,
  onEdit,
  onRemove,
  isOverlay = false,
}: SetlistSongRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Don't render drag handles and actions for overlay
  if (isOverlay) {
    return (
      <div className="flex items-center gap-3 rounded-md border p-3 bg-background shadow-xl opacity-95 cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground aspect-square">
          {index + 1}
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
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        ...style,
        touchAction: "manipulation",
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      layout
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
      }}
      className={`relative flex items-center justify-between rounded-md border p-3 ${
        isDragging ? "opacity-50 shadow-lg" : ""
      } ${isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}
    >
      {/* Drop indicator line at the top */}
      {isOver && (
        <div className="absolute -top-2 left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}

      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:text-foreground text-muted-foreground touch-manipulation p-1 -m-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
          style={{ touchAction: "none" }}
        >
          <GripVertical className="h-5 w-5" />
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground aspect-square">
          {index + 1}
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
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onReorder(song.id, "up")}
          disabled={index === 0}
          className="h-8 w-8"
        >
          <span className="sr-only">Move up</span>
          <ArrowUpIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onReorder(song.id, "down")}
          className="h-8 w-8"
        >
          <span className="sr-only">Move down</span>
          <ArrowDownIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(song)}
          className="h-8 w-8"
        >
          <EditIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onRemove(song.id)}
        >
          <XIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
});

interface SetlistSongListProps {
  songs: SetlistSong[];
  onReorder: (songId: string, direction: "up" | "down") => void;
  onEdit: (song: SetlistSong) => void;
  onRemove: (songId: string) => void;
}

export const SetlistSongList = React.memo(function SetlistSongList({
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
    <div className="space-y-2" style={{ touchAction: "pan-y" }}>
      <AnimatePresence>
        {songs.map((song, index) => (
          <SetlistSongRow
            key={song.id}
            song={song}
            index={index}
            onReorder={onReorder}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
      <EndDropZone />
    </div>
  );
});
