import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Setlist } from "@/types";
import { LucideIcon, ChevronRight, Plus } from "lucide-react";
import clsx from "clsx";

interface SetlistCardProps {
  title: string;
  icon: LucideIcon;
  setlists: Setlist[];
  showAttentionStyle?: boolean;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  showViewAll?: boolean;
  viewAllLink?: string;
  maxItems?: number;
}

function SetlistItem({
  setlist,
  showAttentionStyle = false,
}: {
  setlist: Setlist;
  showAttentionStyle?: boolean;
}) {
  const songCount = setlist.songs.length;
  const isIncomplete = songCount === 0 || songCount < 3;
  const needsAttention = showAttentionStyle || isIncomplete;

  return (
    <Link
      to={`/setlist/${setlist.id}`}
      className={clsx(
        "group relative flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5 transition-all duration-200",
        "hover:shadow-sm hover:-translate-y-0.5",
        needsAttention
          ? "border-red-500/20 bg-red-500/5 hover:border-red-500/30 hover:bg-red-500/10 dark:border-red-500/10 dark:bg-red-500/5 dark:hover:border-red-500/20 dark:hover:bg-red-500/10"
          : "border-border/50 bg-background/50 hover:border-border hover:bg-accent/50"
      )}
      aria-label={`Go to setlist ${setlist.name}`}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm leading-none truncate tracking-tight">
            {setlist.name}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 leading-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-3 h-3 opacity-60"
          >
            <path d="M5.75 0a.75.75 0 0 1 .75.75V3h3V.75a.75.75 0 0 1 1.5 0V3h1.5A1.75 1.75 0 0 1 14.25 4.75v9.5A1.75 1.75 0 0 1 12.5 16h-9a1.75 1.75 0 0 1-1.75-1.75v-9.5C1.75 3.784 2.534 3 3.5 3H5V.75A.75.75 0 0 1 5.75 0ZM3.5 4.5a.25.25 0 0 0-.25.25V8h9.5V4.75a.25.25 0 0 0-.25-.25h-9Zm9.75 5h-9.5v4.75c0 .138.112.25.25.25h9a.25.25 0 0 0 .25-.25V9.5Z" />
          </svg>
          <span className="font-medium">
            {format(new Date(setlist.date), "MMM d, yyyy")}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant={needsAttention ? "outline" : "secondary"}
          className={clsx(
            "text-[11px] font-semibold tracking-wide px-2 py-0.5",
            needsAttention
              ? "border-red-500/40 bg-red-500/10 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
              : "border-transparent"
          )}
        >
          {songCount === 0
            ? "EMPTY"
            : `${songCount} ${songCount === 1 ? "SONG" : "SONGS"}`}
        </Badge>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </div>
    </Link>
  );
}

export function SetlistCard({
  title,
  icon: Icon,
  setlists,
  showAttentionStyle = false,
  emptyMessage = "No setlists",
  emptyActionLabel,
  onEmptyAction,
  showViewAll = false,
  viewAllLink = "/setlists",
  maxItems,
}: SetlistCardProps) {
  const displayedSetlists = maxItems ? setlists.slice(0, maxItems) : setlists;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Icon
            className={clsx(
              "h-4 w-4 shrink-0",
              showAttentionStyle
                ? "text-red-500 dark:text-red-400"
                : "text-muted-foreground"
            )}
          />
          <CardTitle className="text-sm font-semibold tracking-tight">
            {title}
          </CardTitle>
        </div>
        {displayedSetlists.length > 0 && (
          <div className="text-xs font-medium text-muted-foreground/60 tabular-nums">
            {displayedSetlists.length}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3">
        {displayedSetlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted/50 p-3 mb-3">
              <Icon className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <div className="text-sm font-medium text-foreground/80 mb-3">
              {emptyMessage}
            </div>
            {emptyActionLabel && onEmptyAction && (
              <Button onClick={onEmptyAction} size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                {emptyActionLabel}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {displayedSetlists.map((setlist) => (
              <SetlistItem
                key={setlist.id}
                setlist={setlist}
                showAttentionStyle={showAttentionStyle}
              />
            ))}
            {showViewAll && setlists.length > displayedSetlists.length && (
              <Link
                to={viewAllLink}
                className="group flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors pt-2"
                aria-label="View all setlists"
              >
                <span>View All ({setlists.length})</span>
                <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
