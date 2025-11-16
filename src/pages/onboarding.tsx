import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2Icon, UsersIcon, Loader2Icon } from "lucide-react";
import { useSearchParams } from "react-router-dom";

type OnboardingChoice = "create" | "join" | null;

export default function Onboarding() {
  const { createOrganization, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [choice, setChoice] = useState<OnboardingChoice>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const code = searchParams.get("code");

  // If user already has an organization, redirect to dashboard
  if (user?.organizationId) {
    navigate("/");
    return null;
  }

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationName.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setIsCreating(true);
    try {
      await createOrganization(organizationName);
      toast.success("Organization created successfully!");
      navigate("/");
    } catch (error) {
      console.error("Failed to create organization:", error);
      toast.error("Failed to create organization");
    } finally {
      setIsCreating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to Setlify!</h1>
          <p className="text-muted-foreground">
            Let's get you set up with an organization to manage your setlists
            and songs.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Choose how you'd like to get started with Setlify
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={choice || ""}
              onValueChange={(value) => setChoice(value as OnboardingChoice)}
            >
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="create" id="create" className="mt-1" />
                  <Label htmlFor="create" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2Icon className="h-4 w-4" />
                      <span className="font-medium">
                        Create a new organization
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Start fresh with your own organization and invite team
                      members later
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="join" id="join" className="mt-1" />
                  <Label htmlFor="join" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <UsersIcon className="h-4 w-4" />
                      <span className="font-medium">
                        Join an existing organization
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You'll need an invite link from an organization admin
                    </p>
                  </Label>
                </div>
              </div>
            </RadioGroup>

            {choice === "create" && (
              <form
                onSubmit={handleCreateOrganization}
                className="space-y-4 pt-4 border-t"
              >
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Enter your organization name"
                    required
                    disabled={isCreating}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Creating Organization...
                    </>
                  ) : (
                    "Create Organization"
                  )}
                </Button>
              </form>
            )}

            {choice === "join" && (
              <div className="pt-4 border-t space-y-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <UsersIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <h3 className="font-medium mb-1">Need an invite link?</h3>
                  <p className="text-sm text-muted-foreground">
                    Ask an org admin to send you their invite link (a single-use
                    join code). You'll land on the right page as soon as you
                    click it.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Invite links look like: setlify.app/join?code=ABC123
                </p>
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigate(code ? `/join?code=${code}` : "/join")
                    }
                  >
                    I already have an invite code
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
