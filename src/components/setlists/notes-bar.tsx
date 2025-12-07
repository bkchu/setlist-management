import { cn } from "@/lib/utils";

interface NotesBarProps {
  notes?: string;
  songTitle: string;
  className?: string;
}

export function NotesBar({ notes, songTitle, className }: NotesBarProps) {
  if (!notes) return null;

  return (
    <div className={cn("absolute inset-x-0 bottom-0 z-50", className)}>
      <div className="mx-auto mb-4 max-w-2xl px-4">
        <div className="rounded-xl border border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md">
          <p className="mb-1 truncate text-xs text-white/70">{songTitle}</p>
          <p className="text-sm leading-relaxed text-white">{notes}</p>
        </div>
      </div>
    </div>
  );
}

