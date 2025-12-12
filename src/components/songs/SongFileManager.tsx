import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ExternalLinkIcon,
  FileIcon,
  FolderOpenIcon,
  Loader2Icon,
  PlusIcon,
  TrashIcon,
  UploadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allKeyedFiles = useMemo(() => getAllKeyedFiles(song), [song]);

  const keysWithFiles = useMemo(
    () =>
      Object.entries(allKeyedFiles).filter(
        ([key, files]) => key !== "default" && files && files.length > 0
      ),
    [allKeyedFiles]
  );

  // Initialize selected key
  useEffect(() => {
    if (keysWithFiles.length > 0) {
      setSelectedKey((prev) => (prev ? prev : keysWithFiles[0][0]));
      setSelectedFileIndex(0);
    } else {
      setSelectedKey("G");
      setSelectedFileIndex(0);
    }
  }, [keysWithFiles]);

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

  const { urlsByPath, results } = useGetSignedSongFileUrls({
    paths: filePaths,
    versions,
  });

  const isPathLoading = useCallback(
    (path: string) => {
      const index = filePaths.indexOf(path);
      if (index === -1) return false;
      return results[index]?.isLoading ?? false;
    },
    [filePaths, results]
  );

  // Resize listener for PDF width
  const handleResize = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [handleResize]);

  const handleFileOpen = (path: string) => {
    const url = urlsByPath[path];
    if (url) {
      window.open(url, "_blank");
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user?.organizationId) return;

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
      toast.error("Upload failed", { description: "Please try again." });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = async (fileToRemove: SongFile) => {
    try {
      const { error } = await supabase.storage
        .from("song-files")
        .remove([fileToRemove.path]);

      if (error) throw error;

      const updatedKeyedFiles: KeyedSongFiles = {
        ...(song.keyedFiles || {}),
      };
      const key = selectedKey as MusicalKey;
      updatedKeyedFiles[key] = (updatedKeyedFiles[key] || []).filter(
        (file) => file.path !== fileToRemove.path
      );

      await Promise.resolve(onFilesChange(updatedKeyedFiles));
      toast.success("File removed");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't remove file");
    }
  };

  const currentFiles =
    allKeyedFiles[selectedKey as keyof typeof allKeyedFiles] || [];
  const currentFile = currentFiles[selectedFileIndex];
  const maxPdfWidth = Math.min(containerWidth * 0.95, 800);

  // Reset pagination when switching files
  useEffect(() => {
    setNumPages(null);
    setPageNumber(1);
  }, [selectedFileIndex, selectedKey]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <FileIcon className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Files by Key
            </p>
            <p className="text-xs text-muted-foreground">
              Upload chord sheets for each key. PDFs and images supported.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadIcon className="mr-2 h-4 w-4" />
              Upload
            </>
          )}
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

      {/* Key pills */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-white/10 px-4 py-3">
        {AVAILABLE_KEYS.map((key) => {
          const hasFiles = keysWithFiles.some(([k]) => k === key);
          return (
            <button
              key={key}
              onClick={() => {
                setSelectedKey(key);
                setSelectedFileIndex(0);
              }}
              className={cn(
                "relative rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                selectedKey === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              )}
            >
              {key}
              {hasFiles && selectedKey !== key && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-4">
        {/* File list */}
        <div className="space-y-2 lg:col-span-1">
          {currentFiles.map((file, index) => (
            <div
              key={file.path}
              onClick={() => setSelectedFileIndex(index)}
              className={cn(
                "group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-all cursor-pointer",
                selectedFileIndex === index
                  ? "border border-primary/20 bg-primary/10 text-foreground"
                  : "border border-transparent hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{file.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(file);
                }}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {currentFiles.length === 0 && (
            <div className="rounded-lg border border-dashed border-white/15 bg-white/5 p-4 text-center text-sm text-muted-foreground">
              No files for {selectedKey} yet.
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                  className="w-full"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Upload for {selectedKey}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="lg:col-span-3" ref={containerRef}>
          {currentFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/5 py-12 text-center">
              <FolderOpenIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Upload a chord sheet to preview it here.
              </p>
            </div>
          ) : (
            currentFile && (
              <div className="rounded-lg border border-white/10 bg-card/60">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-sm font-medium">
                      {currentFile.name}
                    </span>
                    <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {selectedKey}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleFileOpen(currentFile.path)}
                  >
                    <ExternalLinkIcon className="mr-1.5 h-3.5 w-3.5" />
                    Open
                  </Button>
                </div>

                <div className="p-4">
                  {isPathLoading(currentFile.path) ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : urlsByPath[currentFile.path] ? (
                    <>
                      {isImage(currentFile.name) && (
                        <img
                          src={urlsByPath[currentFile.path]}
                          alt={currentFile.name}
                          className="mx-auto max-h-[500px] rounded-md object-contain"
                          loading="lazy"
                        />
                      )}
                      {isPDF(currentFile.name) && (
                        <div className="space-y-3">
                          {numPages && numPages > 1 && (
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                Page {pageNumber} of {numPages}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  disabled={pageNumber <= 1}
                                  onClick={() =>
                                    setPageNumber((p) => Math.max(1, p - 1))
                                  }
                                >
                                  Prev
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  disabled={
                                    numPages ? pageNumber >= numPages : true
                                  }
                                  onClick={() =>
                                    setPageNumber((p) =>
                                      numPages
                                        ? Math.min(numPages, p + 1)
                                        : p + 1
                                    )
                                  }
                                >
                                  Next
                                </Button>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-center overflow-hidden">
                            <Document
                              className="w-full"
                              file={urlsByPath[currentFile.path]}
                              onLoadSuccess={onDocumentLoadSuccess}
                              loading={
                                <div className="flex items-center justify-center py-12">
                                  <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                              }
                            >
                              <Page
                                key={`page_${pageNumber}`}
                                pageNumber={pageNumber}
                                width={maxPdfWidth}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                className="pdf-page"
                              />
                            </Document>
                          </div>
                        </div>
                      )}
                      {!isImage(currentFile.name) &&
                        !isPDF(currentFile.name) && (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FileIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Preview not available
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              onClick={() => handleFileOpen(currentFile.path)}
                            >
                              <ExternalLinkIcon className="mr-1.5 h-3.5 w-3.5" />
                              Open file
                            </Button>
                          </div>
                        )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
