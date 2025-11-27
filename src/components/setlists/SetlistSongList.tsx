import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Edit as EditIcon,
  Music2Icon,
  XIcon,
  GripVertical,
  PlusIcon,
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
  hasFileForSelectedKeyOverride?: boolean;
}

const SetlistSongRow = React.memo(function SetlistSongRow({
  song,
  index,
  onReorder,
  onEdit,
  onRemove,
  isOverlay = false,
  hasFileForSelectedKeyOverride,
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

  // Subtle indicators next to title
  const selectedKey = (song.key ?? "").trim();
  const hasKey = selectedKey !== "";
  const keyedFiles = (song.song.keyedFiles ?? {}) as Record<
    string,
    unknown[] | undefined
  >;
  const fileCountForSelectedKey = hasKey
    ? Array.isArray(keyedFiles[selectedKey])
      ? (keyedFiles[selectedKey] as unknown[]).length
      : 0
    : 0;
  const computedHasFileForSelectedKey = hasKey && fileCountForSelectedKey > 0;
  const hasFileForSelectedKey =
    typeof hasFileForSelectedKeyOverride === "boolean"
      ? hasFileForSelectedKeyOverride
      : computedHasFileForSelectedKey;

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
      className={`relative flex flex-col md:flex-row md:items-center md:justify-between rounded-md border p-3 gap-3 ${
        isDragging ? "opacity-50 shadow-lg" : ""
      } ${isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}
    >
      {/* Drop indicator line at the top */}
      {isOver && (
        <div className="absolute -top-2 left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}

      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:text-foreground text-muted-foreground touch-manipulation p-1 -m-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
          style={{ touchAction: "none" }}
        >
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground aspect-square shrink-0">
          {index + 1}
        </div>
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium truncate flex-1 w-1">
              {song.song.title}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-black/40 border border-black/80 text-[10px] font-medium text-muted-foreground/80 whitespace-nowrap">
                {hasKey ? selectedKey : "no key"}
              </span>
              {hasKey && !hasFileForSelectedKey && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-black/40 border border-black/80 text-[10px] font-medium text-muted-foreground/80 whitespace-nowrap">
                  no slides
                </span>
              )}
            </div>
          </div>
          {song.song.artist && (
            <p className="text-xs text-muted-foreground truncate">
              {song.song.artist}
            </p>
          )}
          {song.notes && (
            <p className="text-xs text-muted-foreground truncate">
              {song.notes}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between md:justify-end gap-1 md:gap-1 w-full md:w-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onReorder(song.id, "up")}
          disabled={index === 0}
          className="h-8 flex-1 md:flex-none"
        >
          <span className="sr-only">Move up</span>
          <ArrowUpIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onReorder(song.id, "down")}
          className="h-8 flex-1 md:flex-none"
        >
          <span className="sr-only">Move down</span>
          <ArrowDownIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(song)}
          className="h-8 flex-1 md:flex-none"
        >
          <EditIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 flex-1 md:flex-none text-destructive hover:text-destructive"
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
  onAdd?: () => void;
  fileAvailabilityBySongId?: Record<string, boolean>;
}

export const SetlistSongList = React.memo(function SetlistSongList({
  songs,
  onReorder,
  onEdit,
  onRemove,
  onAdd,
  fileAvailabilityBySongId,
}: SetlistSongListProps) {
  if (songs.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center">
        <Music2Icon className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium">No songs added yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add songs to your setlist to get started
        </p>
        {onAdd && (
          <Button
            size="xl"
            variant="secondary"
            className="flex-1 min-h-12 mt-4"
            onClick={onAdd}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Song
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5" style={{ touchAction: "pan-y" }}>
      <AnimatePresence>
        {songs.map((song, index) => (
          <SetlistSongRow
            key={song.id}
            song={song}
            index={index}
            onReorder={onReorder}
            onEdit={onEdit}
            onRemove={onRemove}
            hasFileForSelectedKeyOverride={fileAvailabilityBySongId?.[song.id]}
          />
        ))}
      </AnimatePresence>
      <EndDropZone />
    </div>
  );
});
