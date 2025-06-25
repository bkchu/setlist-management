import { Header } from "@/components/layout/header";
import { OneTouchSongs } from "@/components/setlists/one-touch-songs";
import { SetlistForm } from "@/components/setlists/setlist-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSetlists } from "@/hooks/use-setlists";
import { useSongs } from "@/hooks/use-songs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  SetlistSong,
  Setlist,
  getFilesForKey,
  SlideItem,
  FileWithUrl,
} from "@/types";
import { isImage, isPDF } from "@/lib/utils";
import {
  FilesIcon,
  PlusIcon,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AddSongDialog } from "@/components/setlists/AddSongDialog";
import { EditSongDialog } from "@/components/setlists/EditSongDialog";
import { SetlistSongList } from "@/components/setlists/SetlistSongList";
import { SetlistInfoCard } from "@/components/setlists/SetlistInfoCard";
import { FileViewer } from "@/components/setlists/FileViewer";

export default function SetlistPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { setlists, updateSetlist, updateSetlistSongs, isLoading } =
    useSetlists();
  const { songs } = useSongs();
  const navigate = useNavigate();

  // State management
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [editingSong, setEditingSong] = useState<SetlistSong | null>(null);

  // Derived state
  const setlist = useMemo(() => setlists.find((s) => s.id === id), [setlists, id]);

  const songsNotInSetlist = useMemo(() =>
    songs.filter((song) => !setlist?.songs.some((s) => s.songId === song.id)),
    [songs, setlist]
  );

  const [flattenedSlides, setFlattenedSlides] = useState<SlideItem[]>([]);
  const [numPages, setNumPages] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!setlist && !isLoading) {
      navigate("/setlists");
      toast({
        title: "Setlist not found",
        variant: "destructive",
      });
    }
  }, [setlist, navigate, isLoading, toast]);

  // File & Slide Preparation
  useEffect(() => {
    if (setlist) {
      const loadFiles = async () => {
        const files: FileWithUrl[] = [];
        for (const setlistSong of setlist.songs) {
          const song = songs.find((s) => s.id === setlistSong.songId);
          if (song) {
            const relevantFiles = getFilesForKey(song, setlistSong.key);
            for (const file of relevantFiles) {
              try {
                const { data, error } = await supabase.storage
                  .from("song-files")
                  .createSignedUrl(file.path, 3600);
                if (error) {
                  console.error("Error getting signed URL:", error);
                  continue;
                }
                files.push({
                  ...file,
                  url: data.signedUrl,
                  songTitle: song.title,
                  songArtist: song.artist,
                  id: file.id || `temp-${file.path}`,
                  created_at: file.createdAt || new Date().toISOString(),
                  song_id: song.id,
                  keyInfo: setlistSong.key || "default",
                });
              } catch (error) {
                console.error("Error loading file:", error);
              }
            }
          }
        }
        
        const slides: SlideItem[] = [];
        files.forEach((file) => {
          if (isImage(file.name)) {
            slides.push({ ...file, type: "image", key: file.path });
          } else if (isPDF(file.name)) {
            const num = numPages[file.path] || 1;
            for (let i = 1; i <= num; i++) {
              const isMultiPage = num > 1;
              const songTitle = isMultiPage
                ? `${file.name} - Page ${i} of ${num}`
                : file.name;
              slides.push({
                ...file,
                songTitle,
                type: "pdf",
                pageNumber: i,
                key: `${file.path}__page_${i}`,
              });
            }
          }
        });
        setFlattenedSlides(slides);
      };
      loadFiles();
    }
  }, [setlist, songs, numPages]);

  const handleEditSetlist = async (updatedSetlist: Partial<Setlist>) => {
    if (!setlist) return;
    try {
      await updateSetlist(setlist.id, {
        ...updatedSetlist,
        songs: setlist.songs,
      });
      setIsEditingMetadata(false);
      toast({ title: "Setlist updated" });
    } catch {
      toast({ title: "Error updating setlist", variant: "destructive" });
    }
  };

  const handleSaveSong = async (songId: string, updates: Partial<SetlistSong>) => {
    if (!setlist) return;
    try {
        const updatedSongs = setlist.songs.map((s) =>
            s.id === songId ? { ...s, ...updates } : s
        );
        await updateSetlistSongs(setlist.id, updatedSongs);
        setEditingSong(null);
        toast({ title: "Song updated" });
    } catch {
        toast({ title: "Error updating song", variant: "destructive" });
    }
  };

  const handleAddNewSong = async (newSong: SetlistSong) => {
    if (!setlist) return;
    try {
      const updatedSongs = [...setlist.songs, newSong];
      await updateSetlistSongs(setlist.id, updatedSongs);
    } catch (error) {
        toast({ title: "Error adding song", variant: "destructive" });
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!setlist) return;
    try {
      const updatedSongs = setlist.songs
        .filter((s) => s.id !== songId)
        .map((s, idx) => ({ ...s, order: idx + 1 }));
      await updateSetlistSongs(setlist.id, updatedSongs);
      toast({ title: "Song removed" });
    } catch {
      toast({ title: "Error removing song", variant: "destructive" });
    }
  };

  const handleReorderSong = async (
    songId: string,
    direction: "up" | "down"
  ) => {
    if (!setlist) return;
    const songIndex = setlist.songs.findIndex((s) => s.id === songId);
    if (songIndex === -1) return;
    const newIndex = direction === "up" ? songIndex - 1 : songIndex + 1;
    if (newIndex < 0 || newIndex >= setlist.songs.length) return;

    try {
      const updatedSongs = [...setlist.songs];
      const [removed] = updatedSongs.splice(songIndex, 1);
      updatedSongs.splice(newIndex, 0, removed);
      const reorderedSongs = updatedSongs.map((s, idx) => ({
        ...s,
        order: idx + 1,
      }));
      await updateSetlistSongs(setlist.id, reorderedSongs);
      toast({ title: "Order updated" });
    } catch {
      toast({ title: "Error updating song order", variant: "destructive" });
    }
  };

  const handleSaveNotesInViewer = async (songId: string, notes: string) => {
    if (!setlist) return;
    const updatedSongs = setlist.songs.map((song) => {
        if (song.songId === songId) {
            return { ...song, notes };
        }
        return song;
    });
    try {
        await updateSetlistSongs(setlist.id, updatedSongs);
        toast({ title: "Notes saved" });
    } catch (error: unknown) {
        toast({ title: "Failed to save notes", variant: "destructive" });
    }
  }

  if (!setlist) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex flex-col">
      <Header title={setlist.name} />

      {showCarousel && (
        <FileViewer 
            isOpen={showCarousel}
            onOpenChange={setShowCarousel}
            slides={flattenedSlides}
            onSaveNotes={handleSaveNotesInViewer}
        />
      )}
      
      <AddSongDialog 
        isOpen={showAddSongModal}
        onOpenChange={setShowAddSongModal}
        setlist={setlist}
        songsNotInSetlist={songsNotInSetlist}
        onSongAdded={handleAddNewSong}
        setlists={setlists}
      />
      
      <EditSongDialog 
        editingSong={editingSong}
        onOpenChange={(isOpen) => !isOpen && setEditingSong(null)}
        onSave={handleSaveSong}
      />

      <Dialog open={isEditingMetadata} onOpenChange={setIsEditingMetadata}>
        <DialogContent className="sm:max-w-md">
          <SetlistForm
            setlist={setlist}
            onSubmit={handleEditSetlist}
            onCancel={() => setIsEditingMetadata(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="flex-1 space-y-8 overflow-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <Breadcrumb
            items={[
              { href: "/setlists", label: "Setlists" },
              { href: `/setlist/${setlist.id}`, label: setlist.name },
            ]}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Songs</h2>
                </div>
                <SetlistSongList
                  songs={setlist.songs}
                  onReorder={handleReorderSong}
                  onEdit={setEditingSong}
                  onRemove={handleRemoveSong}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex gap-2 flex-col">
              <Button
                size="xl"
                className="flex-1 flex gap-2 border-none min-h-12"
                onClick={() => setShowCarousel(true)}
                disabled={flattenedSlides.length === 0}
              >
                <FilesIcon /> View Files
              </Button>
              <Button
                size="xl"
                variant="secondary"
                className="flex-1 min-h-12"
                onClick={() => setShowAddSongModal(true)}
                disabled={songsNotInSetlist.length === 0}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Song
              </Button>
            </div>

            <OneTouchSongs className="hidden md:block" />
            
            <SetlistInfoCard setlist={setlist} onEdit={() => setIsEditingMetadata(true)} />
          </div>
        </div>
      </div>
    </div>
  );
}
