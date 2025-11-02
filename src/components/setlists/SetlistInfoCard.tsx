import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DataList,
  DataListItem,
  DataListLabel,
  DataListValue,
} from "@/components/ui/data-list";
import { Setlist } from "@/types";
import { format } from "date-fns";
import { Edit as EditIcon } from "lucide-react";
import React from "react";

interface SetlistInfoCardProps {
  setlist: Setlist;
  onEdit: () => void;
}

export const SetlistInfoCard = React.memo(function SetlistInfoCard({
  setlist,
  onEdit,
}: SetlistInfoCardProps) {
  return (
    <Card className="border-border/50 bg-muted/30">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{setlist?.name}</div>
              {setlist?.date && (
                <div className="text-xs text-muted-foreground/80 mt-0.5">
                  {format(new Date(setlist.date), "MMM d, yyyy")}
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground/60 shrink-0">
              {setlist?.songs.length || 0} {setlist?.songs.length === 1 ? "song" : "songs"}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 px-2 shrink-0"
          >
            <EditIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
