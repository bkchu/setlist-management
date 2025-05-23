import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Setlist } from "@/types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface SetlistFormProps {
  setlist?: Setlist;
  onSubmit: (setlist: Partial<Setlist>) => void;
  onCancel: () => void;
}

export function SetlistForm({ setlist, onSubmit, onCancel }: SetlistFormProps) {
  const [name, setName] = useState(setlist?.name || "");
  const [date, setDate] = useState<Date | undefined>(
    setlist?.date ? new Date(setlist.date) : new Date()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Missing name",
        description: "Please provide a setlist name",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Missing date",
        description: "Please select a date for the setlist",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      onSubmit({
        name,
        date: date.toISOString(),
        songs: setlist?.songs || [],
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to save the setlist",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardHeader>
        <CardTitle>{setlist ? "Edit Setlist" : "Create New Setlist"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : setlist ? "Update" : "Create"}
          </Button>
        </CardFooter>
      </form>
  );
}