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
    <div className="flex-1 flex h-screen flex-col">
      <Header title={title} subtitle={subtitle} searchBar={searchBar}>
        {headerChildren}
      </Header>
      
      <main className="flex-1 px-4 py-4">
        {children}
      </main>
      

    </div>
  );
}
