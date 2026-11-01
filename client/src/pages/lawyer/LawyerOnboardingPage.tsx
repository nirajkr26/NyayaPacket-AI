import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UploadCloud,
  FileText,
  Save,
  Check,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";

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

export function LawyerOnboardingPage() {
  const queryClient = useQueryClient();

  const [barCouncilNumber, setBarCouncilNumber] = useState("");
  const [stateBarCouncil, setStateBarCouncil] = useState(STATE_BAR_COUNCILS[0]);
  const [enrollmentYear, setEnrollmentYear] = useState("2018");
  const [experienceYears, setExperienceYears] = useState("6");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [bio, setBio] = useState("");
  const [consultationOnline, setConsultationOnline] = useState(true);
  const [consultationInPerson, setConsultationInPerson] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current lawyer profile
  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ["lawyer-profile-me"],
    queryFn: async () => {
      try {
        const res = await api.get("/lawyers/me/profile");
        return res.data;
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    if (profile) {
      setBarCouncilNumber(profile.barCouncilNumber || "");
      setStateBarCouncil(profile.stateBarCouncil || STATE_BAR_COUNCILS[0]);
      setEnrollmentYear(profile.enrollmentYear?.toString() || "2018");
      setExperienceYears(profile.experienceYears?.toString() || "6");
      setCity(profile.city || "");
      setState(profile.state || "");
      setBio(profile.bio || "");
      setConsultationOnline(profile.consultationOnline ?? true);
      setConsultationInPerson(profile.consultationInPerson ?? false);
    }
  }, [profile]);

  // Save Profile Mutation
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const res = await api.post("/lawyers/me/profile", {
        barCouncilNumber: barCouncilNumber.trim(),
        stateBarCouncil,
        enrollmentYear: parseInt(enrollmentYear, 10),
        experienceYears: parseInt(experienceYears, 10),
        city: city.trim(),
        state: state.trim(),
        bio: bio.trim() || undefined,
        consultationOnline,
        consultationInPerson,
        languages: ["English", "Hindi"],
      });
      return res.data;
    },
    onSuccess: () => {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: ["lawyer-profile-me"] });
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to update advocate profile");
    },
  });

  const verificationStatus = profile?.verificationStatus || "PENDING";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Verification Standing Status Card */}
      <Card className="glass-card border-border">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  verificationStatus === "APPROVED"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : verificationStatus === "REJECTED"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-500/10 text-amber-500"
                }`}
              >
                <Award className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">Bar Council Accreditation Status</h3>
                  {verificationStatus === "APPROVED" ? (
                    <Badge variant="success">Verified & Listed</Badge>
                  ) : verificationStatus === "REJECTED" ? (
                    <Badge variant="destructive">Rejection Review</Badge>
                  ) : (
                    <Badge variant="warning">Verification Pending</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {verificationStatus === "APPROVED"
                    ? "Your Bar credentials have been certified by platform registrars. You are active in the public directory."
                    : verificationStatus === "REJECTED"
                    ? "Your certificate upload was rejected. Please review your credentials and re-upload an official Bar ID."
                    : "Your certificate is currently being reviewed against State Bar Council records."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground">Professional Credentials & Bio</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Provide accurate Bar Council roll registration details to maintain directory listing:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {savedSuccess && (
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" /> Profile updated successfully!
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Bar Council Enrollment Number *</label>
              <Input
                placeholder="e.g. D/1234/2018 or MAH/5678/2015"
                value={barCouncilNumber}
                onChange={(e) => setBarCouncilNumber(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">State Bar Council *</label>
              <select
                aria-label="State Bar Council"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Experience (Years)</label>
              <Input
                type="number"
                min="0"
                max="60"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Primary City</label>
              <Input
                placeholder="e.g. New Delhi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">State</label>
              <Input
                placeholder="e.g. Delhi"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Professional Summary / Bio</label>
            <Textarea
              placeholder="Highlight courtroom experience, key forums (High Court, NCDRC, DRT, NCLT), and advisory expertise..."
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
            <span className="text-xs font-bold text-foreground block">Consultation Preferences</span>
            <div className="flex flex-wrap gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consultationOnline}
                  onChange={(e) => setConsultationOnline(e.target.checked)}
                  className="rounded border-input text-primary"
                />
                <span>Offer Online Video Consultations</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consultationInPerson}
                  onChange={(e) => setConsultationInPerson(e.target.checked)}
                  className="rounded border-input text-primary"
                />
                <span>Offer In-Person Chamber Meetings</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => saveProfileMutation.mutate()}
              isLoading={saveProfileMutation.isPending}
              className="gap-2 font-bold shadow-sm"
            >
              <Save className="w-4 h-4" /> Save Profile Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
