import { Song } from "@/types";
import { Button } from "@/components/ui/button";
import { GripVertical, XIcon } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OneTouchSongItemProps {
  song: Song;
  index: number;
  onRemove: () => void;
}

export function OneTouchSongItem({
  song,
  index,
  onRemove,
}: OneTouchSongItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-white/10 bg-card/80 p-4 shadow-sm transition-all duration-200",
        isDragging && "z-50 scale-[1.02] shadow-lg shadow-black/20 ring-2 ring-primary/50",
        !isDragging && "hover:border-white/20 hover:bg-card"
      )}
    >
      {/* Drag Handle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            {...attributes}
            {...listeners}
            className={cn(
              "flex h-8 w-8 cursor-grab items-center justify-center rounded-lg text-muted-foreground transition-colors",
              "hover:bg-white/5 hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              isDragging && "cursor-grabbing"
            )}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          Drag to reorder
        </TooltipContent>
      </Tooltip>

      {/* Slot Number */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/30">
        <span className="text-sm font-bold text-primary">{index + 1}</span>
      </div>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {song.title}
          </h3>
        </div>
        {song.artist && (
          <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
        )}
      </div>

      {/* Remove Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className={cn(
              "h-8 w-8 text-muted-foreground/60 opacity-0 transition-all",
              "hover:bg-destructive/10 hover:text-destructive",
              "focus-visible:opacity-100",
              "group-hover:opacity-100"
            )}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          Remove from quick access
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
