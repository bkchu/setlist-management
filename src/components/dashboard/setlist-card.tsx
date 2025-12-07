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
  showEmptyStyle?: boolean;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  showViewAll?: boolean;
  viewAllLink?: string;
  maxItems?: number;
}

function SetlistItem({
  setlist,
  showEmptyStyle = false,
}: {
  setlist: Setlist;
  showEmptyStyle?: boolean;
}) {
  const songCount = setlist.songs.length;
  const isEmpty = songCount === 0;

  return (
    <Link
      to={`/setlist/${setlist.id}`}
      className={clsx(
        "group relative flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5 transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/5 hover:shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)]",
        showEmptyStyle && isEmpty
          ? "border-border/50 bg-muted/5"
          : "border-transparent bg-transparent hover:border-white/10"
      )}
      aria-label={`Go to setlist ${setlist.name}`}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm leading-none truncate tracking-tight text-foreground group-hover:text-primary transition-colors">
            {setlist.name}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-muted-foreground/80 leading-none transition-colors">
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
      <div className="flex items-center gap-3 shrink-0">
        <Badge
          variant="secondary"
          className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase transition-colors bg-white/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        >
          {isEmpty
            ? "Empty"
            : `${songCount} ${songCount === 1 ? "Song" : "Songs"}`}
        </Badge>
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}

export function SetlistCard({
  title,
  icon: Icon,
  setlists,
  showEmptyStyle = false,
  emptyMessage = "No setlists",
  emptyActionLabel,
  onEmptyAction,
  showViewAll = false,
  viewAllLink = "/setlists",
  maxItems,
}: SetlistCardProps) {
  const displayedSetlists = maxItems ? setlists.slice(0, maxItems) : setlists;

  return (
    <Card className="overflow-hidden border-white/10 bg-card/50 shadow-glass backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-white/5 bg-white/5 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-background/50 text-primary shadow-sm backdrop-blur-sm">
            <Icon className="h-4 w-4" />
          </div>
          <CardTitle className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </CardTitle>
        </div>
        {displayedSetlists.length > 0 && (
          <div className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {displayedSetlists.length}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4">
        {displayedSetlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-full border border-white/10 bg-white/5 p-4 shadow-inner">
              <Icon className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="mb-4 text-sm font-medium text-muted-foreground">
              {emptyMessage}
            </p>
            {emptyActionLabel && onEmptyAction && (
              <Button 
                onClick={onEmptyAction} 
                size="sm" 
                className="gap-2 shadow-glow-sm transition-transform hover:scale-105"
              >
                <Plus className="h-3.5 w-3.5" />
                {emptyActionLabel}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {displayedSetlists.map((setlist) => (
              <SetlistItem
                key={setlist.id}
                setlist={setlist}
                showEmptyStyle={showEmptyStyle}
              />
            ))}
            {showViewAll && setlists.length > displayedSetlists.length && (
              <div className="pt-2 text-center">
                <Link
                  to={viewAllLink}
                  className="group inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                  aria-label="View all setlists"
                >
                  <span>View All ({setlists.length})</span>
                  <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
