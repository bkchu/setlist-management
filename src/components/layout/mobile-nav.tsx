import { Home, ListMusic, Music, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

// Static nav items - defined outside component to prevent recreation
const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "Setlists",
    href: "/setlists",
    icon: ListMusic,
  },
  {
    name: "Songs",
    href: "/songs",
    icon: Music,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
] as const;

export function MobileNav() {
  const { pathname } = useLocation();

  const renderedNavItems = useMemo(() => {
    return NAV_ITEMS.map((item) => {
      const isActive =
        item.name === "Dashboard"
          ? pathname === "/" ||
            pathname === item.href ||
            pathname.startsWith(item.href + "/")
          : pathname === item.href || pathname.startsWith(item.href + "/");
      return (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "group relative flex flex-col items-center justify-center gap-0.5 px-4 py-2 transition-all duration-300",
            isActive ? "text-foreground" : "text-white/50 hover:text-white/80"
          )}
        >
          {/* Active indicator pill */}
          <span
            className={cn(
              "absolute inset-0 rounded-full transition-all duration-300",
              isActive
                ? "border border-primary/30 bg-primary/15 shadow-[0_0_16px_rgba(156,219,176,0.25)]"
                : "bg-transparent group-hover:bg-white/5"
            )}
          />
          <item.icon
            className={cn(
              "relative z-10 h-5 w-5 transition-transform duration-300",
              isActive ? "scale-110" : "group-hover:scale-105"
            )}
            strokeWidth={isActive ? 2.5 : 2}
          />
          <span
            className={cn(
              "relative z-10 text-[10px] font-medium tracking-wide transition-all duration-300",
              isActive ? "opacity-100" : "opacity-70 group-hover:opacity-90"
            )}
          >
            {item.name}
          </span>
        </Link>
      );
    });
  }, [pathname]);

  return (
    <nav className="mx-3 mb-3">
      <div
        className={cn(
          "flex items-center justify-between rounded-full py-1 px-1",
          "bg-gradient-to-b from-white/10 to-white/5",
          "backdrop-blur-xl backdrop-saturate-150",
          "border border-white/10",
          "shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]"
        )}
      >
        {renderedNavItems}
      </div>
    </nav>
  );
}
