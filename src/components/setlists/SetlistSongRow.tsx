import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  EditIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XIcon,
  GripVertical,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SetlistSong, Song } from "@/types";

interface SetlistSongRowProps {
  setlistSong: SetlistSong;
  song: Song;
  onEdit: (song: SetlistSong) => void;
  onRemove: (songId: string) => void;
  onReorder: (songId: string, dir: "up" | "down") => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  index: number;
}

export const SetlistSongRow: React.FC<SetlistSongRowProps> = ({
  setlistSong,
  song,
  onEdit,
  onRemove,
  onReorder,
  canMoveUp,
  canMoveDown,
  index,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ 
    id: setlistSong.id,
    data: {
      type: 'setlist-song',
      setlistSong,
      song,
      index,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`sortable-item flex items-center gap-2 py-2 border-b last:border-b-0 ${
        isDragging ? 'is-dragging' : ''
      } ${isOver ? 'is-over' : ''}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-foreground text-muted-foreground touch-manipulation p-1 rounded hover:bg-muted/50 transition-colors"
        style={{ touchAction: 'none' }}
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Song Number */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
        {index + 1}
      </div>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col">
          <span className="font-medium truncate">
            {song?.title || setlistSong.song?.title}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {song?.artist || setlistSong.song?.artist}
          </span>
          {(setlistSong.key || setlistSong.notes) && (
            <div className="flex items-center gap-2 mt-1">
              {setlistSong.key && (
                <Badge variant="secondary" className="text-xs">
                  {setlistSong.key}
                </Badge>
              )}
              {setlistSong.notes && (
                <span className="text-xs text-muted-foreground truncate">
                  {setlistSong.notes}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-1 flex-shrink-0">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onReorder(setlistSong.id, "up")}
          disabled={!canMoveUp}
          className="h-8 w-8"
        >
          <ArrowUpIcon className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onReorder(setlistSong.id, "down")}
          disabled={!canMoveDown}
          className="h-8 w-8"
        >
          <ArrowDownIcon className="h-4 w-4" />
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => onEdit(setlistSong)}
          className="h-8 w-8"
        >
          <EditIcon className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive h-8 w-8"
          onClick={() => onRemove(setlistSong.id)}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

// Drag Preview Component for SetlistSongRow
export const SetlistSongRowDragPreview: React.FC<{
  setlistSong: SetlistSong;
  song: Song;
  index: number;
}> = ({ setlistSong, song, index }) => {
  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-background border rounded-md min-w-[300px]">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col">
          <span className="font-medium truncate">
            {song?.title || setlistSong.song?.title}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {song?.artist || setlistSong.song?.artist}
          </span>
          {(setlistSong.key || setlistSong.notes) && (
            <div className="flex items-center gap-2 mt-1">
              {setlistSong.key && (
                <Badge variant="secondary" className="text-xs">
                  {setlistSong.key}
                </Badge>
              )}
              {setlistSong.notes && (
                <span className="text-xs text-muted-foreground truncate">
                  {setlistSong.notes}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};