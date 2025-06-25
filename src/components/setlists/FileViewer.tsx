import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Music2Icon, StickyNoteIcon, XIcon } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SlideItem } from "@/types";
import { NotesWindow } from "./notes-window";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface FileViewerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  slides: SlideItem[];
  onSaveNotes: (songId: string, notes: string) => Promise<void>;
  initialSlide?: number;
}

export function FileViewer({
  isOpen,
  onOpenChange,
  slides,
  onSaveNotes,
  initialSlide = 0,
}: FileViewerProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    startIndex: initialSlide,
  });
  const [currentSlideIndex, setCurrentSlideIndex] = useState(initialSlide);
  const [numPages, setNumPages] = useState<Record<string, number>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNotesWindowOpen, setIsNotesWindowOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState<string>("");
  const [notesDirty, setNotesDirty] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  const currentSlide = slides[currentSlideIndex];

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (emblaApi) {
      const onSelect = () => {
        setCurrentSlideIndex(emblaApi.selectedScrollSnap());
      };
      emblaApi.on("select", onSelect);
      setCurrentSlideIndex(emblaApi.selectedScrollSnap());
      return () => {
        emblaApi.off("select", onSelect);
      };
    }
  }, [emblaApi]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") scrollPrev();
      else if (e.key === "ArrowRight") scrollNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, scrollPrev, scrollNext]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) onOpenChange(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [onOpenChange]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        dialogContentRef.current?.requestFullscreen().catch((err) => {
          console.error(
            `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
          );
        });
      }, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    const updateDimensions = () => {
      if (carouselContainerRef.current) {
        setContainerDimensions({
          width: carouselContainerRef.current.clientWidth - 48,
          height: carouselContainerRef.current.clientHeight - 180,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [isOpen]);

  useEffect(() => {
    if (currentSlide) {
      // Need to get the notes for the current song
      // This logic will need to be passed in from the parent for now.
      // setLocalNotes(currentSlide.notes || "");
    }
  }, [currentSlide]);

  const onDocumentLoadSuccess = (
    { numPages }: { numPages: number },
    path: string
  ) => {
    setNumPages((prev) => ({ ...prev, [path]: numPages }));
  };

  const handleSaveNotes = async () => {
    if (!currentSlide) return;
    await onSaveNotes(currentSlide.song_id, localNotes);
    setNotesDirty(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogContentRef}
        className={
          isFullscreen
            ? "fixed inset-0 z-50 bg-background m-0 w-screen h-dvh max-w-none rounded-none flex flex-col"
            : "max-w-6xl w-[95vw] sm:w-full overflow-y-auto max-h-[90vh]"
        }
        style={isFullscreen ? { padding: 0, margin: 0 } : {}}
      >
        <div className="relative space-y-4 w-full h-full">
          <div
            ref={carouselContainerRef}
            className={
              isFullscreen
                ? "carousel-container relative h-dvh"
                : "carousel-container relative h-[calc(100vh-200px)]"
            }
          >
            <div className="overflow-hidden h-full" ref={emblaRef}>
              <div className="flex h-full">
                {slides.map((slide) => (
                  <div
                    key={slide.key}
                    className="relative min-w-full flex-[0_0_100%] h-full"
                  >
                    <div className="space-y-4 flex flex-col h-full">
                      <div className="flex flex-1 justify-center overflow-y-auto bg-muted/20 rounded-lg">
                        {slide.type === "image" && slide.url && (
                          <img
                            src={slide.url}
                            alt={slide.name}
                            className="h-auto max-w-full rounded-lg object-contain"
                            style={{
                              maxHeight: "calc(100vh - 106px)",
                              maxWidth: "100%",
                            }}
                          />
                        )}
                        {slide.type === "pdf" && slide.url && (
                          <Document
                            file={slide.url}
                            onLoadSuccess={(pdf) =>
                              onDocumentLoadSuccess(pdf, slide.path)
                            }
                            loading={
                              <div className="flex h-[400px] items-center justify-center">
                                <div className="text-center">
                                  <div className="mb-2 animate-spin">
                                    <Music2Icon className="h-8 w-8" />
                                  </div>
                                  <p>Loading PDF...</p>
                                </div>
                              </div>
                            }
                          >
                            <Page
                              pageNumber={slide.pageNumber}
                              width={Math.min(800, containerDimensions.width)}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                            />
                          </Document>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isFullscreen && (
              <div className="absolute bottom-0 right-0 flex flex-col gap-2 p-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-auto px-4 gap-2 h-12 rounded-md bg-white/60 backdrop-blur-sm hover:bg-white/80"
                  onClick={() => setIsNotesWindowOpen((prev) => !prev)}
                >
                  {isNotesWindowOpen ? (
                    <XIcon className="h-6 w-6 text-black" />
                  ) : (
                    <StickyNoteIcon className="h-6 w-6 text-black" />
                  )}
                  <p className="text-black">
                    {isNotesWindowOpen ? "Close" : "Open"} Notes
                  </p>
                </Button>
              </div>
            )}

            {isFullscreen && currentSlide && (
              <NotesWindow
                isOpen={isNotesWindowOpen}
                onOpenChange={setIsNotesWindowOpen}
                notes={localNotes}
                onNotesChange={(val) => {
                  setLocalNotes(val);
                  // Original notes need to be fetched and passed in.
                  // setNotesDirty(val !== (setlist?.songs[currentSlideIndex]?.notes || ""));
                }}
                onSaveNotes={handleSaveNotes}
                notesDirty={notesDirty}
                songTitle={currentSlide.songTitle || ""}
                pageNumber={currentSlide.pageNumber}
                totalPages={
                  currentSlide.type === "pdf"
                    ? numPages[currentSlide.path]
                    : undefined
                }
                containerRef={carouselContainerRef}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
