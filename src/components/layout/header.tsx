// Button import removed (unused)
import { Separator } from "@/components/ui/separator";
import SetlifyLogoIcon from "../SetlifyLogoIcon";
import { Link } from "react-router-dom";

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  searchBar?: React.ReactNode;
}

export function Header({ title, subtitle, children, searchBar }: HeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2 h-full">
          <div className="items-center gap-2 border-r border-border pr-4 h-full hidden sm:flex md:hidden">
            <Link to="/" className="">
              <div className="flex items-center justify-center rounded-full bg-primary h-8 w-8">
                <SetlifyLogoIcon className="h-6 w-6 text-primary-foreground" />
              </div>
            </Link>
            <h2 className="text-lg font-semibold tracking-tight">Setlify</h2>
          </div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {searchBar}
          {children}
        </div>
      </div>
      <Separator />
    </div>
  );
}
