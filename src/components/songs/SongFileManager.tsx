import { useCallback, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  FileIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, isImage, isPDF } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useGetSignedSongFileUrls } from "@/api/songs/files";
import {
  AVAILABLE_KEYS,
  getAllKeyedFiles,
  KeyedSongFiles,
  MusicalKey,
  Song,
  SongFile,
} from "@/types";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface SongFileManagerProps {
  song: Song;
  onFilesChange: (keyedFiles: KeyedSongFiles) => Promise<unknown> | void;
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase();
}

export function SongFileManager({ song, onFilesChange }: SongFileManagerProps) {
  const { user } = useAuth();
  const [selectedKey, setSelectedKey] = useState<string>("G");
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<SongFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allKeyedFiles = useMemo(() => getAllKeyedFiles(song), [song]);

  // Aggregate file paths for signed URLs
  const filePaths = useMemo(() => {
    const allFiles: SongFile[] = [];
    Object.values(allKeyedFiles).forEach((files) => {
      if (files) allFiles.push(...files);
    });
    return Array.from(new Set(allFiles.map((f) => f.path)));
  }, [allKeyedFiles]);

  const versions = useMemo(() => {
    const versionMap = new Map<string, string | number | undefined>();
    Object.values(allKeyedFiles).forEach((files) => {
      (files || []).forEach((f: SongFile) =>
        versionMap.set(f.path, f.updatedAt)
      );
    });
    return filePaths.map((p) => versionMap.get(p));
  }, [allKeyedFiles, filePaths]);

  const { urlsByPath } = useGetSignedSongFileUrls({
    paths: filePaths,
    versions,
  });

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileOpen = useCallback(
    (path: string) => {
      const url = urlsByPath[path];
      if (url) {
        window.open(url, "_blank");
      }
    },
    [urlsByPath]
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    if (!user.organizationId) {
      toast.error("Missing organization");
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
          name: file.name,
          path: filePath,
          type: file.type,
          size: file.size,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      const updatedKeyedFiles: KeyedSongFiles = {
        ...(song.keyedFiles || {}),
      };
      const key = selectedKey as MusicalKey;
      updatedKeyedFiles[key] = [...(updatedKeyedFiles[key] || []), ...newFiles];

      await Promise.resolve(onFilesChange(updatedKeyedFiles));
      toast.success(`Uploaded ${files.length} file(s) for ${selectedKey}`);
    } catch (error) {
      console.error(error);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.storage
        .from("song-files")
        .remove([fileToDelete.path]);

      if (error) throw error;

      const updatedKeyedFiles: KeyedSongFiles = {
        ...(song.keyedFiles || {}),
      };
      const key = selectedKey as MusicalKey;
      updatedKeyedFiles[key] = (updatedKeyedFiles[key] || []).filter(
        (file) => file.path !== fileToDelete.path
      );

      await Promise.resolve(onFilesChange(updatedKeyedFiles));
      setExpandedFile(null);
      toast.success("File removed");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't remove file");
    } finally {
      setIsDeleting(false);
      setFileToDelete(null);
    }
  };

  const toggleExpand = (path: string) => {
    setExpandedFile((prev) => (prev === path ? null : path));
  };

  const currentFiles =
    allKeyedFiles[selectedKey as keyof typeof allKeyedFiles] || [];

  return (
    <>
      <div className="space-y-3">
        {/* Section label */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Files
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleUploadClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2Icon className="mr-1.5 h-3 w-3 animate-spin" />
            ) : (
              <PlusIcon className="mr-1.5 h-3 w-3" />
            )}
            {isUploading ? "Uploading..." : `Add for ${selectedKey}`}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </div>

        {/* Key pills - compact */}
        <div className="flex flex-wrap gap-1">
          {AVAILABLE_KEYS.map((key) => {
            const fileCount =
              allKeyedFiles[key as keyof typeof allKeyedFiles]?.length || 0;
            const hasFiles = fileCount > 0;
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedKey(key);
                  setExpandedFile(null);
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  selectedKey === key
                    ? "bg-primary text-primary-foreground"
                    : hasFiles
                    ? "bg-white/10 text-foreground hover:bg-white/15"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                )}
              >
                {key}
                {hasFiles && (
                  <span
                    className={cn(
                      "text-[10px]",
                      selectedKey === key
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {fileCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* File list with expandable preview */}
        {currentFiles.length > 0 ? (
          <div className="space-y-1">
            {currentFiles.map((file) => {
              const isExpanded = expandedFile === file.path;
              const url = urlsByPath[file.path];

              return (
                <div
                  key={file.path}
                  className="rounded-lg bg-white/5 overflow-hidden"
                >
                  {/* File row */}
                  <div
                    className="group flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-white/[0.08] transition-colors"
                    onClick={() => toggleExpand(file.path)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronDownIcon
                        className={cn(
                          "h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0",
                          isExpanded && "rotate-180"
                        )}
                      />
                      <span className="truncate text-sm text-foreground">
                        {file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileOpen(file.path);
                        }}
                      >
                        <ExternalLinkIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFileToDelete(file);
                        }}
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Expandable preview */}
                  {isExpanded && (
                    <div className="border-t border-white/5 bg-black/20 p-3">
                      {!url ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : isImage(file.name) ? (
                        <img
                          src={url}
                          alt={file.name}
                          className="mx-auto max-h-64 rounded-md object-contain"
                          loading="lazy"
                        />
                      ) : isPDF(file.name) ? (
                        <div className="flex justify-center">
                          <Document
                            file={url}
                            loading={
                              <div className="flex items-center justify-center py-8">
                                <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                              </div>
                            }
                          >
                            <Page
                              pageNumber={1}
                              width={280}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                            />
                          </Document>
                        </div>
                      ) : (
                        <p className="text-center text-xs text-muted-foreground py-4">
                          Preview not available.{" "}
                          <button
                            onClick={() => handleFileOpen(file.path)}
                            className="text-primary hover:underline"
                          >
                            Open file
                          </button>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            No files for {selectedKey}.{" "}
            <button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="text-primary hover:underline"
            >
              Upload one
            </button>
          </p>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {fileToDelete?.name}
              </span>{" "}
              from this song. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
