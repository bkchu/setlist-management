import { useParams, useNavigate } from "react-router-dom";
import { useGetSong } from "@/api/songs/get";
import { useUpdateSong } from "@/api/songs/put";
import { useDeleteSong } from "@/api/songs/delete";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { SongForm } from "@/components/songs/song-form";
import { SongKeyHistory } from "@/components/songs/SongKeyHistory";
import { format } from "date-fns";
import {
  EditIcon,
  Loader2Icon,
  Trash2Icon,
  MoreVerticalIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { KeyedSongFiles, SectionOrder, Song } from "@/types";
import { SectionOrderEditor } from "@/components/songs/section-order-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SongFileManager } from "@/components/songs/SongFileManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SongPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: song, isLoading: isSongLoading } = useGetSong({ songId: id });
  const updateSongMutation = useUpdateSong();
  const deleteSongMutation = useDeleteSong();
  const [isEditing, setIsEditing] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<SectionOrder>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (isSongLoading) return;

    if (!song) {
      navigate("/songs");
      toast.error("Song not found", {
        description: "The requested song could not be found.",
      });
    }
  }, [song, isSongLoading, navigate]);

  useEffect(() => {
    if (song?.defaultSectionOrder) {
      setSectionOrder(song.defaultSectionOrder);
    } else {
      setSectionOrder([]);
    }
  }, [song]);

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

  const handleSaveSectionOrder = async () => {
    if (!song) return;
    setIsSavingOrder(true);
    try {
      await updateSongMutation.mutateAsync({
        id: song.id,
        payload: { defaultSectionOrder: sectionOrder },
      });
      toast.success("Section order saved", {
        description:
          "Defaults will prefill when you add this song to a setlist",
      });
    } catch {
      toast.error("Couldn't save section order", {
        description: "Please try again",
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleFilesChange = async (keyedFiles: KeyedSongFiles) => {
    if (!song) return;
    try {
      await updateSongMutation.mutateAsync({
        id: song.id,
        payload: { keyedFiles },
      });
      toast.success("Files updated");
    } catch {
      toast.error("Couldn't update files", {
        description: "Please try again",
      });
    }
  };

  const handleDeleteSong = async () => {
    if (!song) return;
    try {
      await deleteSongMutation.mutateAsync(song.id);
      toast.success("Song deleted");
      setIsDeleteDialogOpen(false);
      navigate("/songs");
    } catch {
      toast.error("Couldn't delete song", {
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

      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          {/* Breadcrumb */}
          <Breadcrumb
            items={[
              { href: "/songs", label: "Songs" },
              { href: `/song/${song.id}`, label: song.title },
            ]}
          />

          {/* Hero - No card, clean and minimal */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                {song.title}
              </h1>
              {song.artist && (
                <p className="text-sm text-muted-foreground">{song.artist}</p>
              )}
              <p className="text-xs text-muted-foreground/70">
                Updated {format(new Date(song.updatedAt), "MMM d, yyyy")}
              </p>
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                >
                  <MoreVerticalIcon className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                  <EditIcon className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2Icon className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Notes - subtle blockquote style */}
          {song.notes && (
            <p className="border-l-2 border-primary/30 pl-3 text-sm text-muted-foreground italic">
              {song.notes}
            </p>
          )}

          {/* Key History - inline, no card */}
          {song.keyHistory && song.keyHistory.length > 0 && (
            <SongKeyHistory keyHistory={song.keyHistory} />
          )}

          {/* Files by key */}
          <SongFileManager song={song} onFilesChange={handleFilesChange} />

          {/* Default Section Order */}
          <Card className="border-white/10 bg-white/5">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg font-semibold">
                Default Section Order
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Prefill the song order whenever you add this song to a setlist.
                You can override it per setlist if needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SectionOrderEditor
                value={sectionOrder}
                onChange={setSectionOrder}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="ghost"
                onClick={() => setSectionOrder([])}
                className="h-10 w-full sm:w-auto"
                disabled={sectionOrder.length === 0 || isSavingOrder}
              >
                Clear
              </Button>
              <Button
                onClick={handleSaveSectionOrder}
                disabled={isSavingOrder}
                className="h-10 w-full sm:w-auto"
              >
                {isSavingOrder ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save order"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <SongForm
        open={isEditing}
        onOpenChange={setIsEditing}
        song={song}
        onSubmit={handleEditSong}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleteSongMutation.isPending) setIsDeleteDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete song?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the song and its files from your Song Library.
              Setlists will no longer show this song.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSongMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteSong}
              disabled={deleteSongMutation.isPending}
            >
              {deleteSongMutation.isPending ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
