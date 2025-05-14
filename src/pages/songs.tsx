import { useState } from "react";
import { Header } from "@/components/layout/header";
import { SongList } from "@/components/songs/song-list";
import { useSongs } from "@/hooks/use-songs";
import { toast } from "@/hooks/use-toast";
import { Song } from "@/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SongForm } from "@/components/songs/song-form";

export default function Songs() {
  const { songs, addSong, updateSong, deleteSong } = useSongs();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const handleAddSong = async (songData: Partial<Song>) => {
    try {
      await addSong(songData);
      toast({
        title: "Song added",
        description: `"${songData.title}" has been added to your library`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add song",
        variant: "destructive",
      });
    }
  };

  const handleEditSong = async (id: string, songData: Partial<Song>) => {
    try {
      await updateSong(id, songData);
      setIsEditing(false);
      toast({
        title: "Song updated",
        description: `"${songData.title}" has been updated`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update song",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSong = async (id: string) => {
    try {
      await deleteSong(id);
      setSelectedSong(null);
      toast({
        title: "Song deleted",
        description: "The song has been removed from your library",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete song",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <Header title="Songs" />
      
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <SongList 
          songs={songs}
          onAddSong={handleAddSong}
          onEditSong={handleEditSong}
          onDeleteSong={handleDeleteSong}
        />
      </main>

      {/* Edit Song Dialog */}
      {selectedSong && isEditing && (
        <Dialog 
          open={isEditing} 
          onOpenChange={(open) => {
            if (!open) setIsEditing(false);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <SongForm
              song={selectedSong}
              onSubmit={(songData) => handleEditSong(selectedSong.id, songData)}
              onCancel={() => setIsEditing(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}