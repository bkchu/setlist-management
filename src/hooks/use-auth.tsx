import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { User } from "@/types";
import { supabase } from "@/lib/supabase";
import { Session, AuthChangeEvent } from "@supabase/supabase-js";
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

/**
 * Deep equality check for user objects
 */
function areUsersEqual(user1: User | null, user2: User | null): boolean {
  if (user1 === user2) return true;
  if (!user1 || !user2) return false;

  if (
    user1.id !== user2.id ||
    user1.email !== user2.email ||
    user1.name !== user2.name ||
    user1.organizationId !== user2.organizationId
  ) {
    return false;
  }

  if (user1.organizations.length !== user2.organizations.length) {
    return false;
  }

  return user1.organizations.every(
    (org1, index) =>
      org1.id === user2.organizations[index]?.id &&
      org1.organizationId === user2.organizations[index]?.organizationId &&
      org1.organizationName === user2.organizations[index]?.organizationName &&
      org1.role === user2.organizations[index]?.role
  );
}

/**
 * Extract user data from Supabase session
 */
function extractUserFromSession(
  session: Session | null
): Omit<User, "organizationId" | "organizations"> | null {
  if (!session?.user) return null;

  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.user_metadata.name || session.user.email!.split("@")[0],
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgsLoading, setOrgsLoading] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // Track if we've initialized to prevent unnecessary updates
  const initializedRef = useRef(false);
  // Track the last user ID to detect actual user changes
  const lastUserIdRef = useRef<string | null>(null);

  /**
   * Update user state only if it actually changed
   */
  const updateUserIfChanged = useCallback((newUser: User | null) => {
    setUser((prev: User | null) => {
      if (areUsersEqual(prev, newUser)) {
        return prev; // Return previous reference to prevent re-render
      }
      return newUser;
    });
  }, []);

  /**
   * Update basic user info from session, preserving organization state
   */
  const updateBasicUserFromSession = useCallback(
    (session: Session | null) => {
      const basicUserData = extractUserFromSession(session);
      if (!basicUserData) {
        updateUserIfChanged(null);
        return;
      }

      setUser((prev: User | null) => {
        // If user ID changed, this is a different user
        if (prev && prev.id !== basicUserData.id) {
          return {
            ...basicUserData,
            organizationId: undefined,
            organizations: [],
          };
        }

        // Otherwise, merge with existing state
        const merged: User = {
          ...basicUserData,
          organizationId: prev?.organizationId,
          organizations: prev?.organizations ?? [],
        };

        // Only update if something actually changed
        if (areUsersEqual(prev, merged)) {
          return prev!;
        }

        return merged;
      });
    },
    [updateUserIfChanged]
  );

  /**
   * Fetch and update organizations
   */
  const fetchAndSetOrganizations = useCallback(
    async (session: Session | null, forceRefresh = false) => {
      if (!session?.user) {
        return;
      }

      // Don't refetch if we already have organizations and this isn't a forced refresh
      if (
        !forceRefresh &&
        user?.organizations &&
        user.organizations.length > 0
      ) {
        return;
      }

      setOrgsLoading(true);
      try {
        const { data: userAccessibleOrgs, error: orgsError } = await supabase
          .from("user_accessible_organizations")
          .select("id, name, owner_id, role, created_at");

        if (orgsError) {
          console.error("Error fetching organizations:", orgsError);
          queryClient.setQueryData(organizationKeys.list(session.user.id), []);
          updateUserIfChanged(
            user
              ? {
                  ...user,
                  organizationId: undefined,
                  organizations: [],
                }
              : null
          );
        } else if (userAccessibleOrgs && userAccessibleOrgs.length > 0) {
          const organizations = userAccessibleOrgs.map(
            (org: {
              id: string;
              name: string;
              owner_id: string | null;
              role: "owner" | "admin" | "member";
              created_at: string | null;
            }) => ({
              id: org.id,
              organizationId: org.id,
              organizationName: org.name,
              role: org.role,
              createdAt: org.created_at || new Date().toISOString(),
            })
          );

          const organizationId = organizations[0].organizationId;
          queryClient.setQueryData(
            organizationKeys.list(session.user.id),
            userAccessibleOrgs
          );

          setUser((prev: User | null) => {
            if (!prev) return prev;
            const updated: User = {
              ...prev,
              organizationId,
              organizations,
            };
            return areUsersEqual(prev, updated) ? prev : updated;
          });
        } else {
          // No organizations yet
          const pendingJoinCode = localStorage.getItem("pendingJoinCode");
          if (pendingJoinCode) {
            localStorage.removeItem("pendingJoinCode");
            setTimeout(() => {
              window.location.href = `/join?code=${pendingJoinCode}`;
            }, 100);
          }
          queryClient.setQueryData(organizationKeys.list(session.user.id), []);

          setUser((prev: User | null) => {
            if (!prev) return prev;
            const updated: User = {
              ...prev,
              organizationId: undefined,
              organizations: [],
            };
            return areUsersEqual(prev, updated) ? prev : updated;
          });
        }
      } catch (err) {
        console.error("Error fetching/creating user organization:", err);
      } finally {
        setOrgsLoading(false);
      }
    },
    [user, queryClient, updateUserIfChanged]
  );

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    const bootstrapSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      updateBasicUserFromSession(session);
      lastUserIdRef.current = session?.user?.id ?? null;
      setIsLoading(false);
      initializedRef.current = true;

      // Fetch organizations in the background without blocking auth loading
      void fetchAndSetOrganizations(session, true);
    };

    bootstrapSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        const currentUserId = session?.user?.id ?? null;
        const userIdChanged = lastUserIdRef.current !== currentUserId;

        // Only process meaningful auth events
        if (event === "SIGNED_IN") {
          // Only treat as a fresh sign-in when the actual user changed.
          // Some environments can emit SIGNED_IN again on tab focus.
          if (!userIdChanged) {
            return;
          }
          setIsLoading(true);
          queryClient.clear();
          updateBasicUserFromSession(session);
          lastUserIdRef.current = currentUserId;
          setIsLoading(false);
          void fetchAndSetOrganizations(session, true);
        } else if (event === "SIGNED_OUT") {
          setIsLoading(true);
          updateUserIfChanged(null);
          lastUserIdRef.current = null;
          setOrgsLoading(false);
          queryClient.clear();
          setIsLoading(false);
        } else if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          // Only update if user ID changed or if we haven't initialized yet
          if (userIdChanged || !initializedRef.current) {
            updateBasicUserFromSession(session);
            lastUserIdRef.current = currentUserId;
            // Only fetch orgs if user changed
            if (userIdChanged) {
              void fetchAndSetOrganizations(session, true);
            }
          }
          // Otherwise, ignore token refresh events - they don't change user state
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [
    updateBasicUserFromSession,
    fetchAndSetOrganizations,
    queryClient,
    updateUserIfChanged,
  ]);

  const refreshUser = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    updateBasicUserFromSession(session);
    await fetchAndSetOrganizations(session, true);
  }, [updateBasicUserFromSession, fetchAndSetOrganizations]);

  const login = useCallback(async (email: string, password: string) => {
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
  }, []);

  const signInWithProvider = useCallback(
    async (provider: "google" | "github") => {
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
    },
    []
  );

  const sendPasswordResetEmail = useCallback(async (email: string) => {
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
  }, []);

  const updatePassword = useCallback(async (password: string) => {
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
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
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
        setError(
          err instanceof Error ? err.message : "Failed to create account"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
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
  }, []);

  const switchOrganization = useCallback(
    (organizationId: string) => {
      if (!user) return;
      setUser((prev: User | null) => {
        if (!prev || prev.organizationId === organizationId) return prev;
        return {
          ...prev,
          organizationId,
        };
      });
    },
    [user]
  );

  const createOrganization = useCallback(
    async (name: string) => {
      if (!user) throw new Error("User not authenticated");

      setIsLoading(true);
      setError(null);

      try {
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
            const newOrganization = {
              id: membership.id,
              organizationId: newOrg.id,
              organizationName: newOrg.name,
              role: "owner" as const,
              createdAt: membership.created_at || new Date().toISOString(),
            };

            setUser((prev: User | null) => {
              if (!prev) return prev;
              const updated: User = {
                ...prev,
                organizationId: newOrg.id,
                organizations: [...prev.organizations, newOrganization],
              };
              return areUsersEqual(prev, updated) ? prev : updated;
            });
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
    },
    [user]
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<AuthContextProps>(
    () => ({
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
    }),
    [
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
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextProps {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
