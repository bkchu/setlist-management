export interface SongFile {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

// New interface for key-specific files
export interface KeyedSongFiles {
  default?: SongFile[];
  G?: SongFile[];
  Gb?: SongFile[];
  "F#"?: SongFile[];
  F?: SongFile[];
  E?: SongFile[];
  Eb?: SongFile[];
  D?: SongFile[];
  Db?: SongFile[];
  "C#"?: SongFile[];
  C?: SongFile[];
  B?: SongFile[];
  Bb?: SongFile[];
  A?: SongFile[];
  Ab?: SongFile[];
}

export const AVAILABLE_KEYS = [
  "G",
  "Gb",
  "F#",
  "F",
  "E",
  "Eb",
  "D",
  "Db",
  "C#",
  "C",
  "B",
  "Bb",
  "A",
  "Ab",
] as const;

export type MusicalKey = (typeof AVAILABLE_KEYS)[number];

export interface Song {
  id: string;
  title: string;
  artist: string;
  notes?: string;
  key?: string;
  bpm?: number;
  timeSignature?: string;
  duration?: number;
  genre?: string;
  year?: number;
  createdAt: string;
  updatedAt: string;
  files?: SongFile[]; // Keep for backward compatibility during migration
  keyedFiles?: KeyedSongFiles; // New key-specific files structure
  keyHistory?: Array<{
    id: string;
    key: string;
    setlistId: string;
    playedAt: string;
    setlistName: string;
  }>;
}

export interface SetlistSong
  extends Omit<Song, "id" | "createdAt" | "updatedAt"> {
  id: string;
  songId: string;
  order: number;
  notes?: string;
  song: Pick<Song, "id" | "title" | "artist" | "files" | "keyedFiles">;
}

export interface EditableSetlistSong extends Partial<SetlistSong> {
  isNew?: boolean;
}

export interface FileWithUrl extends SongFile {
  url?: string;
  songTitle: string;
  songArtist: string;
  keyInfo?: string; // Add key information for display
}

// Helper function to get files for a specific key with fallback
export function getFilesForKey(song: Song, key?: string): SongFile[] {
  if (!song.keyedFiles) {
    // Fallback to old files structure during migration
    return song.files || [];
  }

  if (key && key !== "default" && song.keyedFiles[key as MusicalKey]) {
    return song.keyedFiles[key as MusicalKey] || [];
  }

  // Fallback to default files if key-specific files don't exist
  return song.keyedFiles.default || [];
}

// Helper function to get all files for a song, organized by key
export function getAllKeyedFiles(song: Song): KeyedSongFiles {
  if (!song.keyedFiles) {
    // Fallback to old files structure during migration
    return { default: song.files || [] };
  }
  return song.keyedFiles;
}

// Helper function to check if a song has files for a specific key
export function hasFilesForKey(song: Song, key: string): boolean {
  const files = getFilesForKey(song, key);
  return files.length > 0;
}
