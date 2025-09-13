import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SongFileUploader } from "@/components/songs/song-file-uploader";
import { useSongs } from "@/hooks/use-songs";
import { signSongFilePath } from "@/lib/storage";
import { isImage, isPDF } from "@/lib/utils";
import { getFilesForKey, hasFilesForSpecificKey, SetlistSong } from "@/types";
import { Loader2 } from "lucide-react";
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

  useEffect(() => {
    if (editingSong) {
      setEditableSong({ ...editingSong });
    } else {
      setEditableSong(null);
    }
  }, [editingSong]);

  useEffect(() => {
    if (!editableSong || !editableSong.songId) {
      setEditPreviewFileUrl(null);
      return;
    }
    const songInDb = songs.find((s) => s.id === editableSong.songId);
    if (!songInDb) return;
    const selectedKey = editableSong.key;
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
  }, [editableSong, songs]);

  const handleSave = () => {
    if (editableSong && editableSong.id) {
      onSave(editableSong.id, {
        key: editableSong.key,
        notes: editableSong.notes,
      });
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

  return (
    <Dialog open={!!editingSong} onOpenChange={(open) => onOpenChange(open)}>
      <DialogContent className="sm:max-w-md w-[95vw] sm:w-full overflow-y-auto max-h-[90vh]">
        <div className="p-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Edit Song
            </DialogTitle>
          </DialogHeader>
          {editingSong && editableSong && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-foreground">
                  {editingSong.song.title} - {editingSong.song.artist}
                </h3>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Key</Label>
                  <div className="space-y-3">
                    <Button
                      variant={
                        editableSong.key === "default" ? "default" : "outline"
                      }
                      className="w-full relative"
                      onClick={() => handleKeyChange("default")}
                    >
                      Default
                      {(() => {
                        const songInDb = songs.find(
                          (s) => s.id === editingSong.songId
                        );
                        return (
                          songInDb &&
                          hasFilesForSpecificKey(songInDb, "default") && (
                            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-primary" />
                          )
                        );
                      })()}
                    </Button>
                    <div className="flex items-center">
                      <div className="flex-grow border-t border-muted" />
                      <span className="flex-shrink mx-2 text-xs text-muted-foreground">
                        OR
                      </span>
                      <div className="flex-grow border-t border-muted" />
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {KEY_OPTIONS.map((key) => {
                        const songInDb = songs.find(
                          (s) => s.id === editingSong.songId
                        );
                        const hasFiles = songInDb
                          ? hasFilesForSpecificKey(songInDb, key)
                          : false;
                        const isSelected = editableSong.key === key;

                        return (
                          <Button
                            key={key}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className="h-10 relative"
                            onClick={() => handleKeyChange(key)}
                          >
                            {key}
                            {hasFiles && (
                              <span className="absolute -top-1 -right-1 block h-2 w-2 rounded-full bg-primary" />
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {(() => {
                  const selectedKey = editableSong.key;
                  const songInDb = songs.find(
                    (s) => s.id === editingSong.songId
                  );

                  if (!songInDb) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        Song data not found.
                      </p>
                    );
                  }
                  if (!selectedKey) {
                    return (
                      <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-8 text-center mt-4">
                        <p className="text-sm font-medium text-muted-foreground">
                          Please select a key to see files.
                        </p>
                      </div>
                    );
                  }

                  const filesForSelectedKey = getFilesForKey(
                    songInDb,
                    selectedKey
                  );
                  if (isEditPreviewLoading) {
                    return (
                      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading preview...
                      </div>
                    );
                  }
                  if (filesForSelectedKey.length > 0 && editPreviewFileUrl) {
                    return (
                      <div className="space-y-2 mt-4">
                        <Label className="text-sm font-medium">
                          File Preview
                        </Label>
                        <div className="rounded-md border bg-muted/20 p-2 flex justify-center items-center">
                          {isImage(filesForSelectedKey[0].name) ? (
                            <img
                              src={editPreviewFileUrl}
                              alt="preview"
                              className="rounded-md max-h-60"
                            />
                          ) : isPDF(filesForSelectedKey[0].name) ? (
                            <p className="text-sm text-muted-foreground p-4">
                              PDF preview not available here.
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground p-4">
                              Preview not available.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="space-y-2 mt-4">
                        <Label className="text-sm font-medium">
                          Upload File for{" "}
                          {selectedKey === "default"
                            ? "Default"
                            : `Key ${selectedKey}`}
                        </Label>
                        <SongFileUploader
                          songId={editingSong.songId}
                          songKey={selectedKey}
                          onUploadComplete={() => {
                            // In a real app, you'd probably want to refresh the song data here
                          }}
                        />
                      </div>
                    );
                  }
                })()}

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notes</Label>
                  <Textarea
                    value={editableSong.notes || ""}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Add performance notes, cues, or other details"
                    className="min-h-[120px] text-sm"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="px-4"
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} className="px-4">
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
