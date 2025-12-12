import { cn } from "@/lib/utils";
import { SectionOrderDisplay } from "@/components/songs/section-order-display";
import { SectionOrder } from "@/types";

interface NotesBarProps {
  notes?: string;
  songTitle: string;
  className?: string;
  sectionOrder?: SectionOrder;
}

export function NotesBar({
  notes,
  songTitle,
  className,
  sectionOrder,
}: NotesBarProps) {
  const hasOrder = sectionOrder && sectionOrder.length > 0;
  const hasNotes = Boolean(notes);

  if (!hasOrder && !hasNotes) return null;

  return (
    <div className={cn("absolute inset-x-0 bottom-0 z-50", className)}>
      <div className="mx-auto mb-4 max-w-2xl px-4">
        <div className="rounded-xl border border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md">
          <p className="mb-1 truncate text-xs text-white/70">{songTitle}</p>
          {hasOrder && (
            <SectionOrderDisplay
              order={sectionOrder}
              className="mb-1 text-[11px] text-white"
              aria-label="Section order"
            />
          )}
          {hasNotes && (
            <p className="text-sm leading-relaxed text-white whitespace-pre-wrap">
              {notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
