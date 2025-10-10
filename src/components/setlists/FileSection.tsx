import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SongFileUploader } from "@/components/songs/song-file-uploader";
import { FileIcon } from "lucide-react";
import { getFilesForKey, Song, SongFile } from "@/types";
import { isImage, isPDF } from "@/lib/utils";

export function FileSection({
  selectedSong,
  selectedKey,
  previewFileUrl,
  isPreviewLoading,
  onFileAdded,
}: {
  selectedSong: Song;
  selectedKey: string;
  previewFileUrl: string | null;
  isPreviewLoading: boolean;
  onFileAdded: (file: SongFile) => void;
}) {
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    setShowUploader(false);
  }, [selectedSong?.id, selectedKey]);

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

  const filesForSelectedKey = getFilesForKey(selectedSong, selectedKey);

  if (isPreviewLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        Loading preview...
      </div>
    );
  }

  if (filesForSelectedKey.length > 0 && previewFileUrl) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          File Preview (Key: {selectedKey})
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
              PDF preview not available here, but file is present.
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
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setShowUploader((v) => !v)}
          >
            {showUploader ? "Hide uploader" : "Add file"}
          </Button>
        </div>
        {showUploader && (
          <SongFileUploader
            songId={selectedSong.id}
            songKey={selectedKey}
            onUploadComplete={(newFile: SongFile) => {
              onFileAdded(newFile);
              setShowUploader(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 text-center text-sm text-muted-foreground">
        No file exists for this key yet. You can add the song now and upload a
        file from the song page later.
      </div>
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => setShowUploader((v) => !v)}
        >
          {showUploader ? "Hide uploader" : "Add file"}
        </Button>
      </div>
      {showUploader && (
        <SongFileUploader
          songId={selectedSong.id}
          songKey={selectedKey}
          onUploadComplete={(newFile: SongFile) => {
            onFileAdded(newFile);
            setShowUploader(false);
          }}
        />
      )}
    </div>
  );
}
