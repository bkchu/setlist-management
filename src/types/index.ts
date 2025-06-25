// User types
export interface User {
  id: string;
  name: string;
  email: string;
}

// Export song types
export type {
  Song,
  SongFile,
  SetlistSong,
  KeyedSongFiles,
  MusicalKey,
} from "./song";

export {
  AVAILABLE_KEYS,
  getFilesForKey,
  getAllKeyedFiles,
  hasFilesForKey,
  hasFilesForSpecificKey,
} from "./song";

// Export setlist types
export type {
  Setlist,
  SetlistFormData,
  SetlistSongsUpdateData,
  FileWithUrl,
  EditableSetlistSong,
  SlideItem,
} from "./setlist";
