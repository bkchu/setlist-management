import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Music2Icon } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SlideItem } from "@/types";
import { NotesBar } from "./notes-bar";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface FileViewerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  slides: SlideItem[];
  initialSlide?: number;
  onPdfPageCountDiscovered?: (path: string, numPages: number) => void;
  onSaveNotes?: (songId: string, notes: string) => void;
}

export function FileViewer({
  isOpen,
  onOpenChange,
  slides,
  initialSlide = 0,
  onPdfPageCountDiscovered,
}: FileViewerProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    startIndex: initialSlide,
  });
  const [currentSlideIndex, setCurrentSlideIndex] = useState(initialSlide);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Use slides directly - expansion is handled by the hook
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
        const newIndex = emblaApi.selectedScrollSnap();
        setCurrentSlideIndex(newIndex);
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

  // Re-init embla when slides change (e.g., PDF pages expand)
  const prevSlidesLengthRef = useRef(slides.length);
  useEffect(() => {
    if (!emblaApi || slides.length === 0) return;

    // Only reinit if slides actually changed
    if (prevSlidesLengthRef.current !== slides.length) {
      prevSlidesLengthRef.current = slides.length;
      emblaApi.reInit();
      // Maintain position after reinit (clamp to valid range)
      const safeIndex = Math.min(currentSlideIndex, slides.length - 1);
      emblaApi.scrollTo(safeIndex, true); // instant scroll to maintain position
      setCurrentSlideIndex(safeIndex);
    }
  }, [emblaApi, slides.length, currentSlideIndex]);

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

  const onDocumentLoadSuccess = (
    { numPages }: { numPages: number },
    path: string
  ) => {
    // Notify the parent hook so it can expand slides
    if (onPdfPageCountDiscovered) {
      onPdfPageCountDiscovered(path, numPages);
    }
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

            {isFullscreen &&
              currentSlide &&
              (currentSlide.notes || currentSlide.sectionOrder?.length) && (
                <NotesBar
                  notes={currentSlide.notes}
                  songTitle={currentSlide.songTitle || ""}
                  sectionOrder={currentSlide.sectionOrder}
                />
              )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
