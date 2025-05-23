import React from "react";
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MusicIcon, ListMusic, HomeIcon, LogOutIcon } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { useAuth } from "@/hooks/use-auth";

export function Sidebar() {
  const { user, logout } = useAuth();
  
  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: HomeIcon,
    },
    {
      title: "Songs",
      href: "/songs",
      icon: MusicIcon,
    },
    {
      title: "Setlists",
      href: "/setlists",
      icon: ListMusic,
    },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r">
      <div className="flex h-14 items-center px-4 py-2">
        <h2 className="text-lg font-semibold tracking-tight">Worship Setlist</h2>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-2 py-4">
        <SidebarNav items={navItems} />
      </ScrollArea>
      <Separator />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
              <span className="text-sm font-medium text-accent-foreground">
                {user?.name?.charAt(0) || "U"}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground">{user?.email || "user@example.com"}</p>
            </div>
          </div>
          <Button
             onClick={logout}
          >
            <LogOutIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}