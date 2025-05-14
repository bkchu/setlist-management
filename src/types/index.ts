// User types
export interface User {
  id: string;
  name: string;
  email: string;
}

// Song types
export interface Song {
  id: string;
  title: string;
  artist: string;
  notes: string;
  files?: SongFile[];
  keyHistory?: SongKey[];
  createdAt: string;
  updatedAt: string;
}

export interface SongFile {
  name: string;
  path: string;
  type: string;
  size: number;
}

export interface SongKey {
  id: string;
  key: string;
  playedAt: string;
  setlistId: string;
  setlistName?: string;
}

// Setlist types
export interface Setlist {
  id: string;
  name: string;
  date: string;
  songs: SetlistSong[];
  createdAt: string;
  updatedAt: string;
}

export interface SetlistSong {
  id: string;
  songId: string;
  order: number;
  key?: string;
  notes?: string;
  song: Song;
}