import * as React from "react";
import { matchSorter } from "match-sorter";
import { useNavigate } from "react-router-dom";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";

import { Song } from "@/types";

interface SongSearchComboboxProps {
  songs: Song[];
}

export function SongSearchCombobox({ songs }: SongSearchComboboxProps) {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [input, setInput] = React.useState("");

  // Fuzzy search results
  const searchResults: Song[] = input
    ? matchSorter(songs, input, {
        keys: ["title", "artist"],
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
          className="w-60 justify-between"
        >
          {value
            ? songs.find((song) => song.id === value)?.title
            : "Search songs..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0">
        <Command>
          <CommandInput
            placeholder="Search by title or artist..."
            value={input}
            onValueChange={setInput}
            autoFocus
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {searchResults.map((song) => (
              <CommandItem
                key={song.id}
                value={`${song.title} ${song.artist || ''}`}
                onSelect={() => {
                  setValue(song.id);
                  setInput("");
                  setOpen(false);
                  // Navigate to song detail using client-side navigation
                  navigate(`/song/${song.id}`);
                }}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{song.title}</span>
                  {song.artist && (
                    <span className="text-xs text-muted-foreground">{song.artist}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
