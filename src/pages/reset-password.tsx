import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { AuthError } from "@supabase/supabase-js";

function isSupabaseAuthError(
  error: unknown
): error is AuthError & { code?: string } {
  return error instanceof AuthError;
}

export default function ResetPasswordPage() {
  const { user, updatePassword, isLoading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading || isSubmitting) {
      return; // Wait for auth/submission to complete
    }
    // Supabase redirects here with the user session in the `useAuth` hook
    // after they click the password reset link.
    // If there's no user after loading is complete, they shouldn't be here.
    if (!user) {
      toast.error("Invalid Link", {
        description: "The password reset link is invalid or has expired.",
      });
      navigate("/login");
    }
  }, [user, navigate, isLoading, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(password);
      toast.success("Password Updated", {
        description: "You can now sign in with your new password.",
      });
      navigate("/login");
    } catch (error) {
      console.log("error", error);
      let description = "Could not update password.";
      if (isSupabaseAuthError(error) && error.code === "same_password") {
        console.log("same_password");
        description =
          "Your new password must be different from your old password.";
      } else if (error instanceof Error) {
        description = error.message;
      }

      toast.error("Error updating password", {
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // if (isLoading || !user) {
  //   return (
  //     <div className="flex h-screen items-center justify-center">
  //       Loading...
  //     </div>
  //   );
  // }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md border-white/10 bg-card/90 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Enter a new password for your account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
