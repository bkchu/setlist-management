import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getKeyHistoryForSong(
  songId: string,
  setlists: {
    name: string;
    date: string;
    songs: { songId: string; key: string | undefined }[];
  }[]
) {
  // Returns [{ key, date, setlistName }]
  const history: { key: string; date: string; setlistName: string }[] = [];
  setlists.forEach((setlist) => {
    setlist.songs.forEach((song) => {
      if (song.songId === songId && song.key) {
        history.push({
          key: song.key,
          date: setlist.date,
          setlistName: setlist.name,
        });
      }
    });
  });
  // Group by key and sort by most recent
  const grouped: Record<string, { date: string; setlistName: string }[]> = {};
  history.forEach(({ key, date, setlistName }) => {
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ date, setlistName });
  });
  // Return [{key, usages: [{date, setlistName}]}]
  return Object.entries(grouped)
    .map(([key, usages]) => ({
      key,
      usages: usages.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export const getFileExtension = (filename: string) => {
  return filename
    .slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2)
    .toLowerCase();
};

export const isImage = (filename: string) => {
  const ext = getFileExtension(filename);
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
};

export const isPDF = (filename: string) => {
  return getFileExtension(filename) === "pdf";
};
