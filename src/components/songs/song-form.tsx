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
  DialogDescription,
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
import { FileIcon, Loader2Icon, Music2Icon, PencilIcon, TrashIcon, UploadIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface SongFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  song?: Song;
  onSubmit: (
    song: Partial<Song>,
    meta?: { selectedKey: string }
  ) => Promise<void> | void;
  variant?: "dialog" | "inline";
}

export function SongForm({
  open,
  onOpenChange,
  song,
  onSubmit,
  variant = "dialog",
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
    } else {
      // Start with empty structure
      keyedFiles = {};
    }

    return {
      ...baseData,
      keyedFiles,
    };
  }, [song]);

  const [formData, setFormData] = useState<Partial<Song>>(initializeFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>("");

  // Reset form when dialog opens or when the song changes
  useEffect(() => {
    // For inline variant, initialize on mount; for dialog variant, initialize when opened
    if (variant === "dialog" && !open) return;
    const nextData = initializeFormData();
    setFormData(nextData);

    // Choose initial key: first key with files if available, else first available key (G)
    let initialKey = "G";
    if (nextData.keyedFiles) {
      const keysWithFiles = Object.entries(nextData.keyedFiles).filter(
        ([, files]) => files && files.length > 0
      );
      if (keysWithFiles.length > 0) {
        initialKey = keysWithFiles[0][0];
      }
    }
    setSelectedKey(initialKey);
  }, [open, initializeFormData, variant]);

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
    if (!formData.keyedFiles || !selectedKey) return [];
    return formData.keyedFiles[selectedKey as MusicalKey] || [];
  };

  // Helper to update files for current selected key
  const updateFilesForKey = (files: SongFile[]) => {
    const updated: KeyedSongFiles = {
      ...formData.keyedFiles,
    } as KeyedSongFiles;
    updated[selectedKey as MusicalKey] = files;

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
        description: `Successfully uploaded ${files.length} file(s) for key ${selectedKey}`,
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
      await Promise.resolve(onSubmit(formData, { selectedKey }));
      if (variant === "dialog") {
        onOpenChange?.(false);
        toast.success(song ? "Song updated" : "Song saved");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "Failed to save the song",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(song);
  const isMobile = useIsMobile();

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {/* Title field */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label 
          htmlFor="title"
          className="text-xs sm:text-sm font-medium text-foreground/90"
        >
          Title
        </Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Amazing Grace"
          className="h-10 sm:h-11"
          required
        />
      </div>

      {/* Artist field */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label 
          htmlFor="artist"
          className="text-xs sm:text-sm font-medium text-foreground/90"
        >
          Artist
        </Label>
        <Input
          id="artist"
          name="artist"
          value={formData.artist}
          onChange={handleChange}
          placeholder="John Newton"
          className="h-10 sm:h-11"
        />
      </div>

      {/* Notes field */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label 
          htmlFor="notes"
          className="text-xs sm:text-sm font-medium text-foreground/90"
        >
          Notes
        </Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add notes about the song (optional)"
          rows={3}
          className="text-sm resize-none"
        />
      </div>

      {/* Chord Sheets by Key */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm font-medium text-foreground/90">
          Chord Sheets by Key
        </Label>
        <div className="rounded-xl border border-white/10 bg-background/30 p-3 sm:p-4 space-y-4">
          {/* Key selector and upload */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="key-select" className="text-xs text-muted-foreground">
                Select Key
              </Label>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger className="w-full h-10 sm:h-9">
                  <SelectValue placeholder="Select a key" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File upload for selected key */}
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Upload Files</Label>
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
                  className="flex h-10 sm:h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-card px-4 text-sm font-medium text-[#f8faf8] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] transition-colors hover:border-white/20"
                >
                  {isUploading ? (
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadIcon className="h-4 w-4" />
                  )}
                  <span className="truncate">
                    {isUploading ? "Uploading..." : isMobile ? `${selectedKey}` : `Upload for ${selectedKey}`}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Display files for selected key */}
          {getCurrentFiles().length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Files for {selectedKey} ({getCurrentFiles().length})
              </p>
              <div className="space-y-1.5">
                {getCurrentFiles().map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-white/8 bg-background/40 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-foreground/90">{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveFile(file)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overview of all keys with files */}
          {formData.keyedFiles &&
            (() => {
              const keysWithFiles = Object.entries(formData.keyedFiles).filter(
                ([, files]) => files && files.length > 0
              );

              if (keysWithFiles.length === 0) return null;

              return (
                <div className="pt-3 border-t border-white/8">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Summary · {keysWithFiles.length} key{keysWithFiles.length !== 1 ? "s" : ""}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-xs">
                    {keysWithFiles.map(([key, files]) => (
                      <button
                        type="button"
                        key={key}
                        className={`flex justify-between items-center px-2.5 py-1.5 rounded-md border transition-colors ${
                          selectedKey === key
                            ? "bg-primary/15 border-primary/30 text-primary"
                            : "bg-background/30 border-white/8 text-foreground/70 hover:bg-background/50 hover:border-white/15"
                        }`}
                        onClick={() => setSelectedKey(key)}
                      >
                        <span className="font-medium">{key}</span>
                        <span className="text-[10px] opacity-70">
                          {files!.length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
        </div>
      </div>

      {/* Actions */}
      {variant === "dialog" ? (
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2">
          <DialogClose asChild>
            <Button 
              type="button" 
              variant="ghost" 
              disabled={isSubmitting}
              className="h-10 sm:h-9"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="h-10 sm:h-9"
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Add Song"
            )}
          </Button>
        </div>
      ) : (
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting} className="h-10 sm:h-9">
            {isSubmitting ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Add Song"
            )}
          </Button>
        </div>
      )}
    </form>
  );

  if (variant === "dialog") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85vh] overflow-hidden p-0">
          {/* Decorative header gradient */}
          <div className="absolute inset-x-0 top-0 h-24 sm:h-32 bg-gradient-to-b from-primary/8 via-primary/4 to-transparent pointer-events-none" />
          <div className="absolute top-4 sm:top-6 right-12 sm:right-16 w-16 sm:w-20 h-16 sm:h-20 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative px-4 sm:px-6 pt-5 sm:pt-6 pb-2">
            <DialogHeader className="space-y-3">
              {/* Icon badge - stacks on mobile, inline on desktop */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/20">
                  {isEditing ? (
                    <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  ) : (
                    <Music2Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  )}
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <DialogTitle className="text-lg sm:text-xl font-semibold tracking-tight">
                    {isEditing ? "Edit Song" : "New Song"}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                    {isEditing 
                      ? "Update song details and chord sheets" 
                      : "Add a song to your library"}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="relative px-4 sm:px-6 pb-5 sm:pb-6 overflow-y-auto max-h-[calc(85vh-120px)]">
            {formBody}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return <div className="space-y-4">{formBody}</div>;
}
