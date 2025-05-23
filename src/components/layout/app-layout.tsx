import { ReactNode } from "react";
import { Header } from "./header";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  headerChildren?: ReactNode;
  searchBar?: React.ReactNode;
}

export function AppLayout({
  children,
  title,
  subtitle,
  headerChildren,
  searchBar,
}: AppLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <Header title={title} subtitle={subtitle} searchBar={searchBar}>
        {headerChildren}
      </Header>
      
      <main className="flex-1 overflow-auto p-4 pb-20">
        {children}
      </main>
      

    </div>
  );
}
