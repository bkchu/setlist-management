import { useCallback, useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
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
import { cn, isImage, isPDF } from "@/lib/utils";
import {
  getFilesForKey,
  hasFilesForSpecificKey,
  SetlistSong,
  SectionOrder,
  SongFile,
} from "@/types";
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  Loader2Icon,
  Music2Icon,
  StickyNoteIcon,
} from "lucide-react";
import { SectionOrderEditor } from "@/components/songs/section-order-editor";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

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
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);

  useEffect(() => {
    if (editingSong) {
      setEditableSong({ ...editingSong });
      setIsPreviewExpanded(false);
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
            sectionOrder: editableSong.sectionOrder,
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
      setIsPreviewExpanded(false);
    }
  };

  const handleNotesChange = (notes: string) => {
    if (editableSong) {
      setEditableSong((prev) => ({ ...prev, notes }));
    }
  };

  const handleSectionOrderChange = (sectionOrder: SectionOrder) => {
    if (editableSong) {
      setEditableSong((prev) => ({ ...prev, sectionOrder }));
    }
  };

  const handleResetSectionOrder = () => {
    if (songInDb && editableSong) {
      setEditableSong((prev) => ({
        ...prev,
        sectionOrder: songInDb.defaultSectionOrder || [],
      }));
    }
  };

  const handleOpenFile = useCallback(() => {
    if (editPreviewFileUrl) {
      window.open(editPreviewFileUrl, "_blank");
    }
  }, [editPreviewFileUrl]);

  const songInDb = editingSong
    ? songs.find((s) => s.id === editingSong.songId)
    : null;

  const filesForSelectedKey =
    songInDb && selectedKey ? getFilesForKey(songInDb, selectedKey) : [];
  const currentFile: SongFile | null =
    filesForSelectedKey.length > 0 ? filesForSelectedKey[0] : null;

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
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-semibold tracking-tight truncate">
                  {editingSong?.song.title || "Edit Song"}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground truncate">
                  {editingSong?.song.artist ||
                    "Update song details for this setlist"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {editingSong && editableSong && (
          <div className="relative px-4 sm:px-6 pb-5 sm:pb-6 space-y-4 sm:space-y-5">
            {/* Key Selection - Compact pills */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Key
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {KEY_OPTIONS.map((key) => {
                  const hasFiles = songInDb
                    ? hasFilesForSpecificKey(songInDb, key)
                    : false;
                  const isSelected = editableSong.key === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleKeyChange(key)}
                      className={cn(
                        "relative inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : hasFiles
                          ? "bg-white/10 text-foreground hover:bg-white/15"
                          : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      )}
                    >
                      {key}
                      {hasFiles && !isSelected && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Keys with files are marked with a dot
              </p>
            </div>

            {/* File Preview - Expandable */}
            {selectedKey && (
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  File for {selectedKey}
                </Label>

                {isEditPreviewLoading ? (
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : currentFile && editPreviewFileUrl ? (
                  <div className="rounded-lg bg-white/5 overflow-hidden">
                    {/* File row - clickable to expand */}
                    <div
                      className="group flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-white/[0.08] transition-colors"
                      onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronDownIcon
                          className={cn(
                            "h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0",
                            isPreviewExpanded && "rotate-180"
                          )}
                        />
                        <span className="truncate text-sm text-foreground">
                          {currentFile.name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFile();
                        }}
                      >
                        <ExternalLinkIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Expandable preview */}
                    {isPreviewExpanded && (
                      <div className="border-t border-white/5 bg-black/20 p-3">
                        {isImage(currentFile.name) ? (
                          <img
                            src={editPreviewFileUrl}
                            alt={currentFile.name}
                            className="mx-auto max-h-48 rounded-md object-contain"
                            loading="lazy"
                          />
                        ) : isPDF(currentFile.name) ? (
                          <div className="flex justify-center">
                            <Document
                              file={editPreviewFileUrl}
                              loading={
                                <div className="flex items-center justify-center py-8">
                                  <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                              }
                            >
                              <Page
                                pageNumber={1}
                                width={240}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                              />
                            </Document>
                          </div>
                        ) : (
                          <p className="text-center text-xs text-muted-foreground py-4">
                            Preview not available.{" "}
                            <button
                              onClick={handleOpenFile}
                              className="text-primary hover:underline"
                            >
                              Open file
                            </button>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      No file for {selectedKey} yet.
                    </p>
                    <SongFileUploader
                      songId={editingSong.songId}
                      songKey={selectedKey}
                      onUploadComplete={() => {
                        // Song data will be refreshed via React Query
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Section Order */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Section Order
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={
                    !songInDb?.defaultSectionOrder ||
                    songInDb.defaultSectionOrder.length === 0
                  }
                  onClick={handleResetSectionOrder}
                >
                  Reset to default
                </Button>
              </div>
              <SectionOrderEditor
                value={editableSong.sectionOrder || []}
                onChange={handleSectionOrderChange}
                hideHeader
              />
            </div>

            {/* Performance Notes */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <StickyNoteIcon className="h-3.5 w-3.5" />
                Performance Notes
              </Label>
              <Textarea
                value={editableSong.notes || ""}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="e.g., Skip verse 2, watch for tempo change"
                className="min-h-[80px] text-sm resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                Notes for this setlist only — visible during live viewing
              </p>
            </div>

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
