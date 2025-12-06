import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MusicIcon,
  ListMusic,
  HomeIcon,
  LogOutIcon,
  SettingsIcon,
} from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Static nav items - defined outside component to prevent recreation
const NAV_ITEMS = [
  {
    title: "Home",
    href: "/",
    icon: HomeIcon,
  },
  {
    title: "Setlists",
    href: "/setlists",
    icon: ListMusic,
  },
  {
    title: "Songs",
    href: "/songs",
    icon: MusicIcon,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: SettingsIcon,
  },
] as const;

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-56 flex-col bg-sidebar border-r border-white/10 backdrop-blur-xl shadow-glass">
      <ScrollArea className="flex-1 px-4 py-5">
        <SidebarNav items={NAV_ITEMS} />
      </ScrollArea>

      <div className="p-4 border-t border-white/10 bg-sidebar/80 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Avatar as Dropdown Trigger */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="User menu"
                  className="h-9 w-9 rounded-full bg-primary/15 border border-white/10 flex items-center justify-center text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 hover:shadow-[0_0_12px_rgba(156,219,176,0.35)]"
                  type="button"
                >
                  <span>{user?.name?.charAt(0) || "U"}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="w-44"
              >
                <div className="px-2 py-1.5">
                  <span className="block text-sm font-medium truncate">
                    {user?.name || "User"}
                  </span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                  <LogOutIcon className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* Logout button moved to dropdown menu above */}
        </div>
      </div>
    </div>
  );
}
