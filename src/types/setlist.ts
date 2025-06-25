import { SetlistSong } from "./song";

export interface Setlist {
  id: string;
  name: string;
  description?: string;
  date: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  songs: SetlistSong[];
  userId: string;
}

export interface SetlistFormData {
  name: string;
  description?: string;
  date: string;
  location?: string;
}

export interface SetlistSongsUpdateData {
  songs: Array<{
    id: string;
    songId: string;
    order: number;
    key?: string;
    notes?: string;
  }>;
}

export interface FileWithUrl {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  created_at: string;
  song_id: string;
  path: string;
  songTitle?: string;
  songArtist?: string;
  keyInfo?: string;
}

export interface EditableSetlistSong extends Omit<SetlistSong, "song"> {
  isEditing?: boolean;
  tempKey?: string;
  tempBpm?: number;
  tempNotes?: string;
  songTitle?: string;
  songArtist?: string;
  song?: {
    title: string;
    artist: string;
    [key: string]: unknown;
  };
}

export interface SlideItem extends FileWithUrl {
  key: string;
  type: "image" | "pdf";
  pageNumber?: number;
  songTitle?: string;
  song_id: string;
}
