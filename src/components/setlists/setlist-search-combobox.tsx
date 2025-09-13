import * as React from "react";
import { matchSorter } from "match-sorter";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
  CommandGroup,
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
import { Setlist } from "@/types";
import { format } from "date-fns";

interface SetlistSearchComboboxProps {
  setlists: Setlist[];
}

export function SetlistSearchCombobox({
  setlists,
}: SetlistSearchComboboxProps) {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
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

  // Mobile fuzzy search results
  const mobileResults: Setlist[] = React.useMemo(() => {
    if (!isMobile) return [];
    if (!query) return setlists.slice(0, 50);
    return matchSorter(setlists, query, {
      keys: ["name", "date"],
      threshold: matchSorter.rankings.CONTAINS,
    }).slice(0, 50);
  }, [isMobile, setlists, query]);

  // Mobile: Drawer-based searchable selector
  if (isMobile) {
    const selectedName = value
      ? setlists.find((s) => s.id === value)?.name
      : undefined;
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
            className="max-w-60 justify-between"
          >
            {selectedName || "Search setlists..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Select setlist</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pt-0 space-y-3">
            <Input
              placeholder="Search by name or date..."
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
                  {mobileResults.map((setlist) => (
                    <button
                      key={setlist.id}
                      onClick={() => {
                        setValue(setlist.id);
                        setOpen(false);
                        setQuery("");
                        navigate(`/setlist/${setlist.id}`);
                      }}
                      className="w-full text-left rounded-md px-3 py-2 outline-none transition hover:bg-accent focus:bg-accent"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{setlist.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(setlist.date), "MMM d, yyyy")}
                        </span>
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

  // Desktop: Popover + Command with robust dialog-safe interactions
  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
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
      <PopoverContent
        className="w-60 p-0 z-[100] pointer-events-auto"
        align="end"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder="Search by name or date..." autoFocus />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {setlists.map((setlist) => (
                <CommandItem
                  key={setlist.id}
                  value={`${setlist.name} ${format(
                    new Date(setlist.date),
                    "MMM d, yyyy"
                  )}`}
                  onSelect={() => {
                    setValue(setlist.id);
                    setOpen(false);
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
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
