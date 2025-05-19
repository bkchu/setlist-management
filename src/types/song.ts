export interface SongFile {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  key?: string;
  bpm?: number;
  timeSignature?: string;
  duration?: number;
  genre?: string;
  year?: number;
  createdAt: string;
  updatedAt: string;
  files?: SongFile[];
  keyHistory?: Array<{
    id: string;
    key: string;
    setlistId: string;
    playedAt: string;
    setlistName: string;
  }>;
}

export interface SetlistSong extends Omit<Song, 'id' | 'createdAt' | 'updatedAt'> {
  id: string;
  songId: string;
  order: number;
  notes?: string;
  song: Pick<Song, 'id' | 'title' | 'artist' | 'files'>;
}

export interface EditableSetlistSong extends Partial<SetlistSong> {
  isNew?: boolean;
}

export interface FileWithUrl extends SongFile {
  url?: string;
  songTitle: string;
  songArtist: string;
}
