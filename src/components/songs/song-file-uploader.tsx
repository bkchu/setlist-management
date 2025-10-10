import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, UploadCloudIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSongs } from "@/hooks/use-songs";
import { SongFile, MusicalKey } from "@/types";
import { useAuth } from "@/hooks/use-auth";

interface SongFileUploaderProps {
  songId: string;
  songKey: string;
  onUploadComplete: (newFile: SongFile) => void;
}

export function SongFileUploader({
  songId,
  songKey,
  onUploadComplete,
}: SongFileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { songs, updateSong } = useSongs();
  const { user } = useAuth();
  const song = songs.find((s) => s.id === songId);

  const onDrop = async (acceptedFiles: File[]) => {
    if (!song) {
      toast.error("Error", {
        description: "Song not found for upload.",
      });
      return;
    }
    if (!user) {
      toast.error("Error", {
        description: "You must be logged in to upload files.",
      });
      return;
    }
    if (!user.organizationId) {
      toast.error("Error", {
        description:
          "You must select or belong to an organization to upload files.",
      });
      return;
    }

    if (acceptedFiles.length === 0) {
      return;
    }

    const file = acceptedFiles[0];
    setIsUploading(true);

    try {
      const filePath = `${user.organizationId}/${songId}/${songKey}/${file.name}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("song-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true, // Overwrite if file with same name exists for the key
        });

      if (uploadError) {
        throw uploadError;
      }

      // Update the song's keyedFiles property in the database
      const newFileEntry: Omit<SongFile, "id" | "createdAt" | "updatedAt"> = {
        name: file.name,
        path: filePath,
        size: file.size,
        type: file.type,
      };

      const newKeyedFiles = { ...(song.keyedFiles || {}) };
      const key = songKey as MusicalKey;

      if (!newKeyedFiles[key]) {
        newKeyedFiles[key] = [];
      }
      // Check if file already exists and replace it, otherwise add it.
      const existingFileIndex = newKeyedFiles[key].findIndex(
        (f: SongFile) => f.name === newFileEntry.name
      );

      const fileWithIds: SongFile = {
        ...newFileEntry,
        id:
          existingFileIndex > -1
            ? newKeyedFiles[key][existingFileIndex].id
            : crypto.randomUUID(),
        createdAt:
          existingFileIndex > -1
            ? newKeyedFiles[key][existingFileIndex].createdAt
            : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingFileIndex > -1) {
        newKeyedFiles[key][existingFileIndex] = fileWithIds;
      } else {
        newKeyedFiles[key].push(fileWithIds);
      }

      await updateSong(songId, { keyedFiles: newKeyedFiles });

      // Find the created file to pass back (this is a bit tricky without a direct db response)
      // For now, we construct a partial object. The parent component will refetch.
      const uploadedFile: SongFile = {
        ...newFileEntry,
        id: crypto.randomUUID(), // This is temporary
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      toast.success("Upload successful", {
        description: `${file.name} has been uploaded.`,
      });

      onUploadComplete(uploadedFile);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        isDragActive
          ? "border-primary bg-primary/10"
          : "border-muted-foreground/20 hover:border-primary/50"
      } ${isUploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Uploading...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <UploadCloudIcon className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? "Drop the file here..."
              : "Drag & drop a file here, or click to select"}
          </p>
          <Button type="button" size="sm" variant="outline" className="mt-2">
            Select File
          </Button>
        </div>
      )}
    </div>
  );
}
