// Button import removed (unused)
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  searchBar?: React.ReactNode;
}

const Header = ({ title, subtitle, children, searchBar }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2 h-full">
          <h1 className="text-lg font-semibold">The Sunday Setlist</h1>
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
    </header>
  );
};

export { Header };
