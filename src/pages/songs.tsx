import { useState } from "react";
import { SongList } from "@/components/songs/song-list";
import { toast } from "sonner";
import { Song } from "@/types";
import { SongForm } from "@/components/songs/song-form";
import { useAuth } from "@/hooks/use-auth";
import { useGetSongsByOrganization } from "@/api/songs/list";
import { useCreateSong } from "@/api/songs/post";
import { useUpdateSong } from "@/api/songs/put";
import { useDeleteSong } from "@/api/songs/delete";
import { AppLayout } from "@/components/layout/app-layout";
import { useNavigate } from "react-router-dom";

export default function Songs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: songs = [] } = useGetSongsByOrganization(user?.organizationId);
  const createSong = useCreateSong();
  const updateSong = useUpdateSong();
  const deleteSong = useDeleteSong();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const handleAddSong = async (songData: Partial<Song>) => {
    try {
      if (!user?.organizationId) throw new Error("No organization selected");
      await createSong.mutateAsync({
        title: songData.title!,
        artist: songData.artist,
        notes: songData.notes,
        files: songData.files,
        keyedFiles: songData.keyedFiles,
        organizationId: user.organizationId,
      });
      toast.success("Song created", {
        description: "Add chord sheets and set up the default section order.",
      });
      navigate(`/song/${created.id}`);
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to add song",
      });
    }
  };

  const handleEditSong = async (id: string, songData: Partial<Song>) => {
    try {
      await updateSong.mutateAsync({ id, payload: songData });
      setIsEditing(false);
      toast.success("Song updated", {
        description: `"${songData.title}" has been updated`,
      });
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to update song",
      });
    }
  };

  const handleDeleteSong = async (id: string) => {
    try {
      await deleteSong.mutateAsync(id);
      setSelectedSong(null);
      toast.success("Song deleted", {
        description: "The song has been removed from your library",
      });
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to delete song",
      });
    }
  };

  return (
    <AppLayout title="Songs" subtitle="Manage your song library">
      <SongList
        songs={songs}
        onAddSong={handleAddSong}
        onEditSong={(id, data) => {
          setSelectedSong(songs.find((s) => s.id === id) || null);
          setIsEditing(true);
          return handleEditSong(id, data);
        }}
        onDeleteSong={handleDeleteSong}
      />

      {/* Edit Song Dialog */}
      {selectedSong && (
        <SongForm
          open={isEditing}
          onOpenChange={setIsEditing}
          song={selectedSong}
          onSubmit={(songData) => handleEditSong(selectedSong.id, songData)}
        />
      )}
    </AppLayout>
  );
}
