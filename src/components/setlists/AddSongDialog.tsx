import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SongSearchCombobox } from "@/components/songs/song-search-combobox";
import { SongFileUploader } from "@/components/songs/song-file-uploader";
import { useSongs } from "@/hooks/use-songs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { getKeyHistoryForSong, isImage, isPDF } from "@/lib/utils";
import {
  Song,
  getFilesForKey,
  hasFilesForSpecificKey,
  Setlist,
  SongFile,
  MusicalKey,
  SetlistSong,
} from "@/types";
import { format } from "date-fns";
import { FileIcon, Loader2 } from "lucide-react";
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

interface AddSongDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  setlist: Setlist;
  songsNotInSetlist: Song[];
  onSongAdded: (newSong: SetlistSong) => void;
  setlists: Setlist[];
}

export function AddSongDialog({
  isOpen,
  onOpenChange,
  setlist,
  songsNotInSetlist,
  onSongAdded,
  setlists,
}: AddSongDialogProps) {
  const { toast } = useToast();
  const { songs } = useSongs();
  const [isAddingSong, setIsAddingSong] = useState(false);
  const [addSongForm, setAddSongForm] = useState({
    songId: "",
    key: "",
    notes: "",
  });
  const [selectedSongInModal, setSelectedSongInModal] = useState<Song | null>(
    null
  );
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handleAddNewSong = async () => {
    if (isAddingSong) return;

    if (!setlist) {
      toast({
        title: "No setlist selected",
        description: "Unable to determine which setlist to add the song to",
        variant: "destructive",
      });
      return;
    }

    if (!addSongForm.songId) {
      toast({
        title: "No song selected",
        description: "Please select a song to add",
        variant: "destructive",
      });
      return;
    }

    const song = songs.find((s) => s.id === addSongForm.songId);
    if (!song) {
      toast({
        title: "Song not found",
        description: "The selected song could not be found",
        variant: "destructive",
      });
      return;
    }

    const files = getFilesForKey(song, addSongForm.key || song.default_key);
    if (files.length === 0) {
      toast({
        title: "No file for selected key",
        description:
          "Please upload a file for the selected key or choose a key with an existing file.",
        variant: "destructive",
      });
      return;
    }

    const songAlreadyInSetlist = setlist.songs.some(
      (s) => s.songId === addSongForm.songId
    );
    if (songAlreadyInSetlist) {
      toast({
        title: "Song already in setlist",
        description: "This song is already in the setlist",
        variant: "destructive",
      });
      return;
    }

    setIsAddingSong(true);
    try {
      const tempId = crypto.randomUUID();
      const newSong: SetlistSong = {
        id: tempId,
        songId: addSongForm.songId,
        order: setlist.songs.length + 1,
        key: addSongForm.key,
        notes: addSongForm.notes,
        title: song.title,
        artist: song.artist,
        song,
      };

      onSongAdded(newSong);

      setAddSongForm({ songId: "", key: "", notes: "" });
      setSelectedSongInModal(null);
      onOpenChange(false);

      toast({
        title: "Song added",
        description: `${song.title} has been added to the setlist`,
      });
    } catch (error) {
      console.error("Error adding song to setlist:", error);
      toast({
        title: "Error adding song",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAddingSong(false);
    }
  };

  useEffect(() => {
    if (!selectedSongInModal) {
      setPreviewFileUrl(null);
      return;
    }

    const files = getFilesForKey(
      selectedSongInModal,
      addSongForm.key || selectedSongInModal.default_key
    );

    if (files.length > 0) {
      const file = files[0];
      setIsPreviewLoading(true);
      supabase.storage
        .from("song-files")
        .createSignedUrl(file.path, 3600)
        .then(({ data, error }) => {
          if (error) {
            console.error("Error creating signed URL", error);
            toast({
              title: "Error loading file preview",
              variant: "destructive",
            });
            setPreviewFileUrl(null);
          } else if (data) {
            setPreviewFileUrl(data.signedUrl);
          }
        })
        .finally(() => {
          setIsPreviewLoading(false);
        });
    } else {
      setPreviewFileUrl(null);
    }
  }, [selectedSongInModal, addSongForm.key, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] sm:w-full overflow-y-auto max-h-[90vh] p-4">
        <div className="space-y-6">
          <DialogTitle className="text-xl font-semibold">
            Add Song to Setlist
          </DialogTitle>
          <div className="space-y-4">
            <div className="space-y-2 flex flex-col gap-2">
              <Label className="text-sm font-medium">Select Song</Label>
              <SongSearchCombobox
                songs={songsNotInSetlist}
                value={addSongForm.songId}
                onSelect={(songId) => {
                  const selected = songs.find((s) => s.id === songId);
                  setSelectedSongInModal(selected || null);
                  setAddSongForm((prev) => ({
                    ...prev,
                    songId,
                    key: selected?.default_key || "",
                    notes: "",
                  }));
                }}
                placeholder="Search for a song to add..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Key</Label>

              <div className="space-y-3">
                <Button
                  variant={
                    addSongForm.key === "default" ? "default" : "outline"
                  }
                  className="w-full relative"
                  onClick={() =>
                    setAddSongForm((prev) => ({ ...prev, key: "default" }))
                  }
                >
                  Default
                  {selectedSongInModal &&
                    hasFilesForSpecificKey(selectedSongInModal, "default") && (
                      <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-primary" />
                    )}
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
                    const hasFiles = selectedSongInModal
                      ? hasFilesForSpecificKey(selectedSongInModal, key)
                      : false;
                    const isSelected = addSongForm.key === key;
                    return (
                      <Button
                        key={key}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className="h-10 relative"
                        onClick={() =>
                          setAddSongForm((prev) => ({ ...prev, key }))
                        }
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
              {addSongForm.songId && (
                <div className="mt-4 border-t pt-3">
                  <div className="mb-2 text-xs text-muted-foreground font-medium">
                    Previously used keys for this song:
                  </div>
                  <div className="flex flex-col gap-2">
                    {getKeyHistoryForSong(addSongForm.songId, setlists).length >
                    0 ? (
                      getKeyHistoryForSong(addSongForm.songId, setlists).map(
                        (item) => (
                          <div
                            key={item.key}
                            onClick={() =>
                              setAddSongForm((prev) => ({
                                ...prev,
                                key: item.key,
                              }))
                            }
                            className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
                              addSongForm.key === item.key
                                ? "bg-primary/10 border border-primary/20"
                                : "border border-transparent"
                            }`}
                          >
                            <Button
                              variant={
                                addSongForm.key === item.key
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              className="h-7 w-10 px-0 font-mono text-xs font-medium flex-shrink-0"
                            >
                              {item.key}
                            </Button>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">
                                {item.usages[0].setlistName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(
                                  new Date(item.usages[0].date),
                                  "MMM d, yyyy"
                                )}
                              </p>
                            </div>
                          </div>
                        )
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No previous keys found.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {selectedSongInModal && (
                <div className="mt-4">
                  {(() => {
                    const selectedKey = addSongForm.key;
                    if (!selectedKey) {
                      return (
                        <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-8 text-center">
                          <p className="text-sm font-medium text-muted-foreground">
                            Please select a key for this song.
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Keys with available files are marked with a dot.
                          </p>
                        </div>
                      );
                    }
                    const filesForSelectedKey = getFilesForKey(
                      selectedSongInModal,
                      selectedKey
                    );
                    if (isPreviewLoading) {
                      return (
                        <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading preview...
                        </div>
                      );
                    }
                    if (filesForSelectedKey.length > 0 && previewFileUrl) {
                      return (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            File Preview (
                            {selectedKey === "default"
                              ? "Default"
                              : `Key: ${selectedKey}`}
                            )
                          </Label>
                          <div className="rounded-md border bg-muted/20 p-2 flex justify-center items-center">
                            {isImage(filesForSelectedKey[0].name) ? (
                              <img
                                src={previewFileUrl}
                                alt="preview"
                                className="rounded-md max-h-60"
                              />
                            ) : isPDF(filesForSelectedKey[0].name) ? (
                              <p className="text-sm text-muted-foreground p-4">
                                PDF preview not available here, but file is
                                present.
                              </p>
                            ) : (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                <FileIcon className="mx-auto h-8 w-8" />
                                <p>
                                  {filesForSelectedKey[0].name}
                                  <br />
                                  (Preview not available)
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Upload File for{" "}
                            {selectedKey === "default"
                              ? "Default"
                              : `Key ${selectedKey}`}
                          </Label>
                          <SongFileUploader
                            songId={selectedSongInModal.id}
                            songKey={selectedKey}
                            onUploadComplete={(newFile: SongFile) => {
                              if (!selectedSongInModal) return;
                              const newKeyedFiles = {
                                ...(selectedSongInModal.keyedFiles || {}),
                              };
                              const key = selectedKey as MusicalKey | "default";
                              if (!newKeyedFiles[key]) {
                                newKeyedFiles[key] = [];
                              }
                              newKeyedFiles[key].push(newFile);
                              setSelectedSongInModal({
                                ...selectedSongInModal,
                                keyedFiles: newKeyedFiles,
                              });
                            }}
                          />
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea
                value={addSongForm.notes || ""}
                onChange={(e) =>
                  setAddSongForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="Add performance notes, cues, or other details"
                className="min-h-[120px] text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNewSong}
              className="px-4"
              disabled={
                isAddingSong ||
                !selectedSongInModal ||
                getFilesForKey(
                  selectedSongInModal,
                  addSongForm.key || selectedSongInModal.default_key
                ).length === 0
              }
            >
              {isAddingSong ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Song"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
