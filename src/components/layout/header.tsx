import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
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