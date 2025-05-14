import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Song, SongFile } from "@/types";
import { useState } from "react";
import { FileIcon, Loader2Icon, TrashIcon, UploadIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

interface SongFormProps {
  song?: Song;
  onSubmit: (song: Partial<Song>) => void;
  onCancel: () => void;
}

export function SongForm({ song, onSubmit, onCancel }: SongFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<Song>>({
    title: song?.title || "",
    artist: song?.artist || "",
    notes: song?.notes || "",
    files: song?.files || [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sanitizeFileName = (fileName: string): string => {
    // Replace spaces and special characters with underscores
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_') // Replace multiple underscores with a single one
      .toLowerCase();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setIsUploading(true);

    try {
      const newFiles: SongFile[] = [];

      for (const file of files) {
        const timestamp = Date.now();
        const sanitizedName = sanitizeFileName(file.name);
        const fileName = `${timestamp}-${sanitizedName}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('song-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        newFiles.push({
          name: file.name, // Keep original name for display
          path: filePath,
          type: file.type,
          size: file.size,
        });
      }

      const updatedFiles = [...(formData.files || []), ...newFiles];
      setFormData(prev => ({
        ...prev,
        files: updatedFiles,
      }));

      // Submit the updated song data immediately after successful upload
      onSubmit({
        ...formData,
        files: updatedFiles,
      });

      toast({
        title: "Files uploaded",
        description: `Successfully uploaded ${files.length} file(s)`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = async (fileToRemove: SongFile) => {
    try {
      const { error } = await supabase.storage
        .from('song-files')
        .remove([fileToRemove.path]);

      if (error) throw error;

      const updatedFiles = formData.files?.filter(file => file.path !== fileToRemove.path) || [];
      setFormData(prev => ({
        ...prev,
        files: updatedFiles,
      }));

      // Submit the updated song data immediately after successful removal
      onSubmit({
        ...formData,
        files: updatedFiles,
      });

      toast({
        title: "File removed",
        description: "The file has been removed",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to remove file",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast({
        title: "Missing title",
        description: "Please provide a song title",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      onSubmit(formData);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to save the song",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardHeader>
        <CardTitle>{song ? "Edit Song" : "Add New Song"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <Label>Files</Label>
          <div className="rounded-lg border border-dashed p-4">
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
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
            >
              {isUploading ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <UploadIcon className="h-4 w-4" />
              )}
              {isUploading ? "Uploading..." : "Upload Files"}
            </label>
            {formData.files && formData.files.length > 0 && (
              <div className="mt-4 space-y-2">
                {formData.files.map((file, index) => (
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
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : song ? "Update" : "Save"}
        </Button>
      </CardFooter>
    </form>
  );
}