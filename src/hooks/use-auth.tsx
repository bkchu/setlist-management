import { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { organizationKeys } from "@/api/organizations/keys";

interface AuthContextProps {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: "google" | "github") => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  switchOrganization: (organizationId: string) => void;
  createOrganization: (name: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  orgsLoading: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgsLoading, setOrgsLoading] = useState<boolean>(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const bootstrapSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log("Initial session check:", session?.user?.id || "no user");

      // Set minimal user immediately and clear the global auth loading state
      await setBasicUser(session);
      setIsLoading(false);

      // Fetch organizations in the background without blocking auth loading
      void fetchAndSetOrganizations(session);
    };

    bootstrapSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, session?.user?.id || "no user");

      if (event === "SIGNED_IN") {
        setIsLoading(true);
        // Clear any user-scoped cache to avoid leaking previous state
        queryClient.clear();
        setTimeout(async () => {
          await setBasicUser(session);
          setIsLoading(false);
          void fetchAndSetOrganizations(session);
        }, 0);
      } else if (event === "SIGNED_OUT") {
        setIsLoading(true);
        setTimeout(async () => {
          setUser(null);
          setOrgsLoading(false);
          queryClient.clear();
          setIsLoading(false);
        }, 0);
      } else {
        // Other events (TOKEN_REFRESHED, USER_UPDATED)
        setTimeout(async () => {
          await setBasicUser(session);
          void fetchAndSetOrganizations(session);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setBasicUser = async (session: Session | null) => {
    if (session?.user) {
      setUser((prev) => ({
        id: session.user.id,
        email: session.user.email!,
        name:
          session.user.user_metadata.name || session.user.email!.split("@")[0],
        organizationId: prev?.organizationId,
        organizations: prev?.organizations ?? [],
      }));
    } else {
      setUser(null);
    }
  };

  const fetchAndSetOrganizations = async (session: Session | null) => {
    if (!session?.user) return;
    setOrgsLoading(true);
    try {
      const { data: userAccessibleOrgs, error: orgsError } = await supabase
        .from("user_accessible_organizations")
        .select("id, name, owner_id, role, created_at");

      if (orgsError) {
        console.error("Error fetching organizations:", orgsError);
        // Populate React Query cache with empty list
        queryClient.setQueryData(organizationKeys.list(session.user.id), []);
        setUser((prev) =>
          prev
            ? {
                ...prev,
                organizationId: undefined,
                organizations: [],
              }
            : prev
        );
      } else if (userAccessibleOrgs && userAccessibleOrgs.length > 0) {
        const organizations = userAccessibleOrgs.map((org) => ({
          id: org.id,
          organizationId: org.id,
          organizationName: org.name,
          role: org.role,
          createdAt: org.created_at || new Date().toISOString(),
        }));

        const organizationId = organizations[0].organizationId;
        // Seed React Query cache so consumers don't refetch
        queryClient.setQueryData(
          organizationKeys.list(session.user.id),
          userAccessibleOrgs
        );
        setUser((prev) =>
          prev
            ? {
                ...prev,
                organizationId,
                organizations,
              }
            : prev
        );
      } else {
        // No organizations yet
        const pendingJoinCode = localStorage.getItem("pendingJoinCode");
        if (pendingJoinCode) {
          console.log("Found pending join code, will redirect to join flow");
          localStorage.removeItem("pendingJoinCode");
          setTimeout(() => {
            window.location.href = `/join?code=${pendingJoinCode}`;
          }, 100);
        }
        // Populate React Query cache with empty list
        queryClient.setQueryData(organizationKeys.list(session.user.id), []);
        setUser((prev) =>
          prev
            ? {
                ...prev,
                organizationId: undefined,
                organizations: [],
              }
            : prev
        );
      }
    } catch (err) {
      console.error("Error fetching/creating user organization:", err);
    } finally {
      setOrgsLoading(false);
    }
  };

  const refreshUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await setBasicUser(session);
    await fetchAndSetOrganizations(session);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithProvider = async (provider: "google" | "github") => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to sign in with ${provider}`
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send reset email"
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update password"
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign out");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const switchOrganization = (organizationId: string) => {
    if (!user) return;
    // Allow switching optimistically; membership is enforced by RLS on data queries
    setUser({
      ...user,
      organizationId,
    });
    console.log("Switched to organization:", organizationId);
  };

  const createOrganization = async (name: string) => {
    if (!user) throw new Error("User not authenticated");

    setIsLoading(true);
    setError(null);

    try {
      // First create the organization
      const { data: newOrg, error: createError } = await supabase
        .from("organizations")
        .insert([
          {
            name: name.trim(),
            owner_id: user.id,
          },
        ])
        .select("id, name")
        .single();

      if (createError) throw createError;

      if (newOrg) {
        // Then add the user to the organization as owner
        const { data: membership, error: membershipError } = await supabase
          .from("user_organizations")
          .insert([
            {
              user_id: user.id,
              organization_id: newOrg.id,
              role: "owner",
            },
          ])
          .select("id, created_at")
          .single();

        if (membershipError) throw membershipError;

        if (membership) {
          // Update the user state with the new organization
          const newOrganization = {
            id: membership.id,
            organizationId: newOrg.id,
            organizationName: newOrg.name,
            role: "owner" as const,
            createdAt: membership.created_at || new Date().toISOString(),
          };

          setUser({
            ...user,
            organizationId: newOrg.id,
            organizations: [...user.organizations, newOrganization],
          });

          console.log("Successfully created organization:", newOrg.id);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create organization"
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        register,
        signInWithProvider,
        sendPasswordResetEmail,
        updatePassword,
        switchOrganization,
        createOrganization,
        refreshUser,
        isLoading,
        error,
        orgsLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
