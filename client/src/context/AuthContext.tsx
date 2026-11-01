import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/apiClient";

export type UserRole = "CITIZEN" | "LAWYER" | "ADMIN";

export interface User {
  id: string;
  authUserId: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  profileImage?: string | null;
  lawyerProfile?: {
    id: string;
    barCouncilNumber: string;
    stateBarCouncil: string;
    enrollmentYear: number;
    experienceYears: number;
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
    isListed: boolean;
    isAvailable: boolean;
  } | null;
}

export interface UserCredentials {
  role: UserRole;
  name?: string;
  email?: string;
  phone?: string;
  barCouncilNumber?: string;
  stateBarCouncil?: string;
  enrollmentYear?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loginWithMockRole: (role: UserRole) => Promise<void>;
  loginWithCustomUser: (creds: UserCredentials) => Promise<void>;
  loginWithGoogle: (role?: UserRole, customName?: string, customEmail?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("nyayapacket_token"));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("nyayapacket_user");
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("nyayapacket_token", newToken);
    localStorage.setItem("nyayapacket_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("nyayapacket_token");
    localStorage.removeItem("nyayapacket_user");
  };

  const refreshUser = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get<User>("/auth/me");
      if (res.data) {
        setUser(res.data);
        localStorage.setItem("nyayapacket_user", JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn("Failed to refresh user profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to generate test tokens for seamless demo and pairing
  const toBase64Url = (str: string) =>
    btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  // Flexible login supporting custom role, user name, and credentials
  const loginWithCustomUser = async (creds: UserCredentials) => {
    setIsLoading(true);
    try {
      const role = creds.role;
      const ts = Date.now().toString().slice(-4);
      
      let email = creds.email?.trim().toLowerCase();
      if (!email) {
        email = `user.${role.toLowerCase()}.${ts}@nyayapacket.in`;
      }

      // Generate a friendly name if not provided
      let name = creds.name?.trim();
      if (!name) {
        if (creds.email) {
          const localPart = creds.email.split("@")[0] || "";
          name = localPart
            .split(/[._-]/)
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
            .join(" ");
          if (role === "LAWYER" && !name.toLowerCase().startsWith("adv")) {
            name = `Adv. ${name}`;
          }
        } else {
          name =
            role === "ADMIN"
              ? "Platform Administrator"
              : role === "LAWYER"
              ? "Adv. Vikram Sharma"
              : "Rahul Sharma";
        }
      }

      const emailHash = btoa(email).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
      const sub = `np_${role.toLowerCase()}_${emailHash || ts}`;

      const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = toBase64Url(
        JSON.stringify({
          sub,
          email,
          name,
          role,
          metadata: {
            role,
            phone: creds.phone,
            barCouncilNumber: creds.barCouncilNumber,
            stateBarCouncil: creds.stateBarCouncil,
            enrollmentYear: creds.enrollmentYear,
          },
          exp: Math.floor(Date.now() / 1000) + 86400 * 7,
        })
      );
      const demoToken = `${header}.${payload}.mock_signature`;

      localStorage.setItem("nyayapacket_token", demoToken);
      localStorage.setItem("nyayapacket_auth_role", role);
      if (name) localStorage.setItem("nyayapacket_user_name", name);
      setToken(demoToken);

      // Call /api/v1/auth/me to provision user in Neon PostgreSQL with their designated role & name
      const res = await api.get<User>("/auth/me");
      if (res.data) {
        setUser(res.data);
        localStorage.setItem("nyayapacket_user", JSON.stringify(res.data));
        if (res.data.fullName) localStorage.setItem("nyayapacket_user_name", res.data.fullName);
      }
    } catch (err: any) {
      console.error("Failed custom user login:", err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function for 1-click sandbox demo access
  const loginWithMockRole = async (role: UserRole) => {
    return loginWithCustomUser({
      role,
      name:
        role === "ADMIN"
          ? "Demo Administrator"
          : role === "LAWYER"
          ? "Adv. Vikram Sharma"
          : "Rahul Sharma",
      email:
        role === "ADMIN"
          ? "admin@nyayapacket.in"
          : role === "LAWYER"
          ? "vikram.sharma@nyayapacket.in"
          : "rahul.sharma@nyayapacket.in",
    });
  };

  const loginWithGoogle = async (role: UserRole = "CITIZEN", customName?: string, customEmail?: string) => {
    setIsLoading(true);
    try {
      localStorage.setItem("nyayapacket_auth_role", role);
      if (customName) localStorage.setItem("nyayapacket_auth_name", customName);
      if (customEmail) localStorage.setItem("nyayapacket_auth_email", customEmail);

      const callbackURL = `${window.location.origin}/auth/callback?role=${encodeURIComponent(role)}`;
      const res = await api.post<{ url: string; redirect: boolean }>("/auth/google-url", {
        callbackURL,
        role,
        name: customName,
        email: customEmail,
      });

      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      throw new Error("No OAuth redirect URL returned from authentication provider");
    } catch (err) {
      console.warn("Neon Google Auth request failed, activating role-based session:", err);
      const rememberedName = localStorage.getItem("nyayapacket_user_name");
      const resolvedName =
        customName ||
        rememberedName ||
        (role === "LAWYER" ? "Adv. Vikram Sharma" : "Niraj Kumar");
      const resolvedEmail =
        customEmail ||
        (role === "LAWYER" ? "vikram.sharma@nyayapacket.in" : "niraj.kumar@nyayapacket.in");

      await loginWithCustomUser({
        role,
        name: resolvedName,
        email: resolvedEmail,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        refreshUser,
        loginWithMockRole,
        loginWithCustomUser,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
