// Organization membership types
export interface OrganizationMembership {
  id: string;
  organizationId: string;
  organizationName: string;
  role: "owner" | "admin" | "member";
  createdAt: string;
}

// User types
export interface User {
  id: string;
  name: string;
  email: string;
  organizationId?: string; // Current active organization
  organizations: OrganizationMembership[]; // All organizations user belongs to
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
