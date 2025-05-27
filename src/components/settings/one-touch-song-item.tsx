import { Song } from "@/types";
import { Button } from "@/components/ui/button";
import { GripVertical, XIcon } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface OneTouchSongItemProps {
  song: Song;
  index: number;
  onRemove: () => void;
}

export function OneTouchSongItem({ song, index, onRemove }: OneTouchSongItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-card border rounded-md shadow-sm"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-foreground text-muted-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary">
        <span className="text-sm font-medium">{index + 1}</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium truncate">{song.title}</h3>
        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
      >
        <XIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
