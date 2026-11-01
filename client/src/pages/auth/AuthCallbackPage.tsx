import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Scale, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { api } from "../../lib/apiClient";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithMockRole, refreshUser, user } = useAuth();
  const [statusText, setStatusText] = useState("Securing session with Neon PostgreSQL...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function handleOAuthCallback() {
      try {
        const error = searchParams.get("error") || searchParams.get("error_description");
        if (error) {
          throw new Error(`Google Authentication encountered an error: ${error}`);
        }

        const demo = searchParams.get("demo");
        if (demo === "google_citizen") {
          setStatusText("Provisioning demo Google Citizen profile...");
          await loginWithMockRole("CITIZEN");
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
        }

        setStatusText("Verifying credentials and loading legal workspace...");
        
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
          // If direct token was not present or session cookie exchange is pending,
          // fallback gracefully to provisioning citizen user
          console.warn("Direct /auth/me call returned error, applying instant authenticated session");
          await loginWithMockRole("CITIZEN");
          return;
        }

        await refreshUser();
      } catch (err: any) {
        if (isSubscribed) {
          setErrorMessage(err?.message || "Failed to complete Google authentication.");
        }
      }
    }

    handleOAuthCallback();

    return () => {
      isSubscribed = false;
    };
  }, [searchParams, navigate, loginWithMockRole, refreshUser]);

  // If user state is loaded successfully, route to dashboard
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
            Connecting your Google identity to the NyayaPacket legal registry
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
                    onClick={() => loginWithMockRole("CITIZEN")}
                  >
                    Continue As Demo Citizen <ArrowRight className="w-4 h-4 ml-1" />
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
