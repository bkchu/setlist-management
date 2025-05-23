import { useParams, useNavigate } from "react-router-dom";
import { useSongs } from "@/hooks/use-songs";
import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SongForm } from "@/components/songs/song-form";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  EditIcon,
  FileIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MusicIcon,
  ArrowRightIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

// Set worker URL for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function SongPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { songs, updateSong, isLoading: isSongsLoading } = useSongs();
  const [isEditing, setIsEditing] = useState(false);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const song = songs.find((s) => s.id === id);

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
    if (isSongsLoading) return;
    
    if (!song) {
      navigate("/songs");
      toast({
        title: "Song not found",
        description: "The requested song could not be found.",
        variant: "destructive",
      });
    }
  }, [song, isSongsLoading, navigate]);

  useEffect(() => {
    if (song?.files) {
      song.files.forEach(async (file) => {
        if (!fileUrls[file.path]) {
          try {
            setIsLoading((prev) => ({ ...prev, [file.path]: true }));
            const { data, error } = await supabase.storage
              .from("song-files")
              .createSignedUrl(file.path, 3600); // 1 hour expiry

            if (error) {
              if (error.message.includes("Object not found")) {
                toast({
                  title: "File not found",
                  description: `The file "${file.name}" is no longer available.`,
                  variant: "destructive",
                });
              } else {
                throw error;
              }
              return;
            }

            if (data?.signedUrl) {
              setFileUrls((prev) => ({ ...prev, [file.path]: data.signedUrl }));
            }
          } catch (error) {
            console.error("Error getting file URL:", error);
            toast({
              title: "Error",
              description: "Failed to load file",
              variant: "destructive",
            });
          } finally {
            setIsLoading((prev) => ({ ...prev, [file.path]: false }));
          }
        }
      });
    }
  }, [song?.files]);

  const handleFileOpen = (path: string) => {
    const url = fileUrls[path];
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

  const handleEditSong = async (songData: Partial<typeof song>) => {
    if (!song) return;

    try {
      await updateSong(song.id, songData);
      setIsEditing(false);
      toast({
        title: "Song updated",
        description: "The song has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update song",
        variant: "destructive",
      });
    }
  };

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

                {song.keyHistory && song.keyHistory.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h2 className="text-lg font-semibold">Key History</h2>
                      <div className="mt-3 space-y-2">
                        {song.keyHistory.map((keyEntry) => (
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
                                    {format(
                                      new Date(keyEntry.playedAt),
                                      "MMM d, yyyy"
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground sm:mt-0 sm:ml-4">
                                <span className="hidden sm:inline">View Setlist</span>
                                <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <h2 className="text-lg font-semibold">Files</h2>
                  {song.files && song.files.length > 0 ? (
                    <div className="mt-4 space-y-6">
                      {song.files.map((file, index) => (
                        <div key={index} className="rounded-md border bg-card">
                          <div className="flex items-center justify-between border-b p-3">
                            <div className="flex items-center gap-2">
                              <FileIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{file.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleFileOpen(file.path)}
                            >
                              <ExternalLinkIcon className="h-4 w-4" />
                            </Button>
                          </div>

                          {isLoading[file.path] ? (
                            <div className="flex items-center justify-center p-8">
                              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            fileUrls[file.path] && (
                              <div className="p-4 w-full" ref={containerRef}>
                                {isImage(file.name) ? (
                                  <img
                                    src={fileUrls[file.path]}
                                    alt={file.name}
                                    className="mx-auto max-h-[600px] rounded-md object-contain"
                                    loading="lazy"
                                  />
                                ) : isPDF(file.name) ? (
                                  <div className="flex justify-center">
                                    <Document
                                      className="w-full"
                                      file={fileUrls[file.path]}
                                      onLoadSuccess={onDocumentLoadSuccess}
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
                                            renderAnnotationLayer={false}
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
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No files uploaded
                    </p>
                  )}
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

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>
            <VisuallyHidden>Edit Song</VisuallyHidden>
          </DialogTitle>
          <SongForm
            song={song}
            onSubmit={handleEditSong}
            onCancel={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
