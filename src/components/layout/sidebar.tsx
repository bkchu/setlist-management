import React from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MusicIcon, ListMusic, HomeIcon, LogOutIcon } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import SetlifyLogoIcon from "../SetlifyLogoIcon";

export function Sidebar() {
  const { user, logout } = useAuth();

  const navItems = [
    {
      title: "Home",
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
    <div className="flex h-full w-32 flex-col border-r">
      <Link to="/" className="">
        <div className="flex h-14 items-center px-4 py-2 gap-2">
          <div className="flex items-center justify-center rounded-full bg-primary h-8 w-8">
            <SetlifyLogoIcon className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">Setlify</h2>
        </div>
      </Link>
      <Separator />
      <ScrollArea className="flex-1 px-2 py-4">
        <SidebarNav items={navItems} />
      </ScrollArea>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Avatar as Dropdown Trigger */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="User menu"
                  className="h-8 w-8 rounded-full bg-accent flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring"
                  type="button"
                >
                  <span className="text-sm font-medium text-accent-foreground">
                    {user?.name?.charAt(0) || "U"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="w-40"
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
