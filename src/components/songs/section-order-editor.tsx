import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SectionOrder, SectionType, SongSection } from "@/types";
import { GripVerticalIcon, Trash2Icon } from "lucide-react";

const SECTION_PRESETS: Array<{
  type: SectionType;
  label: string;
  displayLabel?: string;
}> = [
  { type: "intro", label: "Intro" },
  { type: "verse", label: "Verse 1", displayLabel: "V1" },
  { type: "verse", label: "Verse 2", displayLabel: "V2" },
  { type: "verse", label: "Verse 3", displayLabel: "V3" },
  { type: "verse", label: "Verse 4", displayLabel: "V4" },
  { type: "verse", label: "Verse 5", displayLabel: "V5" },
  { type: "prechorus", label: "Pre-chorus", displayLabel: "Pre" },
  { type: "chorus", label: "Chorus", displayLabel: "C" },
  { type: "bridge", label: "Bridge", displayLabel: "B" },
  { type: "tag", label: "Tag" },
  { type: "instrumental", label: "Instrumental", displayLabel: "Instr" },
  { type: "interlude", label: "Interlude", displayLabel: "Inter" },
  { type: "outro", label: "Outro" },
];

const SECTION_LABEL_LOOKUP = SECTION_PRESETS.reduce(
  (acc, item) => ({ ...acc, [item.type]: item.label }),
  {} as Record<SectionType, string>
);

function getTypeLabel(type: SectionType) {
  return SECTION_LABEL_LOOKUP[type] ?? type;
}

function getDisplayLabel(section: SongSection) {
  if (section.displayLabel) return section.displayLabel;
  const preset = SECTION_PRESETS.find(
    (p) => p.type === section.type && p.label === section.label
  );
  if (preset?.displayLabel) return preset.displayLabel;
  // If label has a trailing number, keep short form like V1, V2, etc.
  const match = section.label?.match(/(verse|v)\s*(\d+)/i);
  if (match) return `V${match[2]}`;
  if (section.type === "chorus") return "C";
  if (section.type === "bridge") return "B";
  if (section.type === "prechorus") return "Pre";
  if (section.type === "instrumental") return "Instr";
  if (section.type === "interlude") return "Inter";
  return section.label || getTypeLabel(section.type);
}

function nextLabelForType(type: SectionType, existing: SectionOrder): string {
  const count = existing.filter((section) => section.type === type).length + 1;
  switch (type) {
    case "verse":
      return `Verse ${count}`;
    case "chorus":
      return count > 1 ? `Chorus ${count}` : "Chorus";
    case "bridge":
      return count > 1 ? `Bridge ${count}` : "Bridge";
    case "intro":
      return "Intro";
    case "outro":
      return "Outro";
    case "prechorus":
      return count > 1 ? `Pre-chorus ${count}` : "Pre-chorus";
    case "instrumental":
      return count > 1 ? `Instrumental ${count}` : "Instrumental";
    case "interlude":
      return count > 1 ? `Interlude ${count}` : "Interlude";
    case "tag":
    default:
      return count > 1 ? `Tag ${count}` : "Tag";
  }
}

function SortableRow({
  section,
  onRemove,
  onRepeatToggle,
}: {
  section: SongSection;
  onRemove: () => void;
  onRepeatToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2",
        isDragging && "ring-1 ring-primary/40 shadow-lg"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label="Reorder section"
        >
          <GripVerticalIcon className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-foreground truncate">
          {getDisplayLabel(section)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className="cursor-pointer select-none text-[11px]"
          onClick={onRepeatToggle}
        >
          ×{section.repeat ?? 1}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onRemove}
          aria-label="Remove section"
        >
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function SectionOrderEditor({
  value,
  onChange,
  className,
  hideHeader,
}: {
  value: SectionOrder;
  onChange: (next: SectionOrder) => void;
  className?: string;
  hideHeader?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor)
  );

  const sectionIds = useMemo(() => value.map((s) => s.id), [value]);

  const handleAddSection = (type: SectionType, explicitLabel?: string) => {
    const next: SongSection = {
      id: crypto.randomUUID(),
      type,
      label: explicitLabel || nextLabelForType(type, value),
      repeat: 1,
    };
    onChange([...value, next]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sectionIds.indexOf(active.id as string);
    const newIndex = sectionIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(value, oldIndex, newIndex));
  };

  const handleRepeatToggle = (id: string) => {
    onChange(
      value.map((section) =>
        section.id === id
          ? {
              ...section,
              repeat:
                section.repeat && section.repeat >= 3
                  ? 1
                  : (section.repeat || 1) + 1,
            }
          : section
      )
    );
  };

  const handleRemove = (id: string) => {
    onChange(value.filter((section) => section.id !== id));
  };

  return (
    <div className={cn("space-y-3", className)}>
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">Section order</p>
            <p className="text-xs text-muted-foreground">
              Tap to add, drag to reorder, tap × to remove.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-3"
            disabled={value.length === 0}
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {SECTION_PRESETS.map((section) => (
          <Button
            key={section.type}
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 justify-center px-2 text-xs sm:text-sm font-semibold border-white/10 bg-white/8 hover:bg-white/12"
            onClick={() => handleAddSection(section.type, section.label)}
          >
            {section.displayLabel || section.label}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        {value.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Build the order. Add sections in the order you plan to play them.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sectionIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {value.map((section) => (
                  <SortableRow
                    key={section.id}
                    section={section}
                    onRemove={() => handleRemove(section.id)}
                    onRepeatToggle={() => handleRepeatToggle(section.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
