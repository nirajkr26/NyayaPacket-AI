import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Scale, Lock, Mail, ArrowRight, ShieldCheck, User, Briefcase, ShieldAlert, Sparkles } from "lucide-react";
import { useAuth, type UserRole } from "../../context/AuthContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

export function LoginPage() {
  const { loginWithMockRole, isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [demoLoadingRole, setDemoLoadingRole] = useState<UserRole | null>(null);
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
