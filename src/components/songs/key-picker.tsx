import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export type KeyOption = {
  name: string;
  count: number;
};

interface KeyPickerContentProps {
  songTitle?: string;
  keys: KeyOption[];
  onSelect: (key: string) => void;
  className?: string;
}

export function KeyPickerContent({
  songTitle,
  keys,
  onSelect,
  className,
}: KeyPickerContentProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {songTitle && (
        <p className="text-sm text-muted-foreground">
          Choose from available keys:
        </p>
      )}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {keys.map((k) => (
          <Button
            key={k.name}
            variant="outline"
            className="h-10 justify-between"
            onClick={() => onSelect(k.name)}
          >
            <span className="font-medium">{k.name}</span>
            <span className="text-xs text-muted-foreground">{k.count}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

interface ResponsiveKeyPickerProps extends KeyPickerContentProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mobile-first: renders a bottom drawer. Parent can choose not to use this on desktop.
export function ResponsiveKeyPicker({
  isOpen,
  onOpenChange,
  songTitle,
  keys,
  onSelect,
}: ResponsiveKeyPickerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Select key</DrawerTitle>
          {songTitle && (
            <DrawerDescription className="mt-1">
              Choose a key for {songTitle}
            </DrawerDescription>
          )}
        </DrawerHeader>
        <div className="p-4 pt-0">
          <KeyPickerContent
            songTitle={undefined}
            keys={keys}
            onSelect={(k) => {
              onSelect(k);
              onOpenChange(false);
            }}
          />
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
