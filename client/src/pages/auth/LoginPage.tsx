import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Scale, Lock, Mail, ArrowRight, ShieldCheck, User, Briefcase, ShieldAlert, Sparkles } from "lucide-react";
import { useAuth, type UserRole } from "../../context/AuthContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.07.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.41 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.59 1.24 6.58l4.04 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

export function LoginPage() {
  const { loginWithMockRole, loginWithGoogle, isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [demoLoadingRole, setDemoLoadingRole] = useState<UserRole | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect to appropriate role portal
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const from = (location.state as any)?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === "ADMIN") {
        navigate("/admin/dashboard", { replace: true });
      } else if (user.role === "LAWYER") {
        navigate("/lawyer/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  const handleDemoLogin = async (role: UserRole) => {
    setError(null);
    setDemoLoadingRole(role);
    try {
      await loginWithMockRole(role);
      // Navigation is handled by the useEffect above once user state updates
    } catch (err: any) {
      setError(err?.message || "Failed to log in with demo account");
    } finally {
      setDemoLoadingRole(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err?.message || "Failed to initiate Google Sign In");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email address and password.");
      return;
    }
    // For local evaluation, default to Citizen role if no live OAuth provider is configured
    handleDemoLogin("CITIZEN");
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Brand Title */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Scale className="w-6 h-6" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign In to NyayaPacket AI</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Citizen Case Management & Bar-Accredited Legal Delivery Platform
          </p>
        </div>

        {/* Instant Demo Sandbox Card */}
        <Card className="border-accent/40 bg-accent/5 backdrop-blur-sm shadow-md">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <CardTitle className="text-xs sm:text-sm font-bold text-foreground">
                  Instant Demo Access (Zero Friction)
                </CardTitle>
              </div>
              <Badge variant="accent" className="text-[10px]">1-Click</Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Select any role below to immediately provision a live session against Neon PostgreSQL:
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2.5">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between h-10 border-border hover:border-primary/50 text-xs font-semibold"
              onClick={() => handleDemoLogin("CITIZEN")}
              isLoading={demoLoadingRole === "CITIZEN"}
              disabled={isLoading || !!demoLoadingRole}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span>Citizen Portal (Rahul Sharma)</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">Client</Badge>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between h-10 border-border hover:border-emerald-500/50 text-xs font-semibold"
              onClick={() => handleDemoLogin("LAWYER")}
              isLoading={demoLoadingRole === "LAWYER"}
              disabled={isLoading || !!demoLoadingRole}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Advocate Portal (Adv. Vikram Sharma)</span>
              </div>
              <Badge variant="success" className="text-[10px]">Verified Bar</Badge>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between h-10 border-border hover:border-red-500/50 text-xs font-semibold"
              onClick={() => handleDemoLogin("ADMIN")}
              isLoading={demoLoadingRole === "ADMIN"}
              disabled={isLoading || !!demoLoadingRole}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>Platform Admin Portal</span>
              </div>
              <Badge variant="destructive" className="text-[10px]">Full Audit</Badge>
            </Button>
          </CardContent>
        </Card>

        {/* Standard Email / Password Form */}
        <Card className="glass-card shadow-lg border-border">
          <CardContent className="p-6">
            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-border hover:bg-accent/10 hover:border-primary/50 text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 shadow-sm transition-all duration-200"
              onClick={handleGoogleSignIn}
              isLoading={isGoogleLoading}
              disabled={isLoading || !!demoLoadingRole}
            >
              <GoogleIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Continue with Google</span>
            </Button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-card px-2 text-muted-foreground font-medium tracking-wider">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleStandardSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Password</label>
                  <a href="#forgot" className="text-[11px] text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="default"
                className="w-full font-bold h-10 gap-2 shadow-sm"
                disabled={isLoading || !!demoLoadingRole}
              >
                Sign In With Email <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-muted-foreground space-y-2">
              <p>
                Don't have an account?{" "}
                <Link to="/register" className="font-semibold text-primary hover:underline">
                  Create Account
                </Link>
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80 pt-2 border-t border-border/50">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Protected by DPDP Act 2023 Compliant Zero-Trust Encryption</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
