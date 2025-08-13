import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ValidateJoinCodeResult } from "@/lib/rpc-types";

export interface JoinCode {
  id: string;
  organizationId: string;
  code: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  usedBy?: string;
}

export interface CreateJoinCodeData {
  organizationId: string;
  expiresInHours?: number; // defaults to 24 hours
}

export interface UseJoinCodesResult {
  joinCodes: JoinCode[];
  isLoading: boolean;
  error: string | null;
  generateJoinCode: (data: CreateJoinCodeData) => Promise<JoinCode>;
  revokeJoinCode: (codeId: string) => Promise<void>;
  validateJoinCode: (code: string) => Promise<{
    isValid: boolean;
    organizationName?: string;
    organizationId?: string;
  }>;
  useJoinCode: (code: string) => Promise<void>;
  refreshJoinCodes: () => Promise<void>;
}

export function useJoinCodes(): UseJoinCodesResult {
  const { user } = useAuth();
  const [joinCodes, setJoinCodes] = useState<JoinCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJoinCodes = async () => {
    if (!user?.organizationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("join_codes")
        .select(
          `
          id,
          organization_id,
          code,
          created_by,
          created_at,
          expires_at,
          used_at,
          used_by
        `
        )
        .eq("organization_id", user.organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedCodes: JoinCode[] = (data || []).map((code) => ({
        id: code.id,
        organizationId: code.organization_id,
        code: code.code,
        createdBy: code.created_by,
        createdAt: code.created_at || new Date().toISOString(),
        expiresAt: code.expires_at,
        usedAt: code.used_at || undefined,
        usedBy: code.used_by || undefined,
      }));

      setJoinCodes(formattedCodes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch join codes"
      );
      console.error("Error fetching join codes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateJoinCode = async (
    data: CreateJoinCodeData
  ): Promise<JoinCode> => {
    if (!user) throw new Error("User not authenticated");

    // Check if user is owner of the organization
    const userOrg = user.organizations.find(
      (org) => org.organizationId === data.organizationId
    );
    if (!userOrg || userOrg.role !== "owner") {
      throw new Error("Only organization owners can generate join codes");
    }

    // Additional server-side validation using our safe function
    const { data: hasAccess, error: accessError } = await supabase.rpc(
      "user_can_access_organization",
      { org_id: data.organizationId }
    );

    if (accessError || !hasAccess) {
      throw new Error(
        "Access denied: Cannot generate join codes for this organization"
      );
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate the code using the database function
      const { data: codeResult, error: codeError } = await supabase.rpc(
        "generate_join_code"
      );

      if (codeError) throw codeError;

      // Calculate expiration time (default 24 hours)
      const expiresInHours = data.expiresInHours || 24;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      // Insert the join code
      const { data: joinCode, error: insertError } = await supabase
        .from("join_codes")
        .insert({
          organization_id: data.organizationId,
          code: codeResult,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
        })
        .select(
          `
          id,
          organization_id,
          code,
          created_by,
          created_at,
          expires_at,
          used_at,
          used_by
        `
        )
        .single();

      if (insertError) throw insertError;

      const newJoinCode: JoinCode = {
        id: joinCode.id,
        organizationId: joinCode.organization_id,
        code: joinCode.code,
        createdBy: joinCode.created_by,
        createdAt: joinCode.created_at || new Date().toISOString(),
        expiresAt: joinCode.expires_at,
        usedAt: joinCode.used_at || undefined,
        usedBy: joinCode.used_by || undefined,
      };

      // Add to local state
      setJoinCodes((prev) => [newJoinCode, ...prev]);

      return newJoinCode;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate join code";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const revokeJoinCode = async (codeId: string): Promise<void> => {
    if (!user) throw new Error("User not authenticated");

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("join_codes")
        .delete()
        .eq("id", codeId);

      if (error) throw error;

      // Remove from local state
      setJoinCodes((prev) => prev.filter((code) => code.id !== codeId));

      toast.success("Join code revoked successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to revoke join code";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const validateJoinCode = async (
    code: string
  ): Promise<{
    isValid: boolean;
    organizationName?: string;
    organizationId?: string;
  }> => {
    try {
      // Properly typed RPC call - TypeScript knows the args and return types
      const { data, error } = await supabase.rpc("validate_join_code_info", {
        join_code_param: code, // Type: ValidateJoinCodeRPC['args']['join_code_param']
      });

      console.log("validateJoinCode", { data, error });

      if (error) {
        console.error("Error validating join code:", error);
        return { isValid: false };
      }

      // The function returns a JSON object, so we need to cast it to our expected type
      if (!data) {
        return { isValid: false };
      }

      // Type assertion based on what our database function actually returns
      // First cast to unknown, then to our expected type for safety
      const result = data as unknown as ValidateJoinCodeResult;

      return {
        isValid: result.isValid,
        organizationName: result.organizationName,
        organizationId: result.organizationId,
      };
    } catch (err) {
      console.error("Error validating join code:", err);
      return { isValid: false };
    }
  };

  const useJoinCode = async (code: string): Promise<void> => {
    if (!user) throw new Error("User not authenticated");

    console.log("Using join code", code);
    try {
      // First validate the code and get organization info
      const validation = await validateJoinCode(code);

      console.log("validation", validation);
      if (!validation.isValid || !validation.organizationId) {
        throw new Error("Invalid or expired join code");
      }

      // Check if user is already in this organization
      const isAlreadyMember = user.organizations.some(
        (org) => org.organizationId === validation.organizationId
      );

      if (isAlreadyMember) {
        throw new Error("You are already a member of this organization");
      }

      // Add user to the organization
      const { error: memberError } = await supabase
        .from("user_organizations")
        .insert({
          user_id: user.id,
          organization_id: validation.organizationId,
          role: "member",
        });

      if (memberError) throw memberError;

      // Mark the join code as used
      const { error: updateError } = await supabase
        .from("join_codes")
        .update({
          used_at: new Date().toISOString(),
          used_by: user.id,
        })
        .eq("code", code.toUpperCase());

      if (updateError) throw updateError;

      // Trigger a page reload to refresh the user's auth state
      // This ensures the user gets the updated organization data
      toast.success(`Successfully joined ${validation.organizationName}!`);

      // Use a small delay to let the toast show, then reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to use join code";
      throw new Error(errorMessage);
    }
  };

  const refreshJoinCodes = async (): Promise<void> => {
    await fetchJoinCodes();
  };

  // Load join codes when user or organization changes
  useEffect(() => {
    if (user?.organizationId) {
      fetchJoinCodes();
    }
  }, [user?.organizationId]);

  return {
    joinCodes,
    isLoading,
    error,
    generateJoinCode,
    revokeJoinCode,
    validateJoinCode,
    useJoinCode,
    refreshJoinCodes,
  };
}

// Utility function to get the full join URL
export function getJoinUrl(code: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/join?code=${code}`;
}
