import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileWithUrl } from "@/components/files/file-carousel";
import { Document, Page } from "react-pdf";
import { Music2Icon, XIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";

interface FullscreenFileViewerProps {
  files: FileWithUrl[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIndex?: number;
}

export function FullscreenFileViewer({
  files,
  open,
  onOpenChange,
  initialIndex = 0,
}: FullscreenFileViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(initialIndex);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    startIndex: initialIndex,
  });
  const [numPages, setNumPages] = useState<Record<string, number>>({});
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  
  // Request fullscreen when dialog opens
  useEffect(() => {
    if (open) {
      // Use setTimeout to ensure the dialog is fully rendered
      setTimeout(() => {
        if (
          dialogContentRef.current &&
          dialogContentRef.current.requestFullscreen
        ) {
          dialogContentRef.current.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
          });
        }
      }, 100);
    }
  }, [open]);
  
  // Process files to handle multi-page PDFs - expand them into multiple slides
  const processedFiles = useMemo(() => {
    const processed: FileWithUrl[] = [];
    
    files.forEach(file => {
      if (file.type === 'pdf' && numPages[file.path] && numPages[file.path] > 1) {
        // For multi-page PDFs, create a slide for each page
        for (let i = 1; i <= numPages[file.path]; i++) {
          processed.push({
            ...file,
            key: `${file.key}-page-${i}`,
            pageNumber: i,
            name: `${file.name} - Page ${i} of ${numPages[file.path]}`
          });
        }
      } else {
        // For single-page PDFs or other file types
        processed.push(file);
      }
    });
    
    return processed;
  }, [files, numPages]);

  // Scroll to specific index when the initialIndex changes
  useEffect(() => {
    if (emblaApi && initialIndex !== undefined && files.length > 0) {
      emblaApi.scrollTo(initialIndex);
    }
  }, [emblaApi, initialIndex, files.length]);

  // Update dimensions when the container resizes or fullscreen changes
  useEffect(() => {
    const updateDimensions = () => {
      const container = carouselContainerRef.current;
      if (container) {
        setContainerDimensions({
          width: container.clientWidth - 48, // Subtract padding
          height: container.clientHeight - 180, // Subtract header and padding
        });
      }
    };

    // Initial update
    updateDimensions();
    
    // Set up a more robust update mechanism with multiple triggers
    window.addEventListener("resize", updateDimensions);
    
    // Update dimensions when fullscreen changes
    document.addEventListener("fullscreenchange", updateDimensions);
    
    // Use MutationObserver to detect DOM changes that might affect dimensions
    const observer = new MutationObserver(updateDimensions);
    if (carouselContainerRef.current) {
      observer.observe(carouselContainerRef.current, { 
        attributes: true, 
        childList: true, 
        subtree: true 
      });
    }
    
    // Also use a timeout to ensure dimensions are updated after rendering
    const timeoutId = setTimeout(updateDimensions, 300);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      document.removeEventListener("fullscreenchange", updateDimensions);
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [open, isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Close dialog when exiting fullscreen
      if (!document.fullscreenElement && open) {
        onOpenChange(false);
      }
    };
    
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [open, onOpenChange]);

  // Scroll to previous slide
  const scrollPrev = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollPrev();
      const newIndex = emblaApi.selectedScrollSnap();
      setCurrentSlideIndex(newIndex);
    }
  }, [emblaApi]);

  // Scroll to next slide
  const scrollNext = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollNext();
      const newIndex = emblaApi.selectedScrollSnap();
      setCurrentSlideIndex(newIndex);
    }
  }, [emblaApi]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        scrollPrev();
      } else if (e.key === "ArrowRight") {
        scrollNext();
      } else if (e.key === "Escape" && isFullscreen) {
        document.exitFullscreen();
      }
    };
    
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, scrollPrev, scrollNext, isFullscreen]);

  // Update current slide on embla events
  useEffect(() => {
    if (emblaApi) {
      emblaApi.on("select", () => {
        setCurrentSlideIndex(emblaApi.selectedScrollSnap());
      });
    }
  }, [emblaApi]);

  // Handler for PDF document load success
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }, path: string) => {
    setNumPages((prev) => ({ ...prev, [path]: numPages }));
  };

  // Listen for fullscreen changes and close dialog when exiting fullscreen
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Close dialog when exiting fullscreen
      if (!document.fullscreenElement) {
        onOpenChange(false);
      }
    };
    
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [onOpenChange]);
  
  // When the component opens, auto-enter fullscreen
  useEffect(() => {
    if (open && dialogContentRef.current) {
      // Use setTimeout with 0ms delay just like in the setlist page
      setTimeout(() => {
        if (
          dialogContentRef.current &&
          dialogContentRef.current.requestFullscreen
        ) {
          dialogContentRef.current.requestFullscreen();
        }
      }, 0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogContentRef}
        className={
          isFullscreen
            ? "fixed inset-0 z-50 bg-background m-0 w-screen h-dvh max-w-none rounded-none flex flex-col"
            : "max-w-6xl w-[95vw] sm:w-full overflow-y-auto max-h-[90vh]"
        }
        style={isFullscreen ? { padding: 0, margin: 0 } : {}}
      >
        {/* Wrap content in relative container for proper positioning context */}
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
                {processedFiles.map((slide) => (
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
                              maxHeight: "calc(100vh - 109px)",
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

              {/* Navigation Controls */}
            {isFullscreen && (
              <>
                {/* Close button */}
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white/80 z-10"
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    }
                  }}
                >
                  <XIcon className="h-5 w-5 text-black" />
                </Button>

                {/* Prev/Next navigation buttons */}
                <div className="absolute inset-y-0 left-0 flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-white/30 backdrop-blur-sm hover:bg-white/50 ml-4"
                    onClick={scrollPrev}
                  >
                    <ChevronLeftIcon className="h-6 w-6" />
                  </Button>
                </div>

                <div className="absolute inset-y-0 right-0 flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-white/30 backdrop-blur-sm hover:bg-white/50 mr-4"
                    onClick={scrollNext}
                  >
                    <ChevronRightIcon className="h-6 w-6" />
                  </Button>
                </div>

                {/* File title/info overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 text-white">
                  {processedFiles[currentSlideIndex] && (
                    <div>
                      <h3 className="font-medium text-lg">
                        {processedFiles[currentSlideIndex].songTitle || processedFiles[currentSlideIndex].name}
                      </h3>
                      {processedFiles[currentSlideIndex].songArtist && (
                        <p className="text-sm opacity-80">
                          {processedFiles[currentSlideIndex].songArtist}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
