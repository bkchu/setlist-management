import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  EditIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XIcon,
  CheckIcon,
} from "lucide-react";
import { SetlistSong } from "@/types";

interface EditableSetlistSong extends Partial<SetlistSong> {
  isNew?: boolean;
}

interface SetlistSongRowProps {
  setlistSong: SetlistSong;
  song: any;
  index: number;
  isEditing: boolean;
  editingSong?: EditableSetlistSong;
  onEdit: (song: SetlistSong) => void;
  onSave: (songId: string) => void;
  onCancel: (songId: string) => void;
  onRemove: (songId: string) => void;
  onReorder: (songId: string, dir: "up" | "down") => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  keyOptions: string[];
  editingSongs: Record<string, EditableSetlistSong>;
  setEditingSongs: React.Dispatch<
    React.SetStateAction<Record<string, EditableSetlistSong>>
  >;
}

export const SetlistSongRow: React.FC<SetlistSongRowProps> = ({
  setlistSong,
  song,
  index,
  onEdit,
  onRemove,
  onReorder,
  canMoveUp,
  canMoveDown,
  keyOptions,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 py-2 border-b last:border-b-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-col">
          <span className="font-medium truncate">
            {song?.title || setlistSong.song?.title}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {song?.artist || setlistSong.song?.artist}
          </span>
        </div>
      </div>
      <div className="w-24">
        <Badge variant="secondary">{setlistSong.key}</Badge>
      </div>
      <div className="w-48">
        <span className="text-sm">{setlistSong.notes}</span>
      </div>
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onReorder(setlistSong.id, "up")}
          disabled={!canMoveUp}
        >
          <ArrowUpIcon className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onReorder(setlistSong.id, "down")}
          disabled={!canMoveDown}
        >
          <ArrowDownIcon className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onEdit(setlistSong)}>
          <EditIcon className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => onRemove(setlistSong.id)}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};
