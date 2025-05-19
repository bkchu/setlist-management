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
    <Card className="w-full max-w-lg shadow-xl border-none bg-zinc-900 rounded-2xl p-0">
      <form onSubmit={handleSubmit} className="flex flex-col gap-0">
        <CardHeader className="pb-0 pt-8 px-8">
          <CardTitle className="text-2xl font-bold text-white mb-2">{setlist ? "Edit Setlist" : "Create New Setlist"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-8 pt-6 pb-2">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-base font-medium text-zinc-100">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter setlist name"
              required
              className="h-12 rounded-lg px-4 bg-zinc-800 border-zinc-700 text-lg text-zinc-100 focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date" className="text-base font-medium text-zinc-100">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 rounded-lg px-4 justify-start text-left font-normal bg-zinc-800 border-zinc-700 text-lg text-zinc-100",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {date ? format(date, "PPP") : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 mt-2 rounded-xl shadow-lg bg-zinc-900 border-zinc-800">
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
        <CardFooter className="flex flex-row justify-end gap-3 px-8 pb-8 pt-2 border-none bg-transparent">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-11 px-8 rounded-lg text-base border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="h-11 px-8 rounded-lg text-base font-semibold">
            {isSubmitting ? "Saving..." : setlist ? "Update" : "Create"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}