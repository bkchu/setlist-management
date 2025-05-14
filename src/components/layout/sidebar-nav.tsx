import { cn } from "@/lib/utils";
import { DivideIcon as LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface SidebarNavProps {
  items: {
    href: string;
    title: string;
    icon: LucideIcon;
  }[];
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
              "group flex items-center gap-x-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}