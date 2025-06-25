import * as React from "react";
import { matchSorter } from "match-sorter";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";

import { Song } from "@/types";

interface SongSearchComboboxProps {
  songs: Song[];
  onSelect?: (songId: string) => void;
  placeholder?: string;
  value?: string; // Controlled component value
}

export function SongSearchCombobox({
  songs,
  onSelect,
  placeholder = "Search songs...",
  value: controlledValue,
}: SongSearchComboboxProps) {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState("");
  const [input, setInput] = React.useState("");

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const searchResults: Song[] = React.useMemo(() => {
    if (!input) {
      return songs.slice(0, 10);
    }
    return matchSorter(songs, input, {
      keys: ["title", "artist"],
    }).slice(0, 10);
  }, [songs, input]);

  const handleSelect = (songId: string) => {
    if (onSelect) {
      onSelect(songId);
    } else {
      setInternalValue(songId);
      navigate(`/song/${songId}`);
    }
    setInput("");
    setOpen(false);
  };

  const selectedSongTitle = React.useMemo(() => {
    return songs.find((song) => song.id === value)?.title;
  }, [songs, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedSongTitle || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 overflow-scroll"
        align="start"
      >
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
                value={`${song.title} ${song.artist || ""}`}
                onSelect={() => handleSelect(song.id)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{song.title}</span>
                  {song.artist && (
                    <span className="text-xs text-muted-foreground">
                      {song.artist}
                    </span>
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
