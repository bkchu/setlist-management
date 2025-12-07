import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Setlist } from "@/types";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, ListMusicIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface SetlistFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setlist?: Setlist;
  onSubmit: (setlist: Partial<Setlist>) => Promise<void> | void;
}

export function SetlistForm({
  open,
  onOpenChange,
  setlist,
  onSubmit,
}: SetlistFormProps) {
  const initialize = useCallback(() => {
    return {
      name: setlist?.name || "",
      date: setlist?.date ? new Date(setlist.date) : new Date(),
    };
  }, [setlist]);

  const [name, setName] = useState(initialize().name);
  const [date, setDate] = useState<Date | undefined>(initialize().date);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Reset when opened or when the setlist changes
  useEffect(() => {
    if (!open) {
      setIsCalendarOpen(false);
      return;
    }
    const init = initialize();
    setName(init.name);
    setDate(init.date);
  }, [open, initialize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Missing name", {
        description: "Please provide a setlist name",
      });
      return;
    }

    if (!date) {
      toast.error("Missing date", {
        description: "Please select a date for the setlist",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await Promise.resolve(
        onSubmit({
          name,
          date: date.toISOString(),
          songs: setlist?.songs || [],
        })
      );
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "Failed to save the setlist",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // If the calendar popover is open, close it first to allow Radix to
      // properly restore aria-hidden/pointer-events, then close the dialog.
      if (isCalendarOpen) {
        setIsCalendarOpen(false);
        setTimeout(() => onOpenChange(false), 0);
        return;
      }
    }
    onOpenChange(newOpen);
  };

  const isEditing = Boolean(setlist);
  const isMobile = useIsMobile();

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md overflow-hidden p-0">
        {/* Decorative header gradient */}
        <div className="absolute inset-x-0 top-0 h-24 sm:h-32 bg-gradient-to-b from-primary/8 via-primary/4 to-transparent pointer-events-none" />
        <div className="absolute top-4 sm:top-6 right-12 sm:right-16 w-16 sm:w-20 h-16 sm:h-20 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative px-4 sm:px-6 pt-5 sm:pt-6 pb-2">
          <DialogHeader className="space-y-3">
            {/* Icon badge - stacks on mobile, inline on desktop */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/20">
                {isEditing ? (
                  <ListMusicIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                ) : (
                  <SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                )}
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <DialogTitle className="text-lg sm:text-xl font-semibold tracking-tight">
                  {isEditing ? "Edit Setlist" : "New Setlist"}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  {isEditing 
                    ? "Update your setlist details" 
                    : "Create a setlist for your next event"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="relative px-4 sm:px-6 pb-5 sm:pb-6 space-y-4 sm:space-y-5">
          {/* Name field */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label 
              htmlFor="name" 
              className="text-xs sm:text-sm font-medium text-foreground/90"
            >
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sunday Morning Set"
              className="h-10 sm:h-11"
              required
            />
          </div>

          {/* Date field */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label 
              htmlFor="date"
              className="text-xs sm:text-sm font-medium text-foreground/90"
            >
              Date
            </Label>
            <Popover
              open={isCalendarOpen}
              onOpenChange={setIsCalendarOpen}
              modal={true}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  id="date"
                  className={cn(
                    "flex h-10 sm:h-11 w-full items-center gap-2 sm:gap-3 rounded-lg border border-white/10 bg-card px-3 text-sm text-[#f8faf8] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] transition-colors",
                    "hover:border-white/20",
                    "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
                    !date && "text-muted-foreground/60"
                  )}
                >
                  <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className={cn("truncate", date && "text-foreground")}>
                    {date 
                      ? format(date, isMobile ? "EEE, MMM d, yyyy" : "EEEE, MMMM d, yyyy") 
                      : "Pick a date"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0" 
                align={isMobile ? "center" : "start"}
                side={isMobile ? "bottom" : "bottom"}
              >
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    setDate(newDate);
                    setIsCalendarOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2">
            <DialogClose asChild>
              <Button 
                type="button" 
                variant="ghost" 
                disabled={isSubmitting}
                className="h-10 sm:h-9"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              size="default"
              className="h-10 sm:h-9"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Setlist"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
