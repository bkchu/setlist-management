import { useMemo, useState } from "react";
import { Setlist } from "@/types";
import { Button } from "@/components/ui/button";
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
import { SetlistForm } from "./setlist-form";
import { format, isToday, isTomorrow, isYesterday, startOfDay } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { SetlistSearchCombobox } from "./setlist-search-combobox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

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
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={() => handleOpenEditForm(setlist)}>
          Edit Details
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
          onSelect={() => onDeleteSetlist(setlist.id)}
        >
          Delete Setlist
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      {/* Enhanced Toolbar: Single row on mobile/desktop */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <SetlistSearchCombobox setlists={setlists} />
        </div>

        {/* Desktop: Full Button */}
        <Button
          onClick={handleOpenAddForm}
          className="hidden sm:flex shadow-glow-sm gap-2"
        >
          <Plus className="h-4 w-4" />
          New Setlist
        </Button>

        {/* Mobile: Icon Button */}
        <Button
          onClick={handleOpenAddForm}
          size="icon"
          className="sm:hidden shadow-glow-sm shrink-0 h-10 w-10 rounded-lg"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {sortedSetlists.length === 0 ? (
        <Card className="border-dashed border-white/10 bg-white/5">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-white/5 p-4">
              <ListMusicIcon className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground">
              No setlists yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Create your first setlist to start organizing your worship
              service.
            </p>
            <Button
              onClick={handleOpenAddForm}
              variant="outline"
              className="mt-6"
            >
              Create Setlist
            </Button>
          </div>
        </Card>
      ) : (
        <AnimatePresence>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedSetlists.map((setlist) => {
              const upcoming = isUpcoming(setlist.date);
              const { label: dateLabel, isRelative } = formatRelativeDate(
                setlist.date
              );

              return (
                <motion.div
                  key={setlist.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border border-white/10 bg-card/50 p-4 shadow-sm backdrop-blur-md transition-all",
                    upcoming && "shadow-glow-sm border-primary/20"
                  )}
                >
                  <Link to={`/setlist/${setlist.id}`} className="block h-full">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg leading-tight text-foreground">
                          {setlist.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarIcon className="h-3.5 w-3.5" />
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
                      </div>

                      {upcoming && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 pointer-events-none">
                          Upcoming
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
                        {getSongPreview(setlist)}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <Badge
                          variant="secondary"
                          className="text-xs font-medium"
                        >
                          {setlist.songs.length}{" "}
                          {setlist.songs.length === 1 ? "song" : "songs"}
                        </Badge>
                        <div onClick={(e) => e.preventDefault()}>
                          {renderActionButtons(setlist)}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
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
