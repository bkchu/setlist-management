import * as React from "react";
import { matchSorter } from "match-sorter";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";

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
  const [query, setQuery] = React.useState("");
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(max-width: 640px)");
    const update = (e: MediaQueryList | MediaQueryListEvent) => {
      const matches =
        "matches" in e ? e.matches : (e as MediaQueryList).matches;
      setIsMobile(matches);
    };
    update(mql);
    const listener = (e: MediaQueryListEvent) => update(e);
    mql.addEventListener?.("change", listener);
    return () => mql.removeEventListener?.("change", listener);
  }, []);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleSelect = (songId: string) => {
    if (onSelect) {
      onSelect(songId);
    } else {
      setInternalValue(songId);
      navigate(`/song/${songId}`);
    }
    setOpen(false);
  };

  const selectedSongTitle = React.useMemo(() => {
    return songs.find((song) => song.id === value)?.title;
  }, [songs, value]);
  const mobileResults: Song[] = React.useMemo(() => {
    if (!isMobile) return [];
    if (!query) return songs.slice(0, 50);
    return matchSorter(songs, query, { keys: ["title", "artist"] }).slice(
      0,
      50
    );
  }, [isMobile, songs, query]);

  // Mobile: Drawer-based searchable selector for better tap targets and full-screen experience
  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery("");
        }}
        shouldScaleBackground={false}
      >
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedSongTitle || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Select song</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pt-0 space-y-3">
            <Input
              placeholder="Search by title or artist..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="max-h-[60vh] overflow-y-auto -mx-1 pr-1">
              {mobileResults.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </div>
              ) : (
                <div className="space-y-1">
                  {mobileResults.map((song) => (
                    <button
                      key={song.id}
                      onClick={() => handleSelect(song.id)}
                      className="w-full text-left rounded-md px-3 py-2 outline-none transition hover:bg-accent focus:bg-accent"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{song.title}</span>
                        {song.artist && (
                          <span className="text-xs text-muted-foreground">
                            {song.artist}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
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
        className="w-[var(--radix-popover-trigger-width)] p-0 z-[100] pointer-events-auto"
        align="start"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder="Search by title or artist..." autoFocus />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {songs.map((song) => (
                <CommandItem
                  key={song.id}
                  // value is used for filtering; include title and artist for better matches
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
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
