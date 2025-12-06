import { cn } from "@/lib/utils";
import { DivideIcon as LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface SidebarNavProps {
  items: ReadonlyArray<{
    href: string;
    title: string;
    icon: typeof LucideIcon;
  }>;
  className?: string;
}

export function SidebarNav({ items, className }: SidebarNavProps) {
  const location = useLocation();

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => {
        const isActive = location.pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "group relative flex items-center gap-x-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all border",
              isActive
                ? "bg-white/8 text-foreground border-white/15 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground border-transparent"
            )}
          >
            {isActive && (
              <span className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full bg-primary shadow-[0_0_12px_rgba(156,219,176,0.4)]" />
            )}
            <Icon
              className={cn(
                "h-4 w-4 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
