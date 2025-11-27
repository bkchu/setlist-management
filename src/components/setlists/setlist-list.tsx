import { useMemo } from "react";
import { Setlist } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarIcon,
  ListMusicIcon,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { SetlistForm } from "./setlist-form";
import { format, isToday, isTomorrow, isYesterday, startOfDay } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { SetlistSearchCombobox } from "./setlist-search-combobox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SetlistListProps {
  setlists: Setlist[];
  onAddSetlist: (setlist: Partial<Setlist>) => void;
  onEditSetlist: (id: string, setlist: Partial<Setlist>) => void;
  onDeleteSetlist: (id: string) => void;
}

// Helper to format date with relative labels
function formatRelativeDate(dateStr: string): {
  label: string;
  isRelative: boolean;
} {
  const date = new Date(dateStr);
  if (isToday(date)) return { label: "Today", isRelative: true };
  if (isTomorrow(date)) return { label: "Tomorrow", isRelative: true };
  if (isYesterday(date)) return { label: "Yesterday", isRelative: true };
  return { label: format(date, "MMM d, yyyy"), isRelative: false };
}

// Check if setlist is upcoming (today or future)
function isUpcoming(dateStr: string): boolean {
  const date = startOfDay(new Date(dateStr));
  const today = startOfDay(new Date());
  return date >= today;
}

// Get song preview text (first 2-3 song titles)
function getSongPreview(setlist: Setlist, maxSongs = 3): string {
  if (setlist.songs.length === 0) return "No songs yet";
  const titles = setlist.songs
    .slice(0, maxSongs)
    .map((s) => s.song?.title || s.title || "Untitled");
  const remaining = setlist.songs.length - maxSongs;
  if (remaining > 0) {
    return `${titles.join(", ")}, +${remaining} more`;
  }
  return titles.join(", ");
}

export function SetlistList({
  setlists,
  onAddSetlist,
  onEditSetlist,
  onDeleteSetlist,
}: SetlistListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);

  // Sort setlists by date ascending (upcoming first)
  const sortedSetlists = useMemo(() => {
    return [...setlists].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  }, [setlists]);

  const handleAddSubmit = async (setlistData: Partial<Setlist>) => {
    await Promise.resolve(onAddSetlist(setlistData));
    setIsFormOpen(false);
    setEditingSetlist(null);
  };

  const handleEditSubmit = async (setlistData: Partial<Setlist>) => {
    if (editingSetlist) {
      await Promise.resolve(onEditSetlist(editingSetlist.id, setlistData));
      setIsFormOpen(false);
      setEditingSetlist(null);
    }
  };

  const handleOpenAddForm = () => {
    setEditingSetlist(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (setlist: Setlist) => {
    // Defer opening so the dropdown can fully close/unmount first
    setEditingSetlist(setlist);
    setTimeout(() => setIsFormOpen(true), 0);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingSetlist(null);
  };

  const renderActionButtons = (setlist: Setlist) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => handleOpenEditForm(setlist)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => onDeleteSetlist(setlist.id)}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-lg font-semibold">Setlists</h2>
        <div className="flex items-center gap-2">
          <SetlistSearchCombobox setlists={setlists} />
          <Button size="sm" onClick={handleOpenAddForm}>
            <Plus className="mr-2 h-4 w-4" />
            Add Setlist
          </Button>
        </div>
      </div>

      {sortedSetlists.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <ListMusicIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium">No setlists found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first setlist to get started
          </p>
        </div>
      ) : (
        <AnimatePresence>
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {sortedSetlists.map((setlist) => {
              const upcoming = isUpcoming(setlist.date);
              const { label: dateLabel, isRelative } = formatRelativeDate(
                setlist.date
              );

              return (
                <motion.div
                  key={setlist.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "relative rounded-lg border bg-card p-4 pr-12",
                    upcoming
                      ? "border-l-4 border-l-primary"
                      : "border-l-4 border-l-muted opacity-75"
                  )}
                >
                  {/* Action button - absolute positioned */}
                  <div className="absolute top-2 right-2">
                    {renderActionButtons(setlist)}
                  </div>

                  {/* Title and song preview - tightly grouped */}
                  <div className="space-y-0.5">
                    <Link
                      to={`/setlist/${setlist.id}`}
                      className="block font-medium hover:underline line-clamp-1"
                    >
                      {setlist.name}
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {getSongPreview(setlist)}
                    </p>
                  </div>

                  {/* Date and badges */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3" />
                      <span
                        className={cn(
                          isRelative && upcoming && "text-primary font-medium"
                        )}
                      >
                        {dateLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {upcoming && (
                        <Badge
                          variant="secondary"
                          className="text-[11px] font-semibold tracking-wide px-2 py-0.5 border-transparent uppercase"
                        >
                          Upcoming
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className="text-[11px] font-semibold tracking-wide px-2 py-0.5 border-transparent uppercase"
                      >
                        {setlist.songs.length}{" "}
                        {setlist.songs.length === 1 ? "song" : "songs"}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Songs</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSetlists.map((setlist) => {
                  const upcoming = isUpcoming(setlist.date);
                  const { label: dateLabel, isRelative } = formatRelativeDate(
                    setlist.date
                  );

                  return (
                    <motion.tr
                      key={setlist.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "group hover:bg-muted/50",
                        !upcoming && "opacity-60"
                      )}
                    >
                      <TableCell>
                        <Link
                          to={`/setlist/${setlist.id}`}
                          className="block font-medium hover:underline"
                        >
                          {setlist.name}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {getSongPreview(setlist)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span
                            className={cn(
                              isRelative &&
                                upcoming &&
                                "text-primary font-medium"
                            )}
                          >
                            {dateLabel}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {upcoming && (
                            <Badge
                              variant="secondary"
                              className="text-[11px] font-semibold tracking-wide px-2 py-0.5 border-transparent uppercase"
                            >
                              Upcoming
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className="text-[11px] font-semibold tracking-wide px-2 py-0.5 border-transparent uppercase"
                          >
                            {setlist.songs.length}{" "}
                            {setlist.songs.length === 1 ? "song" : "songs"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{renderActionButtons(setlist)}</TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </AnimatePresence>
      )}

      {/* Single dialog for both add and edit */}
      <SetlistForm
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseForm();
        }}
        setlist={editingSetlist ?? undefined}
        onSubmit={editingSetlist ? handleEditSubmit : handleAddSubmit}
      />
    </div>
  );
}
