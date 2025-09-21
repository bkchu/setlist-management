import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { organizationKeys } from "@/api/organizations/keys";

export interface UserAccessibleOrganizationRow {
  id: string;
  name: string;
  owner_id: string | null;
  role: "owner" | "admin" | "member";
  created_at: string | null;
}

export function useUserOrganizations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: organizationKeys.list(user?.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 2,
    queryFn: async (): Promise<UserAccessibleOrganizationRow[]> => {
      const { data, error } = await supabase
        .from("user_accessible_organizations")
        .select("id, name, owner_id, role, created_at");
      if (error) throw error;
      return (data as UserAccessibleOrganizationRow[]) ?? [];
    },
  });
}
