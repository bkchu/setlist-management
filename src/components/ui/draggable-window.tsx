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
  const handleResizeStart = (
    e: React.MouseEvent | React.TouchEvent,
    direction: string,
    isTouch = false
  ) => {
    e.preventDefault();
    let startX: number, startY: number;
    if (isTouch && "touches" in e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      startX = e.clientX;
      startY = e.clientY;
    } else {
      return;
    }
    setIsResizing(true);
    setResizeDirection(direction);
    startResizePos.current = { x: startX, y: startY };
    startResizeSize.current = { ...windowSize };

    const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
      let clientX: number, clientY: number;
      if ("touches" in moveEvent && moveEvent.touches.length > 0) {
        clientX = moveEvent.touches[0].clientX;
        clientY = moveEvent.touches[0].clientY;
      } else if ("clientX" in moveEvent) {
        clientX = (moveEvent as MouseEvent).clientX;
        clientY = (moveEvent as MouseEvent).clientY;
      } else {
        return;
      }
      const dx = clientX - (startResizePos?.current?.x || 0);
      const dy = clientY - (startResizePos?.current?.y || 0);
      let newWidth = startResizeSize?.current?.width || windowSize.width;
      let newHeight = startResizeSize?.current?.height || windowSize.height;
      let newX = windowPosition.x;
      let newY = windowPosition.y;

      switch (direction) {
        case "se":
          newWidth += dx;
          newHeight += dy;
          break;
        case "sw":
          newWidth -= dx;
          newHeight += dy;
          newX += dx;
          break;
        case "ne":
          newWidth += dx;
          newHeight -= dy;
          newY += dy;
          break;
        case "nw":
          newWidth -= dx;
          newHeight -= dy;
          newX += dx;
          newY += dy;
          break;
        case "s":
          newHeight += dy;
          break;
        case "n":
          newHeight -= dy;
          newY += dy;
          break;
        case "e":
          newWidth += dx;
          break;
        case "w":
          newWidth -= dx;
          newX += dx;
          break;
      }
      // Clamp to min/max size if desired
      setWindowSize({
        width: Math.max(minWidth, newWidth),
        height: Math.max(minHeight, newHeight),
      });
      setWindowPosition({ x: newX, y: newY });
    };

    const upHandler = () => {
      if (isTouch) {
        document.removeEventListener("touchmove", moveHandler);
        document.removeEventListener("touchend", upHandler);
      } else {
        document.removeEventListener("mousemove", moveHandler);
        document.removeEventListener("mouseup", upHandler);
      }
      setIsResizing(false);
    };

    if (isTouch) {
      document.addEventListener("touchmove", moveHandler, { passive: false });
      document.addEventListener("touchend", upHandler);
    } else {
      document.addEventListener("mousemove", moveHandler);
      document.addEventListener("mouseup", upHandler);
    }
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

  // Use React Portal to render outside the dialog hierarchy
  return createPortal(
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
            "draggable-handle p-2 h-12 flex items-center justify-between border-b bg-muted/50 cursor-grab",
            isDragging && "cursor-grabbing",
            titleClassName
          )}
        >
          <div className="truncate text-xs">{title}</div>
        </div>

        {/* Content */}
        <div className={cn("flex-1 overflow-auto p-4", contentClassName)}>
          {children}
        </div>

        {/* Resize handles */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={(e) => handleResizeStart(e, "se", false)}
          onTouchStart={(e) => handleResizeStart(e, "se", true)}
        />
        <div
          className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize"
          onMouseDown={(e) => handleResizeStart(e, "sw", false)}
          onTouchStart={(e) => handleResizeStart(e, "sw", true)}
        />
        <div
          className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize"
          onMouseDown={(e) => handleResizeStart(e, "ne", false)}
          onTouchStart={(e) => handleResizeStart(e, "ne", true)}
        />
        <div
          className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize"
          onMouseDown={(e) => handleResizeStart(e, "nw", false)}
          onTouchStart={(e) => handleResizeStart(e, "nw", true)}
        />

        <div
          className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize"
          onMouseDown={(e) => handleResizeStart(e, "s", false)}
          onTouchStart={(e) => handleResizeStart(e, "s", true)}
        />
        <div
          className="absolute top-0 left-4 right-4 h-2 cursor-n-resize"
          onMouseDown={(e) => handleResizeStart(e, "n", false)}
          onTouchStart={(e) => handleResizeStart(e, "n", true)}
        />
        <div
          className="absolute right-0 top-4 bottom-4 w-2 cursor-e-resize"
          onMouseDown={(e) => handleResizeStart(e, "e", false)}
          onTouchStart={(e) => handleResizeStart(e, "e", true)}
        />
        <div
          className="absolute left-0 top-4 bottom-4 w-2 cursor-w-resize"
          onMouseDown={(e) => handleResizeStart(e, "w", false)}
          onTouchStart={(e) => handleResizeStart(e, "w", true)}
        />
      </div>
    </Draggable>,
    containerRef?.current || document.body
  );
}
