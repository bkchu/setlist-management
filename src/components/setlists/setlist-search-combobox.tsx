import * as React from "react";
import { matchSorter } from "match-sorter";
import { useNavigate } from "react-router-dom";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { Setlist } from "@/types";
import { format } from "date-fns";

interface SetlistSearchComboboxProps {
  setlists: Setlist[];
}

export function SetlistSearchCombobox({ setlists }: SetlistSearchComboboxProps) {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [input, setInput] = React.useState("");

  // Fuzzy search results
  const searchResults: Setlist[] = input
    ? matchSorter(setlists, input, {
        keys: ["name", "date"],
        threshold: matchSorter.rankings.CONTAINS,
      }).slice(0, 5)
    : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="max-w-60 justify-between"
        >
          {value
            ? setlists.find((setlist) => setlist.id === value)?.name
            : "Search setlists..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="end">
        <Command>
          <CommandInput
            placeholder="Search by name or date..."
            value={input}
            onValueChange={setInput}
            autoFocus
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {searchResults.map((setlist) => (
              <CommandItem
                key={setlist.id}
                value={`${setlist.name} ${format(new Date(setlist.date), 'MMM d, yyyy')}`}
                onSelect={() => {
                  setValue(setlist.id);
                  setInput("");
                  setOpen(false);
                  // Navigate to setlist detail using client-side navigation
                  navigate(`/setlist/${setlist.id}`);
                }}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{setlist.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(setlist.date), "MMM d, yyyy")}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
