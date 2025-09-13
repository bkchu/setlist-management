import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Song,
  SongFile,
  AVAILABLE_KEYS,
  MusicalKey,
  KeyedSongFiles,
} from "@/types";
import { useCallback, useEffect, useState } from "react";
import { FileIcon, Loader2Icon, TrashIcon, UploadIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

interface SongFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song?: Song;
  onSubmit: (song: Partial<Song>) => Promise<void> | void;
}

export function SongForm({
  open,
  onOpenChange,
  song,
  onSubmit,
}: SongFormProps) {
  const { user } = useAuth();
  // Initialize form data with proper fallback logic
  const initializeFormData = useCallback(() => {
    const baseData = {
      title: song?.title || "",
      artist: song?.artist || "",
      notes: song?.notes || "",
      files: song?.files || [],
    };

    // Handle keyedFiles initialization
    let keyedFiles: KeyedSongFiles = {};

    if (song?.keyedFiles && Object.keys(song.keyedFiles).length > 0) {
      // Use existing keyedFiles if available
      keyedFiles = song.keyedFiles;
    } else if (song?.files && song.files.length > 0) {
      // Migrate old files to default key if no keyedFiles exist
      keyedFiles = { default: song.files };
    } else {
      // Start with empty structure
      keyedFiles = { default: [] };
    }

    return {
      ...baseData,
      keyedFiles,
    };
  }, [song]);

  const [formData, setFormData] = useState<Partial<Song>>(initializeFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>("default");

  // Reset form when dialog opens or when the song changes
  useEffect(() => {
    if (!open) return;
    const nextData = initializeFormData();
    setFormData(nextData);

    // Choose initial key: first key with files if available, else default
    let initialKey = "default";
    if (nextData.keyedFiles) {
      const keysWithFiles = Object.entries(nextData.keyedFiles).filter(
        ([, files]) => files && files.length > 0
      );
      if (keysWithFiles.length > 0) {
        initialKey = keysWithFiles[0][0];
      }
    }
    setSelectedKey(initialKey);
  }, [open, initializeFormData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sanitizeFileName = (fileName: string): string => {
    // Replace spaces and special characters with underscores
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_+/g, "_") // Replace multiple underscores with a single one
      .toLowerCase();
  };

  // Helper to get files for current selected key
  const getCurrentFiles = (): SongFile[] => {
    if (!formData.keyedFiles) return [];

    if (selectedKey === "default") {
      return formData.keyedFiles.default || [];
    }
    return formData.keyedFiles[selectedKey as MusicalKey] || [];
  };

  // Helper to update files for current selected key
  const updateFilesForKey = (files: SongFile[]) => {
    const updated: KeyedSongFiles = {
      ...formData.keyedFiles,
    } as KeyedSongFiles;
    if (selectedKey === "default") {
      updated.default = files;
    } else {
      updated[selectedKey as MusicalKey] = files;
    }

    setFormData((prev) => ({
      ...prev,
      keyedFiles: updated,
    }));

    return updated;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    if (!user.organizationId) {
      toast.error("Missing organization", {
        description:
          "You must select or belong to an organization to upload files.",
      });
      return;
    }

    setIsUploading(true);

    try {
      const newFiles: SongFile[] = [];

      for (const file of files) {
        const timestamp = Date.now();
        const sanitizedName = sanitizeFileName(file.name);
        const fileName = `${timestamp}-${sanitizedName}`;
        const filePath = `${user.organizationId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("song-files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        newFiles.push({
          id: crypto.randomUUID(),
          name: file.name, // Keep original name for display
          path: filePath,
          type: file.type,
          size: file.size,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      const currentFiles = getCurrentFiles();
      const updatedFiles = [...currentFiles, ...newFiles];
      const updatedKeyedFiles = updateFilesForKey(updatedFiles);

      // If editing an existing song, submit immediately to persist changes
      if (song) {
        await Promise.resolve(
          onSubmit({
            ...formData,
            keyedFiles: updatedKeyedFiles,
          })
        );
      }

      toast.success("Files uploaded", {
        description: `Successfully uploaded ${files.length} file(s) for ${
          selectedKey === "default" ? "default" : `key ${selectedKey}`
        }`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Upload failed", {
        description: "Failed to upload files. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = async (fileToRemove: SongFile) => {
    try {
      const { error } = await supabase.storage
        .from("song-files")
        .remove([fileToRemove.path]);

      if (error) throw error;

      const currentFiles = getCurrentFiles();
      const updatedFiles = currentFiles.filter(
        (file) => file.path !== fileToRemove.path
      );
      const updatedKeyedFiles = updateFilesForKey(updatedFiles);

      // If editing an existing song, submit immediately to persist changes
      if (song) {
        await Promise.resolve(
          onSubmit({
            ...formData,
            keyedFiles: updatedKeyedFiles,
          })
        );
      }

      toast.success("File removed", {
        description: "The file has been removed",
      });
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "Failed to remove file",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      toast.error("Missing title", {
        description: "Please provide a song title",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await Promise.resolve(onSubmit(formData));
      onOpenChange(false);
      toast.success(song ? "Song updated" : "Song saved");
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "Failed to save the song",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{song ? "Edit Song" : "Add Song"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter song title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artist">Artist</Label>
            <Input
              id="artist"
              name="artist"
              value={formData.artist}
              onChange={handleChange}
              placeholder="Enter artist name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add notes about the song (optional)"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Chord Sheets by Key</Label>
            <div className="rounded-lg border border-dashed p-4 space-y-4">
              {/* Key selector */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="key-select" className="text-sm font-medium">
                    Select Key
                  </Label>
                  <Select value={selectedKey} onValueChange={setSelectedKey}>
                    <SelectTrigger className="w-full max-w-48">
                      <SelectValue placeholder="Select a key" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (No Key)</SelectItem>
                      {AVAILABLE_KEYS.map((key) => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* File upload for selected key */}
                <div className="flex-1">
                  <Label className="text-sm font-medium">Upload Files</Label>
                  <div>
                    <input
                      type="file"
                      id="files"
                      className="hidden"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="files"
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : (
                        <UploadIcon className="h-4 w-4" />
                      )}
                      {isUploading
                        ? "Uploading..."
                        : `Upload for ${
                            selectedKey === "default" ? "Default" : selectedKey
                          }`}
                    </label>
                  </div>
                </div>
              </div>

              {/* Display files for selected key */}
              {getCurrentFiles().length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Files for{" "}
                    {selectedKey === "default"
                      ? "Default"
                      : `Key ${selectedKey}`}{" "}
                    ({getCurrentFiles().length}):
                  </p>
                  <div className="space-y-2">
                    {getCurrentFiles().map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-md border bg-card p-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{file.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFile(file)}
                        >
                          <TrashIcon className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overview of all keys with files */}
              {formData.keyedFiles &&
                (() => {
                  const keysWithFiles = Object.entries(
                    formData.keyedFiles
                  ).filter(([, files]) => files && files.length > 0);

                  if (keysWithFiles.length === 0) return null;

                  return (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-3">
                        File Summary ({keysWithFiles.length} key
                        {keysWithFiles.length !== 1 ? "s" : ""} with files):
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {keysWithFiles.map(([key, files]) => (
                          <div
                            key={key}
                            className={`flex justify-between items-center p-2 rounded border cursor-pointer transition-colors ${
                              selectedKey === key
                                ? "bg-primary/10 border-primary"
                                : "bg-muted/30 border-border hover:bg-muted/50"
                            }`}
                            onClick={() => setSelectedKey(key)}
                          >
                            <span className="font-medium">
                              {key === "default" ? "Default" : key}
                            </span>
                            <span className="text-muted-foreground">
                              {files!.length} file(s)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : song ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
