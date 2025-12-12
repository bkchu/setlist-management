import { cn } from "@/lib/utils";
import { SectionOrder, SongSection } from "@/types";

const SECTION_ABBREVIATIONS: Record<SongSection["type"], string> = {
  intro: "Intro",
  verse: "V",
  prechorus: "Pre",
  chorus: "C",
  bridge: "B",
  outro: "Outro",
  instrumental: "Instr",
  interlude: "Inter",
  tag: "Tag",
};

function toShortLabel(section: SongSection): string {
  const base = SECTION_ABBREVIATIONS[section.type] || section.type;

  // If a label contains a number (e.g., Verse 2), surface it in the short code
  if (section.label) {
    const numberMatch = section.label.match(/(\d+)/);
    if (numberMatch) {
      return `${base}${numberMatch[1]}`;
    }
  }

  // Verse is commonly numbered even without an explicit label
  if (section.type === "verse") {
    const impliedNumber = section.label?.match(/(\d+)/)?.[1];
    return impliedNumber ? `${base}${impliedNumber}` : base;
  }

  return base;
}

function formatSection(section: SongSection): string {
  const repeat = section.repeat && section.repeat > 1 ? ` ×${section.repeat}` : "";
  return `${toShortLabel(section)}${repeat}`;
}

export function SectionOrderDisplay({
  order,
  className,
  "aria-label": ariaLabel,
}: {
  order?: SectionOrder;
  className?: string;
  "aria-label"?: string;
}) {
  if (!order || order.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 text-xs text-muted-foreground",
        className
      )}
      aria-label={ariaLabel ?? "Song section order"}
    >
      {order.map((section, idx) => (
        <span key={section.id} className="flex items-center gap-1">
          <span className="inline-flex items-center rounded-md bg-white/5 px-2 py-1 font-medium text-foreground/90">
            {formatSection(section)}
          </span>
          {idx < order.length - 1 && (
            <span className="text-[11px] text-muted-foreground">→</span>
          )}
        </span>
      ))}
    </div>
  );
}

