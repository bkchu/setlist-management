import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import ResetPasswordPage from "@/pages/reset-password";
// import { useUserOrganizations } from "@/api/organizations/get";

// Create a query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

// Lightweight loading components
function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center">Loading...</div>
  );
}

// Removed inner loading placeholder to keep Routes mounted

function ToastOnJoin() {
  const location = useLocation();
  const toastNavigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const joined = params.get("joined");
    if (joined === "1") {
      const org = localStorage.getItem("joinSuccessOrgName");
      toast.success("Joined organization", {
        description: org
          ? `You are now a member of ${org}.`
          : "You're ready to collaborate.",
        action: {
          label: "Invite members",
          onClick: () => toastNavigate("/settings"),
        },
      });
      localStorage.removeItem("joinSuccessOrgName");
    }
  }, [location.search, toastNavigate]);
  return null;
}

// App content that handles routing logic
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading, orgsLoading } = useAuth();

  // Make org resolution sticky for the session to avoid flicker on focus
  const [orgsReady, setOrgsReady] = useState(false);
  useEffect(() => {
    if (!user) {
      setOrgsReady(false);
      return;
    }
    if (!orgsLoading) {
      setOrgsReady(true);
    }
  }, [user, user?.id, orgsLoading]);

  const shouldShowOnboarding = useMemo(() => {
    const hasOrgId = Boolean(user?.organizationId);
    const orgCount = user?.organizations?.length ?? 0;
    return orgsReady && !hasOrgId && orgCount === 0;
  }, [orgsReady, user?.organizationId, user?.organizations?.length]);

  // Public routes that don't need protection
  const isPublicRoute = [
    "/login",
    "/reset-password",
    "/onboarding",
    "/join",
  ].includes(location.pathname);

  // Imperative onboarding redirect to avoid unmounting the Routes tree
  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    if (isLoading || !user) return;
    if (
      orgsReady &&
      shouldShowOnboarding &&
      !hasRedirectedRef.current &&
      location.pathname !== "/onboarding" &&
      !["/login", "/reset-password", "/onboarding", "/join"].includes(
        location.pathname
      )
    ) {
      hasRedirectedRef.current = true;
      navigate("/onboarding", { replace: true });
    }
  }, [
    isLoading,
    user,
    orgsReady,
    shouldShowOnboarding,
    location.pathname,
    navigate,
  ]);

  // Show loading screen during initial auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    return <Navigate to="/login" replace />;
  }

  // If on public route, render it directly without the app shell
  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/join" element={<JoinOrganization />} />
      </Routes>
    );
  }

  // Protected routes with persistent app shell
  return (
    <div className="relative flex w-full min-h-dvh">
      <div className="hidden md:block fixed left-0 top-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-h-0 md:ml-56">
        <div className="flex-1 overflow-auto pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/songs" element={<Songs />} />
            <Route path="/song/:id" element={<SongPage />} />
            <Route path="/setlists" element={<Setlists />} />
            <Route path="/setlist/:id" element={<SetlistPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      {/* Global Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
        <MobileNav />
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <AuthProvider>
            <SongProvider>
              <SettingsProvider>
                <Router>
                  <ToastOnJoin />
                  <AppContent />
                  <Toaster position="bottom-right" richColors />
                </Router>
              </SettingsProvider>
            </SongProvider>
          </AuthProvider>
        </TooltipProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
