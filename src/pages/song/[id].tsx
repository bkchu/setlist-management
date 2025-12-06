import { useParams, useNavigate } from "react-router-dom";
import { useGetSong } from "@/api/songs/get";
import { useUpdateSong } from "@/api/songs/put";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { SongForm } from "@/components/songs/song-form";
import { SongKeyHistory } from "@/components/songs/SongKeyHistory";
import { SongFileViewer } from "@/components/songs/SongFileViewer";
import { format } from "date-fns";
import {
  EditIcon,
  MusicIcon,
  CalendarIcon,
  ClockIcon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Song } from "@/types";

export default function SongPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: song, isLoading: isSongLoading } = useGetSong({ songId: id });
  const updateSongMutation = useUpdateSong();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isSongLoading) return;

    if (!song) {
      navigate("/songs");
      toast.error("Song not found", {
        description: "The requested song could not be found.",
      });
    }
  }, [song, isSongLoading, navigate]);

  const handleEditSong = async (songData: Partial<Song>) => {
    if (!song) return;

    try {
      await updateSongMutation.mutateAsync({ id: song.id, payload: songData });
      setIsEditing(false);
      toast.success("Song updated", {
        description: "Your changes have been saved",
      });
    } catch {
      toast.error("Couldn't save changes", {
        description: "Please try again",
      });
    }
  };

  // Loading state
  if (!song && isSongLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Loading..." />
        <div className="flex flex-1 items-center justify-center p-8">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!song) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <Header title={song.title} />

      <div className="flex-1 space-y-6 overflow-auto p-4 md:p-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { href: "/songs", label: "Songs" },
            { href: `/song/${song.id}`, label: song.title },
          ]}
        />

        {/* Hero Section - Glassmorphic */}
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
          {/* Decorative gradient */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/8 via-primary/4 to-transparent" />
          <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />

          <div className="relative p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Song icon badge */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
                  <MusicIcon className="h-5 w-5 text-primary" />
                </div>

                <div className="min-w-0 space-y-1">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {song.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">{song.artist}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-9 w-9 shrink-0"
              >
                <EditIcon className="h-4 w-4" />
                <span className="sr-only">Edit song</span>
              </Button>
            </div>

            {/* Notes */}
            {song.notes && (
              <div className="mt-4 rounded-lg border border-white/5 bg-white/3 px-4 py-3">
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {song.notes}
                </p>
              </div>
            )}

            {/* Metadata row */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>Created {format(new Date(song.createdAt), "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ClockIcon className="h-3.5 w-3.5" />
                <span>Updated {format(new Date(song.updatedAt), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key History */}
        {song.keyHistory && song.keyHistory.length > 0 && (
          <SongKeyHistory keyHistory={song.keyHistory} />
        )}

        {/* File Viewer */}
        <SongFileViewer song={song} />
      </div>

      <SongForm
        open={isEditing}
        onOpenChange={setIsEditing}
        song={song}
        onSubmit={handleEditSong}
      />
    </div>
  );
}
