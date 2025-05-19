import { SetlistSong } from './song';

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
