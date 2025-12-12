import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  FileIcon,
  ExternalLinkIcon,
  Loader2Icon,
  FolderOpenIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGetSignedSongFileUrls } from "@/api/songs/files";
import { getAllKeyedFiles, SongFile, Song } from "@/types";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set worker URL for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface SongFileViewerProps {
  song: Song;
}

export function SongFileViewer({ song }: SongFileViewerProps) {
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get all keyed files
  const allKeyedFiles = useMemo(() => getAllKeyedFiles(song), [song]);
  const keysWithFiles = useMemo(
    () =>
      Object.entries(allKeyedFiles).filter(
        ([key, files]) => key !== "default" && files && files.length > 0
      ),
    [allKeyedFiles]
  );

  // Initialize selected key when song changes
  useEffect(() => {
    if (keysWithFiles.length > 0 && !selectedKey) {
      setSelectedKey(keysWithFiles[0][0]);
      setSelectedFileIndex(0);
    }
  }, [keysWithFiles, selectedKey]);

  // Gather all file paths for batch URL fetching
  const filePaths = useMemo(() => {
    const allFiles: SongFile[] = [];
    Object.values(allKeyedFiles).forEach((files) => {
      if (files) allFiles.push(...files);
    });
    return Array.from(new Set(allFiles.map((f) => f.path)));
  }, [allKeyedFiles]);

  const versions = useMemo(() => {
    const allFiles: SongFile[] = [];
    Object.values(allKeyedFiles).forEach((files) => {
      if (files) allFiles.push(...files);
    });
    const versionMap = new Map<string, string | number | undefined>();
    allFiles.forEach((f) => versionMap.set(f.path, f.updatedAt));
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

  // Handle container resize
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

  const getFileExtension = (filename: string) => {
    return filename
      .slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2)
      .toLowerCase();
  };

  const isImage = (filename: string) => {
    const ext = getFileExtension(filename);
    return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  };

  const isPDF = (filename: string) => {
    return getFileExtension(filename) === "pdf";
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  // Empty state
  if (keysWithFiles.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FolderOpenIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No files uploaded yet</p>
        </div>
      </div>
    );
  }

  const currentFiles =
    allKeyedFiles[selectedKey as keyof typeof allKeyedFiles] || [];
  const currentFile = currentFiles[selectedFileIndex];
  const maxPdfWidth = Math.min(containerWidth * 0.95, 800);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
      {/* Key tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 p-3">
        <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="shrink-0 text-sm font-medium text-foreground">
          Files
        </span>
        <div className="mx-2 h-4 w-px bg-white/10" />
        <div className="flex gap-1.5">
          {keysWithFiles.map(([key, files]) => (
            <button
              key={key}
              onClick={() => {
                setSelectedKey(key);
                setSelectedFileIndex(0);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                selectedKey === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
              )}
            >
              {key}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  selectedKey === key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-white/10"
                )}
              >
                {files!.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* File list and preview */}
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-4">
        {/* File list */}
        <div className="space-y-1.5 lg:col-span-1">
          {currentFiles.map((file, index) => (
            <button
              key={file.path}
              onClick={() => setSelectedFileIndex(index)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all",
                selectedFileIndex === index
                  ? "border border-primary/20 bg-primary/10 text-foreground"
                  : "border border-transparent hover:bg-white/5"
              )}
            >
              <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{file.name}</span>
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="lg:col-span-3" ref={containerRef}>
          {currentFile && (
            <div className="rounded-lg border border-white/10 bg-card/50">
              {/* File header */}
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

              {/* File content */}
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
                          {Array.from(new Array(numPages || 0), (_, index) => (
                            <Page
                              key={`page_${index + 1}`}
                              pageNumber={index + 1}
                              width={maxPdfWidth}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              className="pdf-page"
                            />
                          ))}
                        </Document>
                      </div>
                    )}
                    {!isImage(currentFile.name) && !isPDF(currentFile.name) && (
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
          )}
        </div>
      </div>
    </div>
  );
}







