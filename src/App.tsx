import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { SongProvider } from '@/hooks/use-songs';
import { SetlistProvider } from '@/hooks/use-setlists';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Songs from '@/pages/songs';
import Setlists from '@/pages/setlists';
import SongPage from '@/pages/song/[id]';
import SetlistPage from '@/pages/setlist/[id]';
import { Sidebar } from '@/components/layout/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeProvider } from '@/components/theme-provider';

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <ScrollArea className="flex-1">{children}</ScrollArea>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <SongProvider>
          <SetlistProvider>
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
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
            <Toaster position="bottom-right" />
          </SetlistProvider>
        </SongProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;