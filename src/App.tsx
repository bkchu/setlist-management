import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { SongProvider } from "@/hooks/use-songs";
import { SetlistProvider } from "@/hooks/use-setlists";
import { SettingsProvider } from "@/hooks/use-settings";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Songs from "@/pages/songs";
import Setlists from "@/pages/setlists";
import Settings from "@/pages/settings";
import SongPage from "@/pages/song/[id]";
import SetlistPage from "@/pages/setlist/[id]";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeProvider } from "@/components/theme-provider";

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="relative flex w-full">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto pb-[56px] md:pb-0">{children}</div>
      </div>
      {/* Global Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <SongProvider>
          <SetlistProvider>
            <SettingsProvider>
              <Router>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/songs"
                    element={
                      <ProtectedRoute>
                        <Songs />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/song/:id"
                    element={
                      <ProtectedRoute>
                        <SongPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/setlists"
                    element={
                      <ProtectedRoute>
                        <Setlists />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/setlist/:id"
                    element={
                      <ProtectedRoute>
                        <SetlistPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Router>
              <Toaster position="bottom-right" />
            </SettingsProvider>
          </SetlistProvider>
        </SongProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
