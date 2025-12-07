import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SongFileUploader } from "@/components/songs/song-file-uploader";
import { useSongs } from "@/hooks/use-songs";
import { signSongFilePath } from "@/lib/storage";
import { isImage, isPDF } from "@/lib/utils";
import { getFilesForKey, hasFilesForSpecificKey, SetlistSong } from "@/types";
import {
  FileIcon,
  Loader2Icon,
  Music2Icon,
  StickyNoteIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

const KEY_OPTIONS = [
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
];

interface EditSongDialogProps {
  editingSong: SetlistSong | null;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (songId: string, updates: Partial<SetlistSong>) => void;
}

export function EditSongDialog({
  editingSong,
  onOpenChange,
  onSave,
}: EditSongDialogProps) {
  const { songs } = useSongs();
  const [editableSong, setEditableSong] = useState<Partial<SetlistSong> | null>(
    null
  );
  const [editPreviewFileUrl, setEditPreviewFileUrl] = useState<string | null>(
    null
  );
  const [isEditPreviewLoading, setIsEditPreviewLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingSong) {
      setEditableSong({ ...editingSong });
    } else {
      setEditableSong(null);
    }
  }, [editingSong]);

  // Only re-fetch preview when songId or key changes, not when notes change
  const songId = editableSong?.songId;
  const selectedKey = editableSong?.key;

  useEffect(() => {
    if (!songId) {
      setEditPreviewFileUrl(null);
      return;
    }
    const songInDb = songs.find((s) => s.id === songId);
    if (!songInDb) return;
    if (!selectedKey) {
      setEditPreviewFileUrl(null);
      return;
    }
    const files = getFilesForKey(songInDb, selectedKey);
    if (files.length > 0) {
      const file = files[0];
      setIsEditPreviewLoading(true);
      signSongFilePath(file.path, 3600)
        .then((url) => setEditPreviewFileUrl(url))
        .catch((err) => {
          console.error("Error creating signed URL for edit", err);
          setEditPreviewFileUrl(null);
        })
        .finally(() => setIsEditPreviewLoading(false));
    } else {
      setEditPreviewFileUrl(null);
    }
  }, [songId, selectedKey, songs]);

  const handleSave = async () => {
    if (editableSong && editableSong.id) {
      setIsSaving(true);
      try {
        await Promise.resolve(
          onSave(editableSong.id, {
            key: editableSong.key,
            notes: editableSong.notes,
          })
        );
        onOpenChange(false);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleKeyChange = (key: string) => {
    if (editableSong) {
      setEditableSong((prev) => ({ ...prev, key }));
    }
  };

  const handleNotesChange = (notes: string) => {
    if (editableSong) {
      setEditableSong((prev) => ({ ...prev, notes }));
    }
  };

  const songInDb = editingSong
    ? songs.find((s) => s.id === editingSong.songId)
    : null;

  return (
    <Dialog open={!!editingSong} onOpenChange={(open) => onOpenChange(open)}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
        {/* Decorative header gradient */}
        <div className="absolute inset-x-0 top-0 h-24 sm:h-32 bg-gradient-to-b from-primary/8 via-primary/4 to-transparent pointer-events-none" />
        <div className="absolute top-4 sm:top-6 right-12 sm:right-16 w-16 sm:w-20 h-16 sm:h-20 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative px-4 sm:px-6 pt-5 sm:pt-6 pb-2">
          <DialogHeader className="space-y-3">
            {/* Icon badge - stacks on mobile, inline on desktop */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/20">
                <Music2Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <DialogTitle className="text-lg sm:text-xl font-semibold tracking-tight">
                  Edit Song
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  {editingSong
                    ? `${editingSong.song.title} — ${editingSong.song.artist}`
                    : "Update song details for this setlist"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {editingSong && editableSong && (
          <div className="relative px-4 sm:px-6 pb-5 sm:pb-6 space-y-4 sm:space-y-5">
            {/* Key Selection */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-medium text-foreground/90">
                Key
              </Label>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {KEY_OPTIONS.map((key) => {
                  const hasFiles = songInDb
                    ? hasFilesForSpecificKey(songInDb, key)
                    : false;
                  const isSelected = editableSong.key === key;

                  return (
                    <Button
                      key={key}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="h-9 sm:h-10 relative px-0 text-xs sm:text-sm font-medium"
                      onClick={() => handleKeyChange(key)}
                    >
                      {key}
                      {hasFiles && (
                        <span className="absolute -top-0.5 -right-0.5 block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary" />
                      )}
                    </Button>
                  );
                })}
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Keys with files are marked with a dot
              </p>
            </div>

            {/* Performance Notes */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-medium text-foreground/90 flex items-center gap-2">
                <StickyNoteIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                Performance Notes
              </Label>
              <Textarea
                value={editableSong.notes || ""}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="e.g., Skip verse 2, watch for tempo change in bridge"
                className="min-h-[80px] sm:min-h-[100px] text-sm resize-none"
              />
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Notes for this setlist only — visible during live viewing
              </p>
            </div>

            {/* File Preview Section */}
            {(() => {
              const selectedKey = editableSong.key;

              if (!songInDb) {
                return (
                  <div className="rounded-xl border border-dashed border-muted-foreground/20 p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Song data not found.
                    </p>
                  </div>
                );
              }

              if (!selectedKey) {
                return (
                  <div className="rounded-xl border border-dashed border-muted-foreground/20 p-6 text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      Select a key to see files
                    </p>
                  </div>
                );
              }

              const filesForSelectedKey = getFilesForKey(songInDb, selectedKey);

              if (isEditPreviewLoading) {
                return (
                  <div className="flex items-center justify-center p-6 text-sm text-muted-foreground rounded-xl border border-muted-foreground/10 bg-muted/5">
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Loading preview...
                  </div>
                );
              }

              if (filesForSelectedKey.length > 0 && editPreviewFileUrl) {
                return (
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium text-foreground/90">
                      File Preview
                    </Label>
                    <div className="rounded-xl border border-muted-foreground/10 bg-muted/5 p-3 flex justify-center items-center">
                      {isImage(filesForSelectedKey[0].name) ? (
                        <img
                          src={editPreviewFileUrl}
                          alt="preview"
                          className="rounded-lg max-h-48 sm:max-h-60"
                        />
                      ) : isPDF(filesForSelectedKey[0].name) ? (
                        <div className="p-4 text-center">
                          <FileIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {filesForSelectedKey[0].name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PDF preview available in fullscreen
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 text-center">
                          <FileIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {filesForSelectedKey[0].name}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium text-foreground/90">
                      Upload File for Key {selectedKey}
                    </Label>
                    <SongFileUploader
                      songId={editingSong.songId}
                      songKey={selectedKey}
                      onUploadComplete={() => {
                        // Song data will be refreshed via React Query
                      }}
                    />
                  </div>
                );
              }
            })()}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSaving}
                  className="h-10 sm:h-9"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="h-10 sm:h-9"
              >
                {isSaving ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
