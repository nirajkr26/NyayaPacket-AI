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

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loginWithMockRole: (role: UserRole) => Promise<void>;
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
  const loginWithMockRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const ts = Date.now().toString().slice(-4);
      const sub = `demo_${role.toLowerCase()}_${ts}`;
      const email = `demo.${role.toLowerCase()}.${ts}@nyayapacket.in`;
      const name =
        role === "ADMIN"
          ? "Demo Administrator"
          : role === "LAWYER"
          ? "Adv. Vikram Sharma"
          : "Rahul Citizen";

      const toBase64Url = (str: string) =>
        btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

      // Base64url token accepted by test & development verifier
      const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = toBase64Url(
        JSON.stringify({
          sub,
          email,
          name,
          role,
          metadata: { role },
          exp: Math.floor(Date.now() / 1000) + 86400 * 7,
        })
      );
      const demoToken = `${header}.${payload}.mock_signature`;

      localStorage.setItem("nyayapacket_token", demoToken);
      setToken(demoToken);

      // Call /api/v1/auth/me to provision user in Neon PostgreSQL
      const res = await api.get<User>("/auth/me");
      if (res.data) {
        setUser(res.data);
        localStorage.setItem("nyayapacket_user", JSON.stringify(res.data));
      }
    } catch (err: any) {
      console.error("Failed demo login:", err);
      logout();
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
