import React, { useState, useEffect, useCallback } from "react";
import { DraggableWindow } from "@/components/ui/draggable-window";
import { Textarea } from "@/components/ui/textarea";

interface NotesWindowProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  onSaveNotes?: () => Promise<void>;
  notesDirty?: boolean;
  songTitle: string;
  pageNumber?: number;
  totalPages?: number;
  containerRef: React.RefObject<HTMLDivElement>;
}

const NotesWindow = ({
  isOpen,
  onOpenChange,
  notes = "",
  onNotesChange,
  onSaveNotes,
  notesDirty = false,
  songTitle,
  pageNumber,
  totalPages,
  containerRef,
}: NotesWindowProps) => {
  const [localNotes, setLocalNotes] = useState<string>(notes);
  const [saving, setSaving] = useState(false);

  // Update local notes when notes prop changes or current song changes
  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  // Handle notes change
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setLocalNotes(newNotes);
    if (onNotesChange) {
      onNotesChange(newNotes);
    }
  };

  const handleSave = async () => {
    if (!onSaveNotes) return;
    setSaving(true);
    await onSaveNotes();
    setSaving(false);
  };

  // Calculate initial position based on container dimensions
  const windowWidth = 200;
  const windowHeight = 300;
  const calculateInitialPosition = useCallback((): { x: number; y: number } => {
    const container = containerRef.current;
    if (!container) return { x: 20, y: 20 };

    const rect = container.getBoundingClientRect();
    return {
      x: Math.max(20, (rect.width - windowWidth) / 2), // or your preferred X position
      y: Math.max(20, rect.height - windowHeight + 100), // 20px margin from bottom
    };
  }, [containerRef, windowWidth, windowHeight]);

  return (
    <DraggableWindow
      title={
        songTitle +
        (totalPages && totalPages > 1 && pageNumber !== undefined
          ? ` (Page ${pageNumber} of ${totalPages})`
          : "")
      }
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      position={calculateInitialPosition()}
      width={400}
      height={200}
      containerRef={containerRef}
      zIndex={10000} // Ensure it's above the carousel dialog
      className="shadow-xl"
      titleClassName="bg-primary/10"
      contentClassName="p-0"
    >
      <Textarea
        readOnly
        disabled
        value={localNotes}
        onChange={handleNotesChange}
        placeholder="No notes. Go back to the song to add notes."
        className="resize-none h-full border-0 focus-visible:ring-0 p-2 bg-transparent w-full"
      />
      {Boolean(notesDirty) && (
        <div className="absolute bottom-4 right-4 z-10">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-black text-white px-3 py-1.5 text-sm rounded shadow-lg hover:bg-black/90 disabled:opacity-60 font-medium"
          >
            {saving ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin h-3 w-3 mr-1.5"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                Saving...
              </span>
            ) : (
              "Save Notes"
            )}
          </button>
        </div>
      )}
    </DraggableWindow>
  );
};

export { NotesWindow };
