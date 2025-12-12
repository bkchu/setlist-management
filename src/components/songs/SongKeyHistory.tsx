import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRightIcon, CalendarIcon, HistoryIcon } from "lucide-react";
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
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <HistoryIcon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">Key History</h3>
        <span className="text-xs text-muted-foreground">
          ({keyHistory.length})
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {keyHistory.map((entry) => (
          <HoverCard key={entry.id} openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <Link
                to={`/setlist/${entry.setlistId}`}
                className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3 transition-all hover:border-primary/30 hover:bg-primary/10"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {entry.key}
                </span>
                <span className="text-xs text-muted-foreground group-hover:text-foreground">
                  {format(new Date(entry.playedAt), "MMM d")}
                </span>
              </Link>
            </HoverCardTrigger>
            <HoverCardContent
              side="top"
              className="w-64 border-white/10 bg-card/95 backdrop-blur-xl"
            >
              <div className="space-y-2">
                <p className="font-medium text-foreground line-clamp-1">
                  {entry.setlistName}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3 w-3" />
                  {format(new Date(entry.playedAt), "EEEE, MMMM d, yyyy")}
                </div>
                <div className="flex items-center gap-1 pt-1 text-xs text-primary">
                  <span>View setlist</span>
                  <ArrowRightIcon className="h-3 w-3" />
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        ))}
      </div>
    </div>
  );
}


