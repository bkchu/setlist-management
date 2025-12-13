import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRightIcon, HistoryIcon } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface KeyHistoryEntry {
  id: string;
  key: string;
  setlistId: string;
  playedAt: string;
  setlistName: string;
}

interface SongKeyHistoryProps {
  keyHistory: KeyHistoryEntry[];
}

export function SongKeyHistory({ keyHistory }: SongKeyHistoryProps) {
  if (!keyHistory || keyHistory.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <HistoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Key History
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {keyHistory.map((entry) => (
          <HoverCard key={entry.id} openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <Link
                to={`/setlist/${entry.setlistId}`}
                className="group inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs transition-colors hover:bg-primary/10"
              >
                <span className="font-semibold text-primary">{entry.key}</span>
                <span className="text-muted-foreground group-hover:text-foreground">
                  {format(new Date(entry.playedAt), "MMM d")}
                </span>
              </Link>
            </HoverCardTrigger>
            <HoverCardContent
              side="top"
              className="w-56 border-white/10 bg-popover shadow-lg"
            >
              <p className="font-medium text-foreground text-sm line-clamp-1">
                {entry.setlistName}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(entry.playedAt), "EEEE, MMM d, yyyy")}
              </p>
              <p className="text-xs text-primary mt-2 flex items-center gap-1">
                View setlist <ArrowRightIcon className="h-3 w-3" />
              </p>
            </HoverCardContent>
          </HoverCard>
        ))}
      </div>
    </div>
  );
}
