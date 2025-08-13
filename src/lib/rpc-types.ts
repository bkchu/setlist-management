import { Database } from "@/types/supabase";

// Type-safe wrapper for RPC calls
export type RPCFunctions = Database["public"]["Functions"];

// Define the return type for validate_join_code_info based on our migration
export interface ValidateJoinCodeResult {
  isValid: boolean;
  organizationId?: string;
  organizationName?: string;
  expiresAt?: string;
  usedAt?: string;
  usedBy?: string;
  isExpired?: boolean;
  isUsed?: boolean;
}

// Type-safe RPC call helper
export type RPCCall<T extends keyof RPCFunctions> = {
  args: RPCFunctions[T]["Args"];
  returns: RPCFunctions[T]["Returns"];
};

// Specific types for each RPC function
export type ValidateJoinCodeRPC = RPCCall<"validate_join_code_info">;
export type GenerateJoinCodeRPC = RPCCall<"generate_join_code">;
export type CleanupExpiredJoinCodesRPC = RPCCall<"cleanup_expired_join_codes">;
