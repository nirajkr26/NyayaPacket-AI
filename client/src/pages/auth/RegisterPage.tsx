import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Scale, Lock, Mail, User, Phone, Briefcase, Award, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useAuth, type UserRole } from "../../context/AuthContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/Tabs";

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

const STATE_BAR_COUNCILS = [
  "Bar Council of Delhi",
  "Bar Council of Maharashtra & Goa",
  "Bar Council of Karnataka",
  "Bar Council of Tamil Nadu & Puducherry",
  "Bar Council of Uttar Pradesh",
  "Bar Council of West Bengal",
  "Bar Council of Punjab & Haryana",
  "Bar Council of Gujarat",
  "Bar Council of Rajasthan",
];

export function RegisterPage() {
  const { loginWithMockRole, loginWithGoogle, isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<UserRole>("CITIZEN");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [barCouncilNumber, setBarCouncilNumber] = useState("");
  const [stateBarCouncil, setStateBarCouncil] = useState(STATE_BAR_COUNCILS[0]);
  const [enrollmentYear, setEnrollmentYear] = useState(new Date().getFullYear().toString());
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err?.message || "Failed to initiate Google Sign Up");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "ADMIN") navigate("/admin/dashboard", { replace: true });
      else if (user.role === "LAWYER") navigate("/lawyer/dashboard", { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    if (selectedRole === "LAWYER" && !barCouncilNumber.trim()) {
      setError("Bar Council Number is required for legal practitioners.");
      return;
    }

    try {
      // In local demo / development, sign up directly through provisioner
      await loginWithMockRole(selectedRole);
    } catch (err: any) {
      setError(err?.message || "Failed to create account");
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Scale className="w-6 h-6" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Your Account</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Join NyayaPacket AI to organize case evidence or offer verified legal counsel
          </p>
        </div>

        {/* Form Card */}
        <Card className="glass-card shadow-lg border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold text-center">Select Account Type</CardTitle>
            <CardDescription className="text-xs text-center">
              Choose your role to configure your verified workspace
            </CardDescription>
            <div className="pt-2">
              <Tabs
                defaultValue={selectedRole}
                onValueChange={(val) => setSelectedRole(val as UserRole)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="CITIZEN" className="gap-2 text-xs">
                    <User className="w-3.5 h-3.5" /> Citizen / Client
                  </TabsTrigger>
                  <TabsTrigger value="LAWYER" className="gap-2 text-xs">
                    <Briefcase className="w-3.5 h-3.5" /> Legal Advocate
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-0">
            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-border hover:bg-accent/10 hover:border-primary/50 text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 shadow-sm transition-all duration-200"
              onClick={handleGoogleSignUp}
              isLoading={isGoogleLoading}
              disabled={isLoading}
            >
              <GoogleIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Sign up with Google</span>
            </Button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-card px-2 text-muted-foreground font-medium tracking-wider">
                  Or register with credentials
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {error}
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  {selectedRole === "LAWYER" ? "Full Legal Name (as on Bar Roll)" : "Full Name"} *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={selectedRole === "LAWYER" ? "Adv. Vikram Sharma" : "Rahul Sharma"}
                    className="pl-9"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Mobile Phone (Optional)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="pl-9"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Secure Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Minimum 8 characters"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Advocate-specific fields */}
              {selectedRole === "LAWYER" && (
                <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Award className="w-4 h-4 text-accent" />
                    <span>Bar Council Verification Details</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Bar Council Enrollment Number *</label>
                    <Input
                      placeholder="e.g. D/1234/2018 or MAH/5678/2015"
                      value={barCouncilNumber}
                      onChange={(e) => setBarCouncilNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">State Bar Council</label>
                      <select
                        aria-label="State Bar Council"
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                        value={stateBarCouncil}
                        onChange={(e) => setStateBarCouncil(e.target.value)}
                      >
                        {STATE_BAR_COUNCILS.map((sbc) => (
                          <option key={sbc} value={sbc}>
                            {sbc}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Enrollment Year</label>
                      <Input
                        type="number"
                        min="1960"
                        max={new Date().getFullYear()}
                        value={enrollmentYear}
                        onChange={(e) => setEnrollmentYear(e.target.value)}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Note: Your profile will undergo certificate review by platform administrators before public
                    listing.
                  </p>
                </div>
              )}

              {/* Benefits list */}
              <div className="text-[11px] text-muted-foreground space-y-1 pt-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Free AI-guided conversational case interview & timeline builder</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Tamper-evident SHA-256 court packet generation</span>
                </div>
              </div>

              <Button
                type="submit"
                variant="default"
                className="w-full font-bold h-10 gap-2 shadow-sm"
                isLoading={isLoading}
              >
                Create Account & Proceed <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-muted-foreground space-y-2">
              <p>
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Sign In
                </Link>
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80 pt-2 border-t border-border/50">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Zero-Trust Architecture • DPDP Act 2023 Compliant</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
