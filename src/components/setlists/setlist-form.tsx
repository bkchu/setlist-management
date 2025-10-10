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
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

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

  // Reset when opened or when the setlist changes
  useEffect(() => {
    if (!open) return;
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
      toast.success(setlist ? "Setlist updated" : "Setlist created");
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "Failed to save the setlist",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log("open", open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {setlist ? "Edit Setlist" : "Create New Setlist"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter setlist name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {date ? format(date, "PPP") : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 mt-2">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : setlist ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
