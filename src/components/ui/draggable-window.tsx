import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import Draggable from "react-draggable";

interface DraggableWindowProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  containerRef?: React.RefObject<HTMLElement>;
  zIndex?: number;
}

export function DraggableWindow({
  isOpen,
  onOpenChange,
  title,
  children,
  position,
  width = 350,
  height = 400,
  minWidth = 200,
  minHeight = 150,
  className,
  titleClassName,
  contentClassName,
  containerRef,
  zIndex = 9999,
}: DraggableWindowProps) {
  // State for window position and size
  const [windowPosition, setWindowPosition] = useState(
    position || { x: 20, y: 20 }
  );
  const [windowSize, setWindowSize] = useState({ width, height });
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const startResizePos = useRef<{ x: number; y: number } | null>(null);
  const startResizeSize = useRef<{ width: number; height: number } | null>(
    null
  );

  // Update position when prop changes
  useEffect(() => {
    if (isOpen) {
      setWindowPosition(position || { x: 20, y: 20 });
    }
  }, [isOpen, position]);

  // Handle window dragging
  const handleDrag = useCallback(
    (_e: unknown, data: { x: number; y: number }) => {
      setWindowPosition({ x: data.x, y: data.y });
    },
    []
  );

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    startResizePos.current = { x: e.clientX, y: e.clientY };
    startResizeSize.current = { ...windowSize };
  };

  // Handle resize move
  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (
        !isResizing ||
        !startResizePos.current ||
        !startResizeSize.current ||
        !resizeDirection
      ) {
        return;
      }

      const deltaX = e.clientX - startResizePos.current.x;
      const deltaY = e.clientY - startResizePos.current.y;
      const newSize = { ...windowSize };

      // Apply resize based on direction
      if (resizeDirection.includes("e")) {
        newSize.width = Math.max(
          minWidth,
          startResizeSize.current.width + deltaX
        );
      }
      if (resizeDirection.includes("s")) {
        newSize.height = Math.max(
          minHeight,
          startResizeSize.current.height + deltaY
        );
      }
      if (resizeDirection.includes("w")) {
        const widthChange = -deltaX;
        newSize.width = Math.max(
          minWidth,
          startResizeSize.current.width + widthChange
        );
        if (windowRef.current) {
          setWindowPosition({
            x: windowPosition.x - widthChange,
            y: windowPosition.y,
          });
        }
      }
      if (resizeDirection.includes("n")) {
        const heightChange = -deltaY;
        newSize.height = Math.max(
          minHeight,
          startResizeSize.current.height + heightChange
        );
        if (windowRef.current) {
          setWindowPosition({
            x: windowPosition.x,
            y: windowPosition.y - heightChange,
          });
        }
      }

      setWindowSize(newSize);
    },
    [isResizing, windowPosition, resizeDirection, windowSize]
  );

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeDirection(null);
    startResizePos.current = null;
    startResizeSize.current = null;
  }, []);

  // Add and remove resize event listeners
  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  if (!isOpen) return null;

  // Create a draggable window element
  const windowContent = (
    <Draggable
      handle=".draggable-handle"
      position={windowPosition}
      onDrag={handleDrag}
      onStart={() => setIsDragging(true)}
      onStop={() => setIsDragging(false)}
      bounds={containerRef ? undefined : "body"}
      nodeRef={windowRef}
    >
      <div
        ref={windowRef}
        className={cn(
          "absolute bg-card rounded-lg shadow-lg border overflow-hidden flex flex-col top-0",
          isResizing && "select-none",
          isDragging && "cursor-grabbing",
          className
        )}
        style={{
          width: `${windowSize.width}px`,
          height: `${windowSize.height}px`,
          zIndex: zIndex,
        }}
      >
            {/* Header with drag handle */}
            <div
              className={cn(
                "draggable-handle p-2 flex items-center justify-between border-b bg-muted/50 cursor-grab",
                isDragging && "cursor-grabbing",
                titleClassName
              )}
            >
              <div className="truncate">{title}</div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onOpenChange(false)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className={cn("flex-1 overflow-auto p-4", contentClassName)}>
              {children}
            </div>

            {/* Resize handles */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
              onMouseDown={(e) => handleResizeStart(e, "se")}
            />
            <div
              className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize"
              onMouseDown={(e) => handleResizeStart(e, "sw")}
            />
            <div
              className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize"
              onMouseDown={(e) => handleResizeStart(e, "ne")}
            />
            <div
              className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize"
              onMouseDown={(e) => handleResizeStart(e, "nw")}
            />

            <div
              className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize"
              onMouseDown={(e) => handleResizeStart(e, "s")}
            />
            <div
              className="absolute top-0 left-4 right-4 h-2 cursor-n-resize"
              onMouseDown={(e) => handleResizeStart(e, "n")}
            />
            <div
              className="absolute right-0 top-4 bottom-4 w-2 cursor-e-resize"
              onMouseDown={(e) => handleResizeStart(e, "e")}
            />
            <div
              className="absolute left-0 top-4 bottom-4 w-2 cursor-w-resize"
              onMouseDown={(e) => handleResizeStart(e, "w")}
            />
          </div>
    </Draggable>
  );

  // Use React Portal to render outside the dialog hierarchy
  return createPortal(
    windowContent,
    containerRef?.current || document.body
  );
}
