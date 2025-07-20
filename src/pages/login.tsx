import { useState, useEffect } from "react";
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
import { ChromeIcon, GithubIcon, Music2Icon } from "lucide-react";

type Mode = "login" | "register" | "forgotPassword";

export default function Login() {
  const {
    login,
    register,
    isLoading,
    signInWithProvider,
    sendPasswordResetEmail,
    user,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Redirect authenticated users away from login page
  useEffect(() => {
    if (!isLoading && user) {
      if (user.organizationId) {
        navigate("/", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (mode === "login") {
        await login(formData.email, formData.password);
        // Navigation will be handled automatically by the auth state change
      } else if (mode === "register") {
        await register(formData.name, formData.email, formData.password);
        toast.success("Account Created", {
          description: "Please check your email to verify your account.",
        });
        setMode("login"); // Switch to login mode after registration
      } else if (mode === "forgotPassword") {
        await sendPasswordResetEmail(formData.email);
        toast.success("Password Reset Email Sent", {
          description: "Check your email for a link to reset your password.",
        });
        setMode("login");
      }
    } catch (error) {
      toast.error("Authentication error", {
        description:
          error instanceof Error ? error.message : "Failed to authenticate",
      });
    }
  };

  const isLoginMode = mode === "login";
  const isRegisterMode = mode === "register";
  const isForgotPasswordMode = mode === "forgotPassword";

  const getTitle = () => {
    if (isLoginMode) return "Sign in to your account";
    if (isRegisterMode) return "Create a new account";
    if (isForgotPasswordMode) return "Reset your password";
    return "";
  };

  const getDescription = () => {
    if (isLoginMode) return "Manage your worship setlists";
    if (isRegisterMode) return "Get started with the best setlist manager";
    if (isForgotPasswordMode)
      return "We'll send you a link to reset your password";
    return "";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Music2Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {isRegisterMode && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  required={isRegisterMode}
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            )}
            {(isLoginMode || isRegisterMode || isForgotPasswordMode) && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            )}
            {(isLoginMode || isRegisterMode) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {isLoginMode && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      type="button"
                      onClick={() => setMode("forgotPassword")}
                    >
                      Forgot password?
                    </Button>
                  )}
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required={isLoginMode || isRegisterMode}
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                />
                {isRegisterMode && (
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters
                  </p>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full" disabled={isLoading} type="submit">
              {isLoading && "Please wait..."}
              {!isLoading && isLoginMode && "Sign In"}
              {!isLoading && isRegisterMode && "Create Account"}
              {!isLoading && isForgotPasswordMode && "Send Reset Link"}
            </Button>
            {!isForgotPasswordMode && (
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
            )}
            {!isForgotPasswordMode && (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => signInWithProvider("google")}
                  disabled={isLoading}
                >
                  <ChromeIcon className="mr-2 h-4 w-4" /> Google
                </Button>
                <Button
                  variant="outline"
                  onClick={() => signInWithProvider("github")}
                  disabled={isLoading}
                >
                  <GithubIcon className="mr-2 h-4 w-4" /> GitHub
                </Button>
              </div>
            )}
            <Button
              variant="link"
              className="w-full"
              type="button"
              onClick={() => setMode(isLoginMode ? "register" : "login")}
            >
              {isLoginMode
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
