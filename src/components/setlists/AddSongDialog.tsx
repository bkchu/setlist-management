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
import { SongSearchCombobox } from "@/components/songs/song-search-combobox";
import { useSongs } from "@/hooks/use-songs";
import { toast } from "sonner";
import { signSongFilePath } from "@/lib/storage";
import {
  Song,
  getFilesForKey,
  hasFilesForSpecificKey,
  Setlist,
  SetlistSong,
  MusicalKey,
} from "@/types";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SuggestedKeys } from "@/components/setlists/SuggestedKeys";
import { FileSection } from "@/components/setlists/FileSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SongForm } from "@/components/songs/song-form";
import { useAuth } from "@/hooks/use-auth";
import { useCreateSong } from "@/api/songs/post";

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
  const { songs } = useSongs();
  const { user } = useAuth();
  const createSong = useCreateSong();
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
  const [showNotes, setShowNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "existing">("create");
  const navigate = useNavigate();

  const resetState = () => {
    setAddSongForm({ songId: "", key: "", notes: "" });
    setSelectedSongInModal(null);
    setPreviewFileUrl(null);
    setIsPreviewLoading(false);
    setShowNotes(false);
  };

  const handleAddNewSong = async () => {
    if (isAddingSong) return;

    if (!setlist) {
      toast.error("No setlist selected", {
        description: "Unable to determine which setlist to add the song to",
      });
      return;
    }

    if (!addSongForm.songId) {
      toast.error("No song selected", {
        description: "Please select a song to add",
      });
      return;
    }

    const song = songs.find((s) => s.id === addSongForm.songId);
    if (!song) {
      toast.error("Song not found", {
        description: "The selected song could not be found",
      });
      return;
    }

    const files = getFilesForKey(song, addSongForm.key || song.default_key);

    const songAlreadyInSetlist = setlist.songs.some(
      (s) => s.songId === addSongForm.songId
    );
    if (songAlreadyInSetlist) {
      toast.error("Song already in setlist", {
        description: "This song is already in the setlist",
      });
      return;
    }

    setIsAddingSong(true);
    try {
      console.log(addSongForm.key);

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

      // Close and reset form before showing toast to reduce perceived complexity
      setAddSongForm({ songId: "", key: "", notes: "" });
      setSelectedSongInModal(null);
      setShowNotes(false);
      onOpenChange(false);

      const selectedKeyLabel = `Key ${addSongForm.key}`;

      // Success toast with optional action to upload a file if missing
      const hasFileForKey = files.length > 0;
      toast.success("Song added", {
        description: hasFileForKey
          ? `${song.title} was added in ${selectedKeyLabel}.`
          : `${song.title} was added in ${selectedKeyLabel}. No file exists yet — you can upload it now or later from the song page.`,
        action: hasFileForKey
          ? undefined
          : {
              label: "Upload file",
              onClick: () => navigate(`/song/${song.id}`),
            },
      });
    } catch (error) {
      console.error("Error adding song to setlist:", error);
      toast.error("Error adding song", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
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
      signSongFilePath(file.path, 3600)
        .then((url) => setPreviewFileUrl(url))
        .catch((err) => {
          console.error("Error creating signed URL", err);
          toast.error("Error loading file preview");
          setPreviewFileUrl(null);
        })
        .finally(() => setIsPreviewLoading(false));
    } else {
      setPreviewFileUrl(null);
    }
  }, [selectedSongInModal, addSongForm.key]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetState();
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md w-[95vw] sm:w-full overflow-y-auto max-h-[90vh] p-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Add Song to Setlist
          </DialogTitle>
        </DialogHeader>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "create" | "existing")}
          defaultValue="create"
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create new</TabsTrigger>
            <TabsTrigger value="existing">Add existing</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            {!user?.organizationId ? (
              <div className="text-sm text-muted-foreground">
                You need to select or belong to an organization to create songs.
              </div>
            ) : (
              <SongForm
                variant="inline"
                onSubmit={async (songData, meta) => {
                  try {
                    const created = await createSong.mutateAsync({
                      title: songData.title!,
                      artist: songData.artist,
                      notes: songData.notes,
                      files: songData.files,
                      keyedFiles: songData.keyedFiles,
                      organizationId: user!.organizationId!,
                    });

                    const key = meta?.selectedKey || "G";
                    const newSetlistSong: SetlistSong = {
                      id: crypto.randomUUID(),
                      songId: created.id,
                      order: setlist.songs.length + 1,
                      key,
                      notes: "",
                      title: created.title,
                      artist: created.artist,
                      song: {
                        id: created.id,
                        title: created.title,
                        artist: created.artist,
                        files: created.files,
                        keyedFiles: created.keyedFiles,
                      },
                    };

                    onSongAdded(newSetlistSong);
                    onOpenChange(false);
                    toast.success("Song created and added", {
                      description: `${created.title} in key ${key}`,
                    });
                  } catch (error) {
                    toast.error("Error", {
                      description:
                        error instanceof Error
                          ? error.message
                          : "Failed to create song",
                    });
                  }
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="existing">
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
                    setShowNotes(false);
                  }}
                  placeholder="Search for a song to add..."
                />
              </div>
              {addSongForm.songId && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Key</Label>

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
                          onClick={() => {
                            setAddSongForm((prev) => ({ ...prev, key }));
                          }}
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
              )}
              {addSongForm.songId && (
                <div className="mt-4 border-t pt-3">
                  <div className="mb-2 text-xs text-muted-foreground font-medium">
                    Suggested keys
                  </div>
                  <SuggestedKeys
                    songId={addSongForm.songId}
                    setlists={setlists}
                    selectedKey={addSongForm.key}
                    onSelectKey={(k) =>
                      setAddSongForm((prev) => ({ ...prev, key: k }))
                    }
                  />
                </div>
              )}
              {selectedSongInModal && (
                <div className="mt-4">
                  <FileSection
                    selectedSong={selectedSongInModal}
                    selectedKey={addSongForm.key}
                    previewFileUrl={previewFileUrl}
                    isPreviewLoading={isPreviewLoading}
                    onFileAdded={(newFile) => {
                      if (!selectedSongInModal) return;
                      const newKeyedFiles = {
                        ...(selectedSongInModal.keyedFiles || {}),
                      };
                      const key = addSongForm.key as MusicalKey;
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
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Notes</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setShowNotes((v) => !v)}
                  >
                    {showNotes ? "Hide" : "Add notes"}
                  </Button>
                </div>
                {showNotes && (
                  <div className="space-y-1.5">
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
                    <p className="text-xs text-muted-foreground">
                      These notes stay with this setlist song and show in fullscreen viewing.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {activeTab === "existing" && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetState();
                onOpenChange(false);
              }}
              className="px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNewSong}
              className="px-4"
              disabled={isAddingSong || !selectedSongInModal}
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
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
