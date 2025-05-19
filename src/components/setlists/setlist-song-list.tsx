import React from "react";
import { SetlistSong } from "@/types";
import { SetlistSongRow } from "./setlist-song-row";

interface EditableSetlistSong extends Partial<SetlistSong> {
  isNew?: boolean;
}

import { Song } from "@/types";

interface SetlistSongListProps {
  setlistSongs: SetlistSong[];
  allSongs: Song[];
  onEdit: (song: SetlistSong) => void;
  onRemove: (songId: string) => void;
  onReorder: (songId: string, dir: "up" | "down") => void;
  keyOptions: string[];
}

export const SetlistSongList: React.FC<SetlistSongListProps> = ({
  setlistSongs,
  allSongs,
  onEdit,
  onRemove,
  onReorder,
  keyOptions,
}) => {
  return (
    <div>
      {setlistSongs.map((setlistSong, idx) => {
        const song =
          allSongs.find((s) => s.id === setlistSong.songId) || setlistSong.song;
        return (
          <SetlistSongRow
            key={setlistSong.id}
            setlistSong={setlistSong}
            song={song}
            index={idx}
            onEdit={onEdit}
            onRemove={onRemove}
            onReorder={onReorder}
            canMoveUp={idx > 0}
            canMoveDown={idx < setlistSongs.length - 1}
            keyOptions={keyOptions}
          />
        );
      })}
    </div>
  );
};
