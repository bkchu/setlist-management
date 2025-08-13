import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export function useOrganizationAccess() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Check if the current user can access a specific organization
   * Uses the database function for server-side validation
   */
  const canAccessOrganization = async (
    organizationId: string
  ): Promise<boolean> => {
    if (!user) return false;

    // First check locally (faster)
    const hasLocalAccess = user.organizations.some(
      (org) => org.organizationId === organizationId
    );

    if (hasLocalAccess) return true;

    // If not found locally, check server-side (handles edge cases)
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        "user_can_access_organization",
        {
          org_id: organizationId,
        }
      );

      if (error) {
        console.error("Error checking organization access:", error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error("Error checking organization access:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get organization details if user has access
   * Uses the safe view for querying
   */
  const getAccessibleOrganization = async (organizationId: string) => {
    if (!user) return null;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_accessible_organizations")
        .select("*")
        .eq("id", organizationId)
        .single();

      if (error) {
        console.error("Error fetching organization:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error fetching organization:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Quick local check for organization access (no database call)
   */
  const hasLocalOrganizationAccess = (organizationId: string): boolean => {
    if (!user) return false;
    return user.organizations.some(
      (org) => org.organizationId === organizationId
    );
  };

  return {
    canAccessOrganization,
    getAccessibleOrganization,
    hasLocalOrganizationAccess,
    isLoading,
  };
}
