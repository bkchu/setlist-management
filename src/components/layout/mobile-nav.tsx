import { Home, ListMusic, Music } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export function MobileNav() {
  const { pathname } = useLocation();

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      name: "Songs",
      href: "/songs",
      icon: Music,
    },
    {
      name: "Setlists",
      href: "/setlists",
      icon: ListMusic,
    },
  ];

  const renderedNavItems = useMemo(() => {
    return navItems.map((item) => {
      let isActive;
      if (item.name === "Dashboard") {
        isActive =
          pathname === "/" ||
          pathname === item.href ||
          pathname.startsWith(item.href + "/");
      } else {
        isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href + "/"));
      }
      return (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "flex flex-1 flex-col items-center justify-center space-y-1 p-2 text-xs font-medium transition-colors",
            isActive
              ? "text-primary"
              : "text-muted-foreground hover:text-primary"
          )}
        >
          <item.icon
            className={cn("h-5 w-5", isActive ? "stroke-current" : "")}
          />
          <span>{item.name}</span>
        </Link>
      );
    });
  }, [pathname, navItems]);

  return (
    <nav className="flex h-14 w-full items-center justify-around">
      <div className="flex h-full w-full items-center justify-around">
        {renderedNavItems}
      </div>
    </nav>
  );
}
