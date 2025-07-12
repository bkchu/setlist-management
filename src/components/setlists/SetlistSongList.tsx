import React, { useState } from "react";
import { SetlistSong } from "@/types";
import { SetlistSongRow, SetlistSongRowDragPreview } from "./setlist-song-row";
import { DragPreview } from "@/components/ui/drag-overlay";
import { Song } from "@/types";

interface SetlistSongListProps {
  setlistSongs: SetlistSong[];
  allSongs: Song[];
  onEdit: (song: SetlistSong) => void;
  onRemove: (songId: string) => void;
  onReorder: (songId: string, dir: "up" | "down") => void;
}

export const SetlistSongList: React.FC<SetlistSongListProps> = ({
  setlistSongs,
  allSongs,
  onEdit,
  onRemove,
  onReorder,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Get the active item for drag preview
  const activeItem = activeId ? setlistSongs.find(song => song.id === activeId) : null;
  const activeSong = activeItem ? allSongs.find(s => s.id === activeItem.songId) || activeItem.song : null;
  const activeIndex = activeItem ? setlistSongs.findIndex(song => song.id === activeId) : -1;

  return (
    <>
      <div>
        {setlistSongs.map((setlistSong, idx) => {
          const song =
            allSongs.find((s) => s.id === setlistSong.songId) || setlistSong.song;
          return (
            <SetlistSongRow
              key={setlistSong.id}
              setlistSong={setlistSong}
              song={song}
              onEdit={onEdit}
              onRemove={onRemove}
              onReorder={onReorder}
              canMoveUp={idx > 0}
              canMoveDown={idx < setlistSongs.length - 1}
              index={idx}
            />
          );
        })}
      </div>

      {/* Drag Preview */}
      <DragPreview>
        {activeItem && activeSong && (
          <SetlistSongRowDragPreview
            setlistSong={activeItem}
            song={activeSong}
            index={activeIndex}
          />
        )}
      </DragPreview>
    </>
  );
};