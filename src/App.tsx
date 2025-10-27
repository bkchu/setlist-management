import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { SongProvider } from "@/hooks/use-songs";
// Removed SetlistProvider in favor of API hooks per React Query rules
import { SettingsProvider } from "@/hooks/use-settings";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Songs from "@/pages/songs";
import Setlists from "@/pages/setlists";
import Settings from "@/pages/settings";
import SongPage from "@/pages/song/[id]";
import SetlistPage from "@/pages/setlist/[id]";
import Onboarding from "@/pages/onboarding";
import JoinOrganization from "@/pages/join-organization";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeProvider } from "@/components/theme-provider";
import ResetPasswordPage from "@/pages/reset-password";
import { useUserOrganizations } from "@/api/organizations/get";

// Create a query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, orgsLoading } = useAuth();
  const { isLoading: orgsQueryLoading, data: orgsData } =
    useUserOrganizations();

  // Only show the loading screen on the initial organizations resolution
  const [orgsResolved, setOrgsResolved] = useState(false);
  useEffect(() => {
    if (!orgsLoading && !orgsQueryLoading) {
      // Once either an organization is set or the query has run, consider resolved
      if (user?.organizationId !== undefined || orgsData !== undefined) {
        setOrgsResolved(true);
      }
    }
  }, [orgsLoading, orgsQueryLoading, user?.organizationId, orgsData]);

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

  // While organizations are being resolved, render the app frame with a placeholder
  const renderContent = () => {
    // Only show loading before the first organizations resolution
    const isInitialLoading =
      !orgsResolved && (orgsLoading || (orgsQueryLoading && !orgsData));

    if (isInitialLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          Loading...
        </div>
      );
    }

    // If user doesn't have an organization after loading, redirect to onboarding
    if (!user.organizationId && !(orgsData && orgsData.length > 0)) {
      return <Navigate to="/onboarding" replace />;
    }

    return children;
  };

  return (
    <div className="relative flex w-full min-h-dvh">
      <div className="hidden md:block fixed left-0 top-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-h-0 md:ml-40">
        <div className="flex-1 overflow-auto pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
          {renderContent()}
        </div>
      </div>
      {/* Global Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden pb-[env(safe-area-inset-bottom)]">
        <MobileNav />
      </div>
    </div>
  );
}

function ToastOnJoin() {
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const joined = params.get("joined");
    if (joined === "1") {
      const org = localStorage.getItem("joinSuccessOrgName");
      toast.success("Joined organization", {
        description: org ? `You are now a member of ${org}.` : undefined,
      });
      localStorage.removeItem("joinSuccessOrgName");
    }
  }, [location.search]);
  return null;
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SongProvider>
            <SettingsProvider>
              <Router>
                <ToastOnJoin />
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/reset-password"
                    element={<ResetPasswordPage />}
                  />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/join" element={<JoinOrganization />} />
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
              <Toaster position="bottom-right" richColors />
            </SettingsProvider>
          </SongProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
