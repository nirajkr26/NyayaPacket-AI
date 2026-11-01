import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Search,
  MapPin,
  Award,
  Globe,
  Briefcase,
  CheckCircle2,
  Calendar,
  Filter,
  X,
  Scale,
  Video,
  UserCheck,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card, CardContent } from "../../components/ui/Card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/Dialog";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../context/AuthContext";

export interface LawyerPublicProfile {
  id: string;
  userId: string;
  barCouncilNumber: string;
  stateBarCouncil: string;
  enrollmentYear: number;
  experienceYears: number;
  city: string;
  state: string;
  bio?: string | null;
  languages: string[];
  consultationOnline: boolean;
  consultationInPerson: boolean;
  user: {
    id: string;
    fullName: string;
    profileImage?: string | null;
  };
  practiceAreas?: Array<{
    practiceArea: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

const COMMON_PRACTICE_AREAS = [
  "All",
  "Consumer Protection",
  "Criminal Law",
  "Cyber Crime & IT",
  "Property & Real Estate",
  "Family & Matrimonial",
  "Labour & Employment",
  "Constitutional",
  "Commercial Contracts",
];

const POPULAR_CITIES = ["All Cities", "New Delhi", "Mumbai", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Pune"];

export function LawyerDirectoryPage() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("All Cities");
  const [selectedPracticeArea, setSelectedPracticeArea] = useState("All");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [activeLawyer, setActiveLawyer] = useState<LawyerPublicProfile | null>(null);

  const queryParams = new URLSearchParams();
  if (search.trim()) queryParams.set("search", search.trim());
  if (selectedCity !== "All Cities") queryParams.set("city", selectedCity);
  if (selectedPracticeArea !== "All") queryParams.set("practiceArea", selectedPracticeArea);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-lawyers", search, selectedCity, selectedPracticeArea],
    queryFn: async () => {
      const res = await api.get<LawyerPublicProfile[]>(`/lawyers?${queryParams.toString()}`);
      return res.data || [];
    },
    staleTime: 60 * 1000,
  });

  const lawyers = (data || []).filter((l) => {
    if (onlineOnly && !l.consultationOnline) return false;
    return true;
  });

