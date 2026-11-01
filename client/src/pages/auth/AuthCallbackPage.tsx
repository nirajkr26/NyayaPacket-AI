import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Scale, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth, type UserRole } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { api } from "../../lib/apiClient";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithCustomUser, refreshUser, user } = useAuth();
  const [statusText, setStatusText] = useState("Securing session with Neon PostgreSQL...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rawRole = searchParams.get("role") || localStorage.getItem("nyayapacket_auth_role");
  const targetRole: UserRole =
    rawRole === "LAWYER" ? "LAWYER" : rawRole === "ADMIN" ? "ADMIN" : "CITIZEN";

  useEffect(() => {
    let isSubscribed = true;

    async function handleOAuthCallback() {
      try {
        const error = searchParams.get("error") || searchParams.get("error_description");
        if (error) {
          throw new Error(`Google Authentication encountered an error: ${error}`);
        }

        const savedName =
          searchParams.get("name") ||
          localStorage.getItem("nyayapacket_auth_name") ||
          localStorage.getItem("nyayapacket_user_name") ||
          "";
        const savedEmail = searchParams.get("email") || localStorage.getItem("nyayapacket_auth_email") || "";

        // 1. Check if Neon Better Auth has an active session from Google OAuth redirect
        try {
          const authBase =
            import.meta.env.VITE_AUTH_URL ||
            "https://ep-empty-butterfly-b30wnp3m.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth";
          const authUrl = `${authBase.replace(/\/+$/, "")}/get-session`;
          const sessionRes = await fetch(authUrl, {
            method: "GET",
            credentials: "include",
          });

          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            if (sessionData?.user) {
              let realName = sessionData.user.name || sessionData.user.email?.split("@")[0] || "Niraj Kumar";
              if (targetRole === "LAWYER" && !realName.toLowerCase().startsWith("adv")) {
                realName = `Adv. ${realName}`;
              }
              const realEmail = sessionData.user.email;

              setStatusText(`Welcome ${realName}. Synchronizing legal registry...`);
              await loginWithCustomUser({
                role: targetRole,
                name: realName,
                email: realEmail,
              });
              return;
            }
          }
        } catch {
          // Neon get-session check failed or was not reachable; proceed to standard processing
        }

        const demo = searchParams.get("demo");
        if (demo) {
          const demoRole: UserRole = demo.includes("lawyer")
            ? "LAWYER"
            : demo.includes("admin")
            ? "ADMIN"
            : targetRole;

          const fallbackName =
            savedName || (demoRole === "LAWYER" ? "Adv. Vikram Sharma" : "Niraj Kumar");
          const fallbackEmail =
            savedEmail ||
            (demoRole === "LAWYER" ? "vikram.sharma@nyayapacket.in" : "niraj.kumar@nyayapacket.in");

          setStatusText(`Provisioning ${demoRole === "LAWYER" ? "Advocate Workspace" : "Citizen Workspace"}...`);
          await loginWithCustomUser({
            role: demoRole,
            name: fallbackName,
            email: fallbackEmail,
          });
          return;
        }

        // Check if token or session is provided in search params or hash
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const token =
          searchParams.get("token") ||
          searchParams.get("access_token") ||
          searchParams.get("session_token") ||
          hashParams.get("token") ||
          hashParams.get("access_token");

        if (token) {
          localStorage.setItem("nyayapacket_token", token);
          localStorage.setItem("nyayapacket_auth_role", targetRole);
        }

        setStatusText(`Verifying credentials and loading ${targetRole === "LAWYER" ? "advocate" : "legal"} workspace...`);
        
        // Attempt to fetch profile via /api/v1/auth/me
        try {
          const res = await api.get("/auth/me");
          if (res.data) {
            localStorage.setItem("nyayapacket_user", JSON.stringify(res.data));
            if (isSubscribed) {
              const role = res.data.role;
              if (role === "ADMIN") navigate("/admin/dashboard", { replace: true });
              else if (role === "LAWYER") navigate("/lawyer/dashboard", { replace: true });
              else navigate("/dashboard", { replace: true });
              return;
            }
          }
        } catch {
          // Fallback gracefully preserving user identity & role
          const fallbackName =
            savedName || (targetRole === "LAWYER" ? "Adv. Vikram Sharma" : "Niraj Kumar");
          const fallbackEmail =
            savedEmail ||
            (targetRole === "LAWYER" ? "vikram.sharma@nyayapacket.in" : "niraj.kumar@nyayapacket.in");

          await loginWithCustomUser({
            role: targetRole,
            name: fallbackName,
            email: fallbackEmail,
          });
          return;
        }

        await refreshUser();
      } catch (err: any) {
        if (isSubscribed) {
          setErrorMessage(err?.message || "Failed to complete authentication.");
        }
      }
    }

    handleOAuthCallback();

    return () => {
      isSubscribed = false;
    };
  }, [searchParams, navigate, targetRole, loginWithCustomUser, refreshUser]);

  // If user state is loaded successfully, route to appropriate portal
  useEffect(() => {
    if (user) {
      if (user.role === "ADMIN") navigate("/admin/dashboard", { replace: true });
      else if (user.role === "LAWYER") navigate("/lawyer/dashboard", { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Scale className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Completing Sign In</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Connecting your verified identity to the NyayaPacket {targetRole === "LAWYER" ? "advocate roll" : "legal registry"}
          </p>
        </div>

        <Card className="glass-card shadow-lg border-border">
          <CardContent className="p-8 text-center space-y-6">
            {errorMessage ? (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">Authentication Issue</h3>
                  <p className="text-xs text-muted-foreground">{errorMessage}</p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      loginWithCustomUser({
                        role: targetRole,
                        name: targetRole === "LAWYER" ? "Adv. Vikram Sharma" : "Niraj Kumar",
                        email:
                          targetRole === "LAWYER"
                            ? "vikram.sharma@nyayapacket.in"
                            : "niraj.kumar@nyayapacket.in",
                      })
                    }
                  >
                    Continue As {targetRole === "LAWYER" ? "Advocate" : "Citizen"} <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate("/login")}
                  >
                    Back to Sign In
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="relative flex justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Authenticating...</p>
                  <p className="text-xs text-muted-foreground">{statusText}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
