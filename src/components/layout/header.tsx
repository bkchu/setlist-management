import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  searchBar?: React.ReactNode;
  className?: string;
}

const Header = ({
  title,
  subtitle,
  children,
  searchBar,
  className,
}: HeaderProps) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 w-full items-center justify-between gap-4 border-b border-white/10 bg-background/80 px-4 backdrop-blur-xl transition-all sm:px-6",
        className
      )}
    >
      <div className="flex min-w-0 flex-col justify-center gap-0.5">
        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs font-medium text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        {searchBar && (
          <div className="hidden w-full max-w-xs md:block">{searchBar}</div>
        )}
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
};

export { Header };
