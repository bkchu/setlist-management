import { useState } from "react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { getKeyHistoryForSong } from "@/lib/utils";
import { Setlist } from "@/types";

export function SuggestedKeys({
  songId,
  setlists,
  selectedKey,
  onSelectKey,
}: {
  songId: string;
  setlists: Setlist[];
  selectedKey: string;
  onSelectKey: (key: string) => void;
}) {
  const [showFullHistory, setShowFullHistory] = useState(false);

  const condensed = setlists.map((s) => ({
    name: s.name,
    date: s.date,
    songs: s.songs.map((ss) => ({ songId: ss.songId, key: ss.key })),
  }));
  const history = getKeyHistoryForSong(songId, condensed);

  if (history.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No previous keys found.</p>
    );
  }

  const historyWithLatestDate = history
    .map((h) => ({ key: h.key, latest: h.usages[0].date }))
    .sort(
      (a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime()
    );
  const quick = historyWithLatestDate.slice(0, 3).map((h) => h.key);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {quick.map((k) => (
          <Button
            key={k}
            size="sm"
            variant={selectedKey === k ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={() => onSelectKey(k)}
          >
            {k}
          </Button>
        ))}
        {history.length > quick.length && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setShowFullHistory((v) => !v)}
          >
            {showFullHistory ? "Hide history" : "Show history"}
          </Button>
        )}
      </div>
      {showFullHistory && (
        <div className="flex flex-col gap-2">
          {history.map((item) => (
            <div
              key={item.key}
              onClick={() => onSelectKey(item.key)}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
                selectedKey === item.key
                  ? "bg-primary/10 border border-primary/20"
                  : "border border-transparent"
              }`}
            >
              <Button
                variant={selectedKey === item.key ? "default" : "outline"}
                size="sm"
                className="h-7 w-10 px-0 font-mono text-xs font-medium flex-shrink-0"
              >
                {item.key}
              </Button>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {item.usages[0].setlistName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.usages[0].date), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
