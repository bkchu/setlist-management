import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Document, Page } from "react-pdf";
import useEmblaCarousel from "embla-carousel-react";
import { Music2Icon } from "lucide-react";

export interface FileWithUrl {
  id: string;
  key: string;
  name: string;
  path: string;
  type: string;
  url: string;
  song_id?: string;
  songTitle?: string;
  songArtist?: string;
  pageNumber?: number;
  keyInfo?: string; // Add key information for display
}

interface FileCarouselProps {
  files: FileWithUrl[];
  isFullscreen?: boolean;
  onSlideChange?: (index: number) => void;
  initialIndex?: number;
}

export function FileCarousel({
  files,
  isFullscreen = false,
  onSlideChange,
  initialIndex = 0,
}: FileCarouselProps) {
  // This state is used in the keyboard navigation and emblaApi event handlers
  const [currentSlideIndex, setCurrentSlideIndex] = useState(initialIndex);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    startIndex: initialIndex,
  });
  // Track PDF page counts to handle multi-page PDFs
  const [numPages, setNumPages] = useState<Record<string, number>>({});
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Process files to handle multi-page PDFs - expand them into multiple slides
  const processedFiles = useMemo(() => {
    const processed: FileWithUrl[] = [];

    files.forEach((file) => {
      if (
        file.type === "pdf" &&
        numPages[file.path] &&
        numPages[file.path] > 1
      ) {
        // For multi-page PDFs, create a slide for each page
        for (let i = 1; i <= numPages[file.path]; i++) {
          processed.push({
            ...file,
            key: `${file.key}-page-${i}`,
            pageNumber: i,
            name: `${file.name} - Page ${i} of ${numPages[file.path]}`,
          });
        }
      } else {
        // For single-page PDFs or other file types
        processed.push(file);
      }
    });

    return processed;
  }, [files, numPages]);

  // Update dimensions when the container resizes
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

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // PDF document load handler - numPages is used for multi-page PDFs
  const onDocumentLoadSuccess = (
    { numPages }: { numPages: number },
    path: string
  ) => {
    // Store number of pages to handle multi-page PDFs if needed
    setNumPages((prev) => ({ ...prev, [path]: numPages }));

    // Log page info for debugging
    console.log(`PDF ${path} has ${numPages} pages`);
  };

  // Navigation functions
  const scrollPrev = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollPrev();
      const newIndex = emblaApi.selectedScrollSnap();
      setCurrentSlideIndex(newIndex);
      if (onSlideChange) onSlideChange(newIndex);
    }
  }, [emblaApi, onSlideChange]);

  const scrollNext = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollNext();
      const newIndex = emblaApi.selectedScrollSnap();
      setCurrentSlideIndex(newIndex);
      if (onSlideChange) onSlideChange(newIndex);
    }
  }, [emblaApi, onSlideChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        scrollPrev();
      } else if (e.key === "ArrowRight") {
        scrollNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scrollPrev, scrollNext]);

  // Update current slide on embla events
  useEffect(() => {
    if (emblaApi) {
      const onSelect = () => {
        const newIndex = emblaApi.selectedScrollSnap();
        setCurrentSlideIndex(newIndex);
        if (onSlideChange) onSlideChange(newIndex);
      };

      emblaApi.on("select", onSelect);

      // Initialize with current slide if not at initialIndex
      if (emblaApi.selectedScrollSnap() !== initialIndex) {
        emblaApi.scrollTo(initialIndex);
      }

      // Display the current slide index for debugging
      console.log(`Current slide index: ${currentSlideIndex}`);

      return () => {
        emblaApi.off("select", onSelect);
      };
    }
  }, [emblaApi, initialIndex, onSlideChange, currentSlideIndex]);

  // Scroll to a specific index when initialIndex changes
  useEffect(() => {
    if (emblaApi && initialIndex !== undefined) {
      emblaApi.scrollTo(initialIndex);
    }
  }, [emblaApi, initialIndex]);

  return (
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
          {processedFiles.map((file) => (
            <div
              key={file.key}
              className="relative min-w-full flex-[0_0_100%] h-full"
            >
              <div className="space-y-4 flex flex-col h-full">
                <div className="flex flex-1 justify-center overflow-y-auto bg-muted/20 rounded-lg">
                  {file.type === "image" && file.url && (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="h-auto max-w-full rounded-lg object-contain"
                      style={{
                        maxHeight: "calc(100vh - 64px)",
                        maxWidth: "100%",
                      }}
                    />
                  )}
                  {file.type === "pdf" && file.url && (
                    <Document
                      file={file.url}
                      onLoadSuccess={(pdf) =>
                        onDocumentLoadSuccess(pdf, file.path)
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
                        pageNumber={file.pageNumber || 1}
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
    </div>
  );
}
