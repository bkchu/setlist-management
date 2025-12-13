import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Edit as EditIcon,
  Music2Icon,
  Trash2Icon,
  GripVertical,
  PlusIcon,
  Loader2Icon,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SetlistSong } from "@/types";
import { StickyNoteIcon } from "lucide-react";

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
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

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

  const handleConfirmRemove = async () => {
    setIsRemoving(true);
    try {
      await Promise.resolve(onRemove(song.id));
    } finally {
      setIsRemoving(false);
      setShowRemoveDialog(false);
    }
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {song.key && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/15 text-primary border border-primary/30">
                {song.key}
              </span>
            )}
            {song.notes && (
              <span className="flex items-center gap-1">
                <StickyNoteIcon className="h-3 w-3" />
                <span className="line-clamp-1">{song.notes}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
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
          <div className="space-y-0.5 flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{song.song.title}</p>
            {song.song.artist && (
              <p className="text-xs text-muted-foreground truncate">
                {song.song.artist}
              </p>
            )}
            {song.notes && (
              <div className="flex items-start gap-1.5 mt-1">
                <StickyNoteIcon className="h-3 w-3 text-primary/60 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {song.notes}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap border ${
                hasKey
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-white/5 text-muted-foreground/60 border-white/10"
              }`}
            >
              {hasKey ? selectedKey : "no key"}
            </span>
            {hasKey && !hasFileForSelectedKey && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400/90 border border-amber-500/30 text-[10px] font-medium whitespace-nowrap">
                no slides
              </span>
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
            onClick={() => setShowRemoveDialog(true)}
          >
            <Trash2Icon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>

      {/* Remove confirmation dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from setlist?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {song.song.title}
              </span>{" "}
              will be removed from this setlist. The song will still be
              available in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
