import { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";

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
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrapSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log("Initial session check:", session?.user?.id || "no user");
      await handleSession(session);
      setIsLoading(false); // This now waits for handleSession to complete
    };

    bootstrapSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, session?.user?.id || "no user");

      // Set loading to true only for sign-in/sign-out events
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setIsLoading(true);
      }

      // Use setTimeout to defer async operations as recommended by Supabase
      // This prevents deadlocks when making Supabase calls in the callback
      setTimeout(async () => {
        await handleSession(session);
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          setIsLoading(false);
        }
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session: Session | null) => {
    if (session?.user) {
      // Fetch user's organizations
      let organizationId: string | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let organizations: any[] = [];

      try {
        // Check if user belongs to any organizations via user_organizations table
        const { data: userOrgs, error } = await supabase
          .from("user_organizations")
          .select("id, organization_id, role, created_at")
          .eq("user_id", session.user.id);

        if (error) {
          console.error("Error fetching user organizations:", error);
        } else if (userOrgs && userOrgs.length > 0) {
          // Fetch organization details separately
          const orgIds = userOrgs.map(
            (membership) => membership.organization_id
          );
          const { data: orgsData } = await supabase
            .from("organizations")
            .select("id, name")
            .in("id", orgIds);

          console.log("Org data", orgsData);

          organizations = userOrgs.map((membership) => {
            const org = orgsData?.find(
              (o) => o.id === membership.organization_id
            );
            return {
              id: membership.id,
              organizationId: membership.organization_id,
              organizationName: org?.name || "Unknown Organization",
              role: membership.role,
              createdAt: membership.created_at,
            };
          });

          // Set the first organization as active (could be stored preference later)
          organizationId = organizations[0].organizationId;
          console.log(
            "Found organizations:",
            organizations.length,
            "Active:",
            organizationId
          );
        } else {
          // User doesn't belong to any organization yet - will be handled by onboarding
          console.log(
            "User has no organizations, will need to go through onboarding:",
            session.user.id
          );
          organizationId = undefined;
          organizations = [];
        }
      } catch (err) {
        console.error("Error fetching/creating user organization:", err);
      }

      setUser({
        id: session.user.id,
        email: session.user.email!,
        name:
          session.user.user_metadata.name || session.user.email!.split("@")[0],
        organizationId,
        organizations,
      });
    } else {
      setUser(null);
    }
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
    if (
      user &&
      user.organizations.some((org) => org.organizationId === organizationId)
    ) {
      setUser({
        ...user,
        organizationId,
      });
      console.log("Switched to organization:", organizationId);
    } else {
      console.error("User does not belong to organization:", organizationId);
    }
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
        isLoading,
        error,
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
