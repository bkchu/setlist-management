import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useJoinCodes } from "@/hooks/use-join-codes";
import { useOrganizationAccess } from "@/hooks/use-organization-access";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2Icon,
  BuildingIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface JoinCodeValidation {
  isValid: boolean;
  organizationName?: string;
  organizationId?: string;
  error?: string;
  isExpired?: boolean;
  isUsed?: boolean;
  expiresAt?: string;
  usedAt?: string;
}

export default function JoinOrganization() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const { validateJoinCode, useJoinCode: joinWithCode } = useJoinCodes();
  const { hasLocalOrganizationAccess } = useOrganizationAccess();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [validation, setValidation] = useState<JoinCodeValidation | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [recentlyJoined, setRecentlyJoined] = useState(false);
  const joinCode = searchParams.get("code");
  const [currentCode, setCurrentCode] = useState<string | null>(joinCode);
  const redirectTimeoutRef = useRef<number | null>(null);
  // Track the last code we successfully validated to prevent duplicate requests
  const lastValidatedCodeRef = useRef<string | null>(null);
  const validateInFlightRef = useRef(false);
  // Stabilize validateCode reference to avoid effect churn
  const validateCodeRef = useRef<(code: string) => Promise<void>>(
    async () => {}
  );
  // Accept either a raw code or a full join URL
  const extractCode = (value: string): string => {
    const trimmed = value.trim();
    try {
      const url = new URL(trimmed);
      const param = url.searchParams.get("code");
      return (param || trimmed).trim();
    } catch {
      return trimmed;
    }
  };

  const validateCode = useCallback(
    async (code: string) => {
      setIsValidating(true);
      setCurrentCode(code);
      try {
        const result = await validateJoinCode(code);
        console.log("Result", result);

        if (!result.isValid) {
          setValidation({
            isValid: false,
            error: result.isExpired
              ? `This invite code has expired${
                  result.expiresAt
                    ? ` (expired ${new Date(
                        result.expiresAt
                      ).toLocaleString()})`
                    : "."
                }`
              : result.isUsed
              ? `This invite code has already been used${
                  result.usedAt
                    ? ` (used ${new Date(result.usedAt).toLocaleString()})`
                    : "."
                }`
              : "We couldn’t find this invite code.",
            isExpired: result.isExpired,
            isUsed: result.isUsed,
            expiresAt: result.expiresAt,
            usedAt: result.usedAt,
          });
        } else {
          // Check if user is already in this organization using the new utility
          const isAlreadyMember = result.organizationId
            ? hasLocalOrganizationAccess(result.organizationId)
            : false;

          if (isAlreadyMember) {
            setValidation({
              isValid: false,
              error: "You are already a member of this organization.",
            });
          } else {
            setValidation({
              isValid: true,
              organizationName: result.organizationName,
              organizationId: result.organizationId,
              expiresAt: result.expiresAt,
            });
          }
        }
      } catch (error) {
        console.error("Error validating invite code:", error);
        setValidation({
          isValid: false,
          error: "Failed to validate invite code. Please try again.",
        });
      } finally {
        setIsValidating(false);
      }
    },
    [hasLocalOrganizationAccess, validateJoinCode]
  );

  // Keep a stable reference for validateCode to avoid effect dependency loops
  useEffect(() => {
    validateCodeRef.current = validateCode;
  }, [validateCode]);

  const handleJoinOrganization = async () => {
    if (!currentCode || !validation?.isValid || recentlyJoined) return;

    setIsJoining(true);
    try {
      await joinWithCode(currentCode);
      if (validation.organizationName) {
        try {
          localStorage.setItem(
            "joinSuccessOrgName",
            validation.organizationName
          );
        } catch (e) {
          console.warn("Could not persist success org name", e);
        }
      }
      await refreshUser();
      setRecentlyJoined(true);
      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate("/?joined=1", { replace: true });
      }, 1400);
    } catch (error) {
      console.error("Error joining organization:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to join organization. Please try again."
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleGoToLogin = () => {
    // Store the invite code in localStorage to use after login
    if (joinCode) {
      localStorage.setItem("pendingJoinCode", joinCode);
    }
    navigate("/login");
  };

  const handleCreateAccount = () => {
    // Store the invite code in localStorage to use after registration
    if (joinCode) {
      localStorage.setItem("pendingJoinCode", joinCode);
    }
    navigate("/login?mode=register");
  };

  useEffect(() => {
    // If user is already authenticated and has an organization, redirect to dashboard
    if (user?.organizationId && !authLoading) {
      navigate("/");
      return;
    }

    // If user is authenticated but has no organization, validate the code (once per code)
    if (user && !authLoading && joinCode) {
      if (
        validateInFlightRef.current ||
        lastValidatedCodeRef.current === joinCode
      ) {
        return;
      }
      validateInFlightRef.current = true;
      setIsValidating(true);
      void validateCodeRef.current(joinCode)
        .then(() => {
          lastValidatedCodeRef.current = joinCode;
        })
        .finally(() => {
          validateInFlightRef.current = false;
        });
      return;
    }

    // If no code present, ensure we aren't stuck in validating state
    if (!joinCode) {
      setIsValidating(false);
    }
  }, [user?.id, user?.organizationId, authLoading, joinCode, navigate]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2Icon className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Show login options if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <BuildingIcon className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-3xl font-bold">Join Organization</h1>
            <p className="text-muted-foreground">
              You need to sign in or create an account to join this
              organization.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Sign in to your existing account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleGoToLogin} className="w-full">
                Sign in to join
              </Button>
              <Button
                onClick={handleCreateAccount}
                variant="outline"
                className="w-full"
              >
                Create account to join
              </Button>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Your invite code:{" "}
              <span className="font-mono font-medium">{joinCode}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              We'll keep this invite ready when you sign in.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show validation loading only if we have a code to validate
  if (joinCode && isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2Icon className="h-8 w-8 animate-spin mx-auto" />
          <h2 className="text-xl font-semibold">Validating invite code...</h2>
          <p className="text-muted-foreground">
            Please wait while we verify your invitation.
          </p>
        </div>
      </div>
    );
  }

  // Show validation results
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <BuildingIcon className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-3xl font-bold">Join Organization</h1>
        </div>

        {(joinCode || validation !== null) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {validation?.isValid ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-600" />
                )}
                {validation?.isValid
                  ? "Valid Invitation"
                  : "Invalid Invitation"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {validation?.isValid ? (
                <>
                  {recentlyJoined && (
                    <Alert className="text-left border-green-500/40 bg-green-500/10">
                      <AlertTitle>You're in!</AlertTitle>
                      <AlertDescription>
                        Redirecting you to {validation.organizationName}.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="text-center space-y-3">
                    <Badge
                      variant="outline"
                      className="uppercase tracking-wide text-[0.65rem]"
                    >
                      Single-use invite
                    </Badge>
                    <h2 className="text-2xl font-bold">
                      {validation.organizationName}
                    </h2>
                    {validation.expiresAt && (
                      <p className="text-xs text-muted-foreground">
                        Invite expires{" "}
                        {new Date(validation.expiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium text-left">
                      What happens next?
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 text-left">
                      <li>• You'll become a member of this organization</li>
                      <li>• You'll have access to shared songs and setlists</li>
                      <li>• You can collaborate with other team members</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleJoinOrganization}
                    disabled={isJoining || recentlyJoined}
                    className="w-full gap-2"
                  >
                    {recentlyJoined ? (
                      <>
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : isJoining ? (
                      <>
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                        Joining organization...
                      </>
                    ) : (
                      <>
                        Join {validation.organizationName}
                        <ArrowRightIcon className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Alert variant="destructive" className="text-left">
                    <AlertTitle>Cannot Join Organization</AlertTitle>
                    <AlertDescription>{validation?.error}</AlertDescription>
                  </Alert>
                  <p className="text-xs text-muted-foreground">
                    If you believe this is a mistake, contact the organization
                    owner to request a fresh invite link.
                  </p>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter another invite code"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (!manualCode.trim()) return;
                          setValidation(null);
                          setIsValidating(true);
                          validateCode(manualCode.trim());
                        }}
                      >
                        Check Code
                      </Button>
                    </div>
                    <Button
                      onClick={() => navigate("/onboarding")}
                      className="w-full"
                    >
                      Go to Onboarding
                    </Button>
                    <Button
                      onClick={() => navigate("/")}
                      variant="outline"
                      className="w-full"
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {joinCode && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Invite code:{" "}
              <span className="font-mono font-medium">{joinCode}</span>
            </p>
          </div>
        )}

        {!joinCode && (
          <Card>
            <CardHeader>
              <CardTitle>Have an invite link or code?</CardTitle>
              <CardDescription>Paste it below to validate.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste code or link"
                  autoFocus
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const parsed = extractCode(manualCode);
                      if (!parsed) return;
                      setValidation(null);
                      setIsValidating(true);
                      validateCode(parsed);
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    const parsed = extractCode(manualCode);
                    if (!parsed) return;
                    setValidation(null);
                    setIsValidating(true);
                    validateCode(parsed);
                  }}
                >
                  {isValidating ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                      Validating
                    </span>
                  ) : (
                    "Validate"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
