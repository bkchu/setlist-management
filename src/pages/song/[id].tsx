import { useParams, useNavigate } from "react-router-dom";
import { useGetSong } from "@/api/songs/get";
import { useUpdateSong } from "@/api/songs/put";
import { useGetSignedSongFileUrls } from "@/api/songs/files";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { SongForm } from "@/components/songs/song-form";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  EditIcon,
  FileIcon,
  ExternalLinkIcon,
  Loader2Icon,
  ArrowRightIcon,
} from "lucide-react";
// import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
// import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
// import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { getAllKeyedFiles, SongFile, Song } from "@/types";
import "./_[id].css";

// Set worker URL for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function SongPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: song, isLoading: isSongLoading } = useGetSong({ songId: id });
  const updateSongMutation = useUpdateSong(id || "");
  const [isEditing, setIsEditing] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedKey, setSelectedKey] = useState<string>("default");
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  // Handle container resize
  const handleResize = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    // Initial width
    handleResize();

    // Add resize observer
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [handleResize]);

  useEffect(() => {
    if (isSongLoading) return;

    if (!song) {
      navigate("/songs");
      toast.error("Song not found", {
        description: "The requested song could not be found.",
      });
    }
  }, [song, isSongLoading, navigate]);

  const filePaths = useMemo(() => {
    if (!song) return [] as string[];
    const allKeyedFiles = getAllKeyedFiles(song);
    const allFiles: SongFile[] = [];
    Object.values(allKeyedFiles).forEach((files) => {
      if (files) allFiles.push(...files);
    });
    return Array.from(new Set(allFiles.map((f) => f.path)));
  }, [song]);

  const versions = useMemo(() => {
    if (!song) return [] as (string | number | undefined)[];
    const allKeyedFiles = getAllKeyedFiles(song);
    const allFiles: SongFile[] = [];
    Object.values(allKeyedFiles).forEach((files) => {
      if (files) allFiles.push(...files);
    });
    const versionMap = new Map<string, string | number | undefined>();
    allFiles.forEach((f) => versionMap.set(f.path, f.updatedAt));
    return filePaths.map((p) => versionMap.get(p));
  }, [song, filePaths]);

  const { urlsByPath, results } = useGetSignedSongFileUrls({
    paths: filePaths,
    // Use default 8-hour expiry for long sessions
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

  // Initialize selected key when song changes
  useEffect(() => {
    if (song) {
      const allKeyedFiles = getAllKeyedFiles(song);
      const keysWithFiles = Object.entries(allKeyedFiles).filter(
        ([, files]) => files && files.length > 0
      );

      if (keysWithFiles.length > 0) {
        setSelectedKey(keysWithFiles[0][0]);
        setSelectedFileIndex(0);
      }
    }
  }, [song]);

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

  const handleEditSong = async (songData: Partial<Song>) => {
    if (!song) return;

    try {
      await updateSongMutation.mutateAsync(songData);
      setIsEditing(false);
      toast.success("Song updated", {
        description: "The song has been updated successfully",
      });
    } catch {
      toast.error("Error", {
        description: "Failed to update song",
      });
    }
  };

  const keyHistory = useMemo(() => {
    if (!song) return null;

    return song.keyHistory?.map((keyEntry) => (
      <Link
        key={keyEntry.id}
        to={`/setlist/${keyEntry.setlistId}`}
        className="group block"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-transparent p-3 transition-colors hover:border-muted hover:bg-muted/50 sm:p-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {keyEntry.key}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground line-clamp-1">
                {keyEntry.setlistName}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(keyEntry.playedAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground sm:mt-0 sm:ml-4">
            <span className="hidden sm:inline">View Setlist</span>
            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    ));
  }, [song]);

  if (!song) {
    return null;
  }

  // Calculate the max width for the PDF (80% of container or 800px, whichever is smaller)
  const maxPdfWidth = Math.min(containerWidth * 0.9, 800);

  return (
    <div className="flex flex-col">
      <Header title={song.title} />

      <div className="flex-1 space-y-8 overflow-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <Breadcrumb
            items={[
              { href: "/songs", label: "Songs" },
              { href: `/song/${song.id}`, label: song.title },
            ]}
          />
          <Button onClick={() => setIsEditing(true)}>
            <EditIcon className="mr-2 h-4 w-4" />
            Edit Song
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Details</h2>
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Artist
                      </span>
                      <p className="text-foreground">{song.artist}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Notes
                      </span>
                      <p className="whitespace-pre-wrap text-foreground">
                        {song.notes || "No notes added"}
                      </p>
                    </div>
                  </div>
                </div>

                {song.keyHistory && song.keyHistory?.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h2 className="text-lg font-semibold">Key History</h2>
                      <div className="mt-3 space-y-2">{keyHistory}</div>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <h2 className="text-lg font-semibold">Files by Key</h2>
                  {(() => {
                    const allKeyedFiles = getAllKeyedFiles(song);
                    const keysWithFiles = Object.entries(allKeyedFiles).filter(
                      ([, files]) => files && files.length > 0
                    );

                    if (keysWithFiles.length === 0) {
                      return (
                        <p className="mt-2 text-sm text-muted-foreground">
                          No files uploaded
                        </p>
                      );
                    }

                    const currentFiles =
                      allKeyedFiles[
                        selectedKey as keyof typeof allKeyedFiles
                      ] || [];
                    const currentFile = currentFiles[selectedFileIndex];

                    return (
                      <div className="mt-4 space-y-4">
                        {/* Key selector tabs */}
                        <div className="flex flex-wrap gap-2">
                          {keysWithFiles.map(([key, files]) => (
                            <Button
                              key={key}
                              variant={
                                selectedKey === key ? "default" : "outline"
                              }
                              size="sm"
                              className="h-8 px-3 text-sm"
                              onClick={() => {
                                setSelectedKey(key);
                                setSelectedFileIndex(0);
                              }}
                            >
                              {key === "default" ? "Default" : key}
                              <span className="ml-1 text-xs opacity-70">
                                ({files!.length})
                              </span>
                            </Button>
                          ))}
                        </div>

                        {/* File list for selected key */}
                        {currentFiles.length > 0 && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* File list sidebar */}
                              <div className="space-y-2">
                                <h3 className="text-sm font-medium text-muted-foreground">
                                  Files for{" "}
                                  {selectedKey === "default"
                                    ? "Default"
                                    : `Key ${selectedKey}`}
                                  :
                                </h3>
                                <div className="space-y-1 max-h-64 overflow-y-auto">
                                  {currentFiles.map((file, index) => (
                                    <div
                                      key={index}
                                      className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
                                        selectedFileIndex === index
                                          ? "bg-primary/10 border border-primary/20"
                                          : "hover:bg-muted/50 border border-transparent"
                                      }`}
                                      onClick={() =>
                                        setSelectedFileIndex(index)
                                      }
                                    >
                                      <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                      <span className="truncate flex-1">
                                        {file.name}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleFileOpen(file.path);
                                        }}
                                      >
                                        <ExternalLinkIcon className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* File preview */}
                              <div className="lg:col-span-2">
                                {currentFile && (
                                  <div className="rounded-md border bg-card">
                                    <div className="flex items-center justify-between border-b p-3">
                                      <div className="flex items-center gap-2">
                                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">
                                          {currentFile.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          (
                                          {selectedKey === "default"
                                            ? "Default"
                                            : `Key ${selectedKey}`}
                                          )
                                        </span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          handleFileOpen(currentFile.path)
                                        }
                                      >
                                        <ExternalLinkIcon className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    {isPathLoading(currentFile.path) ? (
                                      <div className="flex items-center justify-center p-8">
                                        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                                      </div>
                                    ) : (
                                      urlsByPath[currentFile.path] && (
                                        <div
                                          className="p-4 w-full"
                                          ref={containerRef}
                                        >
                                          {isImage(currentFile.name) ? (
                                            <img
                                              src={urlsByPath[currentFile.path]}
                                              alt={currentFile.name}
                                              className="mx-auto max-h-[600px] rounded-md object-contain"
                                              loading="lazy"
                                            />
                                          ) : isPDF(currentFile.name) ? (
                                            <div className="flex justify-center">
                                              <Document
                                                className="w-full"
                                                file={
                                                  urlsByPath[currentFile.path]
                                                }
                                                onLoadSuccess={
                                                  onDocumentLoadSuccess
                                                }
                                                loading={
                                                  <div className="flex items-center justify-center p-8">
                                                    <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                                                  </div>
                                                }
                                              >
                                                {Array.from(
                                                  new Array(numPages || 0),
                                                  (_, index) => (
                                                    <Page
                                                      key={`page_${index + 1}`}
                                                      pageNumber={index + 1}
                                                      width={maxPdfWidth}
                                                      renderTextLayer={false}
                                                      renderAnnotationLayer={
                                                        false
                                                      }
                                                      className="pdf-page"
                                                    />
                                                  )
                                                )}
                                              </Document>
                                            </div>
                                          ) : null}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold">Information</h2>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>
                      {format(new Date(song.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last updated</span>
                    <span>
                      {format(new Date(song.updatedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <SongForm
        open={isEditing}
        onOpenChange={setIsEditing}
        song={song}
        onSubmit={handleEditSong}
      />
    </div>
  );
}
