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
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold">Information</h2>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <EditIcon className="mr-2 h-3 w-3" />
            Edit
          </Button>
        </div>
        <DataList orientation="vertical" className="gap-4" size="sm">
          <DataListItem>
            <DataListLabel className="font-bold text-xs tracking-wide uppercase w-32">
              Name
            </DataListLabel>
            <DataListValue className="font-medium  max-w-[200px] truncate">
              {setlist?.name}
            </DataListValue>
          </DataListItem>

          <DataListItem>
            <DataListLabel className="font-bold text-xs tracking-wide uppercase w-32">
              Date
            </DataListLabel>
            <DataListValue>
              {setlist?.date
                ? format(new Date(setlist.date), "MMMM d, yyyy")
                : "Not scheduled"}
            </DataListValue>
          </DataListItem>

          <DataListItem>
            <DataListLabel className="font-bold text-xs tracking-wide uppercase w-32">
              Songs
            </DataListLabel>
            <DataListValue>{setlist?.songs.length || 0}</DataListValue>
          </DataListItem>

          <DataListItem>
            <DataListLabel className="font-bold text-xs tracking-wide uppercase w-32">
              Created
            </DataListLabel>
            <DataListValue>
              {setlist?.createdAt
                ? format(new Date(setlist.createdAt), "MMM d, yyyy")
                : ""}
            </DataListValue>
          </DataListItem>

          <DataListItem>
            <DataListLabel className="font-bold text-xs tracking-wide uppercase w-32">
              Last updated
            </DataListLabel>
            <DataListValue>
              {setlist?.updatedAt
                ? format(new Date(setlist.updatedAt), "MMM d, yyyy")
                : ""}
            </DataListValue>
          </DataListItem>
        </DataList>
      </CardContent>
    </Card>
  );
});