  const resetFilters = () => {
    setSearch("");
    setSelectedCity("All Cities");
    setSelectedPracticeArea("All");
    setOnlineOnly(false);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden p-8 sm:p-10 border border-border bg-gradient-to-br from-primary/10 via-background to-accent/5">
        <div className="max-w-3xl space-y-3">
          <Badge variant="accent" className="font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Bar Council Verified Directory
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Find Top Legal Advocates in India
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Connect with verified, Bar Council accredited advocates across all High Courts and District Forums.
            Share court-ready evidence packets securely with zero disclosure of private data until scheduled.
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <Card className="glass-card shadow-sm border-border">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search advocate name, keywords, or bio..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <select
                aria-label="Filter by City"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                {POPULAR_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                aria-label="Filter by Practice Area"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedPracticeArea}
                onChange={(e) => setSelectedPracticeArea(e.target.value)}
              >
                {COMMON_PRACTICE_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1 flex items-center justify-center">
              <Button
                variant={onlineOnly ? "default" : "outline"}
                size="sm"
                className="w-full h-10 text-xs px-2 flex items-center justify-center gap-1"
                onClick={() => setOnlineOnly(!onlineOnly)}
                title="Toggle Online Consultation"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Online</span>
              </Button>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(search || selectedCity !== "All Cities" || selectedPracticeArea !== "All" || onlineOnly) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-medium">
                <Filter className="w-3 h-3" /> Filters:
              </span>
              {search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Query: "{search}"
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSearch("")} />
                </Badge>
              )}
              {selectedCity !== "All Cities" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedCity}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCity("All Cities")} />
                </Badge>
              )}
              {selectedPracticeArea !== "All" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedPracticeArea}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedPracticeArea("All")} />
                </Badge>
              )}
              {onlineOnly && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Online Video Mode
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setOnlineOnly(false)} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-destructive" onClick={resetFilters}>
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 space-y-4">
              <div className="flex gap-4 items-center">
                <Skeleton className="w-14 h-14 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="p-12 text-center border rounded-xl glass-panel space-y-3">
          <p className="text-destructive font-medium">Failed to load verified advocates.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      ) : lawyers.length === 0 ? (
        <div className="p-16 text-center border rounded-2xl glass-panel space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Scale className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No Verified Advocates Match Your Filter</h2>
          <p className="text-sm text-muted-foreground">
            We couldn't find any approved advocates matching your exact criteria. Try broadening your location or
            practice area search.
          </p>
          <Button variant="default" size="sm" onClick={resetFilters}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lawyers.map((lawyer) => (
            <Card
              key={lawyer.id}
              className="glass-card flex flex-col justify-between hover:shadow-lg transition-all duration-200 border-border group"
            >
              <CardContent className="p-6 space-y-4 flex-1">
                {/* Header: Photo / Initials + Verified details */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-lg ring-2 ring-primary/20">
                      {lawyer.user.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {lawyer.user.fullName}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {lawyer.city}, {lawyer.state}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success" className="text-[10px] shrink-0 font-medium">
                    <UserCheck className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                </div>

                {/* Experience & Bar Council details */}
                <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 rounded-lg bg-muted/40 border border-border/50">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Experience</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-primary" /> {lawyer.experienceYears} Years
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Bar Council</span>
                    <span className="font-semibold text-foreground truncate block" title={lawyer.stateBarCouncil}>
                      {lawyer.stateBarCouncil}
                    </span>
                  </div>
                </div>

                {/* Bio snippet */}
                {lawyer.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {lawyer.bio}
                  </p>
                )}

                {/* Practice Areas */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground block">Key Practice Areas</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(lawyer.practiceAreas || []).slice(0, 3).map((pa, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px]">
                        {pa.practiceArea.name}
                      </Badge>
                    ))}
                    {(lawyer.practiceAreas || []).length > 3 && (
                      <Badge variant="secondary" className="text-[10px]">
                        +{(lawyer.practiceAreas || []).length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Consultation Modes & Languages */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    {lawyer.consultationOnline && (
                      <span className="flex items-center gap-1 text-[11px] text-accent">
                        <Video className="w-3 h-3" /> Online
                      </span>
                    )}
                    {lawyer.consultationInPerson && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <Award className="w-3 h-3" /> In-Person
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[11px]">
                    <Globe className="w-3 h-3" />
                    <span>{lawyer.languages.slice(0, 2).join(", ")}</span>
                  </div>
                </div>
              </CardContent>

              <div className="p-4 pt-0 bg-background/50 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold"
                  onClick={() => setActiveLawyer(lawyer)}
                >
                  View Full Profile & Consultation
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Profile Detail & Booking Modal */}
      <Dialog
        open={!!activeLawyer}
        onOpenChange={(open) => {
          if (!open) setActiveLawyer(null);
        }}
      >
        <DialogContent className="max-w-2xl" onClose={() => setActiveLawyer(null)}>
          {activeLawyer && (
            <div className="space-y-6 pt-2">
              <DialogHeader>
                <DialogTitle>Advocate {activeLawyer.user.fullName}</DialogTitle>
                <DialogDescription>
                  Enrollment: {activeLawyer.barCouncilNumber} • {activeLawyer.stateBarCouncil}
                </DialogDescription>
              </DialogHeader>
            {/* Quick credentials banner */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Bar Council ID</p>
                <p className="font-mono text-sm font-bold text-foreground">{activeLawyer.barCouncilNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Enrolled In</p>
                <p className="text-sm font-semibold text-foreground">{activeLawyer.enrollmentYear}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Standing</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Bar Approved
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Location</p>
                <p className="text-sm font-semibold text-foreground">
                  {activeLawyer.city}, {activeLawyer.state}
                </p>
              </div>
            </div>

            {/* About / Bio */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Professional Background
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {activeLawyer.bio || "No extended bio provided. Verified active legal practitioner."}
              </p>
            </div>

            {/* Languages and Specializations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Practice Domains</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(activeLawyer.practiceAreas || []).map((pa, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {pa.practiceArea.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Languages Spoken</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeLawyer.languages.map((l, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {l}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Privacy & Zero-Trust Notice */}
            <div className="p-3.5 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-accent" /> NyayaPacket Zero-Trust Guarantee:
              </span>
              <p>
                Direct contact details and evidence records remain strictly encrypted until an official case access
                grant is signed and approved by the citizen.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setActiveLawyer(null)}>
                Close
              </Button>
              {isAuthenticated ? (
                <Link to={`/dashboard/cases/new?preferredLawyerId=${activeLawyer.id}`}>
                  <Button variant="default" size="sm" className="gap-2">
                    <Calendar className="w-4 h-4" /> Share Case & Book Consultation
                  </Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button variant="default" size="sm" className="gap-2">
                    Sign In to Schedule Consultation
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  </div>
);
}
