import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderLock,
  PlusCircle,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Search,
  Clock,
  Shield,
  Layers,
  Sparkles,
  ShoppingBag,
  Home,
  Briefcase,
  Coins,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatDate } from "../../lib/utils";

export interface CaseListItem {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  incidentDate?: string | null;
  city?: string | null;
  state?: string | null;
  createdAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  _count?: {
    evidence: number;
    timelineEvents: number;
    accessGrants: number;
  };
}

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  verificationNeeded: number;
  pendingConsultations: number;
  pendingActionItems: number;
}

export function CitizenDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Fetch dashboard metrics
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["citizen-stats"],
    queryFn: async () => {
      const res = await api.get<DashboardStats>("/cases/dashboard/stats");
      return res.data || {
        totalCases: 0,
        activeCases: 0,
        verificationNeeded: 0,
        pendingConsultations: 0,
        pendingActionItems: 0,
      };
    },
  });

  // Fetch case list
  const { data: cases, isLoading: casesLoading } = useQuery<CaseListItem[]>({
    queryKey: ["citizen-cases"],
    queryFn: async () => {
      const res = await api.get<CaseListItem[]>("/cases?limit=50");
      return res.data || [];
    },
  });

  // Fetch categories for quick launchpad
  const { data: categories } = useQuery<any[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get<any[]>("/categories");
      return res.data || [];
    },
  });

  // Quick seed sample case mutation
  const seedCaseMutation = useMutation({
    mutationFn: async () => {
      const consumerCat = categories?.find(
        (c) => c.slug.includes("consumer") || c.name.toLowerCase().includes("consumer")
      ) || categories?.[0];

      const res = await api.post("/cases", {
        categoryId: consumerCat?.id || "cmvxtqrsy0000fxoyimojwt1x",
        title: "Defective Laptop & Warranty Denial Claim",
        description:
          "Purchased gaming laptop from TechRetail India on October 14. Motherboard failed within 10 days of delivery. Authorized service center denied warranty claim citing frivolous wear-and-tear.",
        incidentDate: "2026-10-14",
        city: "Bengaluru",
        state: "Karnataka",
        parties: [
          {
            name: "TechRetail India Private Limited",
            relationship: "Merchant / Vendor",
            organization: "TechRetail E-Commerce",
            contactInfo: "support@techretail.in",
            description: "Authorized online electronics seller",
          },
        ],
      });
      return res.data;
    },
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: ["citizen-cases"] });
      queryClient.invalidateQueries({ queryKey: ["citizen-stats"] });
      if (newCase?.id) {
        navigate(`/dashboard/cases/${newCase.id}`);
      }
    },
  });

  const filteredCases = (cases || []).filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.name?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "ALL") return true;
    return c.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW_CASE":
      case "INTERVIEW_IN_PROGRESS":
        return <Badge variant="secondary" className="text-[10px]">In Intake</Badge>;
      case "EVIDENCE_COLLECTION":
        return <Badge variant="accent" className="text-[10px]">Evidence Phase</Badge>;
      case "CITIZEN_VERIFICATION":
        return <Badge variant="warning" className="text-[10px]">Verification Needed</Badge>;
      case "READY_FOR_LAWYER":
        return <Badge variant="success" className="text-[10px]">Packet Ready</Badge>;
      case "ACTION_PLAN_ACTIVE":
        return <Badge variant="default" className="text-[10px]">Action Plan Active</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Executive Welcome & Top Action Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-8 shadow-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-accent/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Welcome back, {user?.fullName || "Citizen"}
              </h1>
              <Badge variant="accent" className="text-[11px] font-semibold py-0.5 px-2.5 gap-1.5 shadow-sm">
                <Shield className="w-3 h-3" /> DPDP Zero-Trust Client Vault
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Transform your personal disputes, receipts, and narrative evidence into verifiable, lawyer-ready legal dossiers compliant with the Indian Legal Framework.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0">
            <Link to="/dashboard/cases/new">
              <Button
                variant="default"
                size="lg"
                className="gap-2 font-bold shadow-md hover:shadow-primary/20 hover:scale-[1.02] transition-all w-full sm:w-auto"
              >
                <PlusCircle className="w-4 h-4" /> Start New Case
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cases */}
        <Card className="glass-card border-border/80 relative overflow-hidden group hover:border-blue-500/40">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Cases
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FolderLock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            {statsLoading ? (
              <Skeleton className="h-8 w-16 shimmer" />
            ) : (
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {stats?.totalCases ?? 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>Initiated dispute records</span>
            </p>
          </CardContent>
        </Card>

        {/* Active In-Flight */}
        <Card className="glass-card border-border/80 relative overflow-hidden group hover:border-amber-500/40">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Active In-Flight
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            {statsLoading ? (
              <Skeleton className="h-8 w-16 shimmer" />
            ) : (
              <div className="text-2xl sm:text-3xl font-black text-amber-500 flex items-center gap-2">
                <span>{stats?.activeCases ?? 0}</span>
                {(stats?.activeCases ?? 0) > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">In intake, analysis or review</p>
          </CardContent>
        </Card>

        {/* Needs Verification */}
        <Card className="glass-card border-border/80 relative overflow-hidden group hover:border-rose-500/40">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-pink-600" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Needs Sign-off
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            {statsLoading ? (
              <Skeleton className="h-8 w-16 shimmer" />
            ) : (
              <div className="text-2xl sm:text-3xl font-black text-rose-500">
                {stats?.verificationNeeded ?? 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Timeline facts awaiting confirmation</p>
          </CardContent>
        </Card>

        {/* Consultations */}
        <Card className="glass-card border-border/80 relative overflow-hidden group hover:border-emerald-500/40">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Consultations
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            {statsLoading ? (
              <Skeleton className="h-8 w-16 shimmer" />
            ) : (
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {stats?.pendingConsultations ?? 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Sessions booked with advocates</p>
          </CardContent>
        </Card>
      </div>

      {/* Case Management Header & Filters */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Registered Legal Matters</h2>
            <p className="text-xs text-muted-foreground">
              Select any matter to conduct AI intake interviews, attach evidence, or compile court-ready packets
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search matter title or #..."
                className="pl-9 text-xs h-9 bg-card/60 border-border"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="Filter Cases by Status"
              className="h-9 px-3 rounded-lg border border-border bg-card/80 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses ({cases?.length || 0})</option>
              <option value="NEW_CASE">New Intake</option>
              <option value="INTERVIEW_IN_PROGRESS">Interview</option>
              <option value="EVIDENCE_COLLECTION">Evidence Collection</option>
              <option value="CITIZEN_VERIFICATION">Needs Sign-off</option>
              <option value="READY_FOR_LAWYER">Packet Ready</option>
              <option value="ACTION_PLAN_ACTIVE">Action Plan Active</option>
            </select>
          </div>
        </div>

        {/* Case List or Dynamic Category Launchpad */}
        {casesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="glass-card p-5 space-y-3 shimmer">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="space-y-6">
            {/* Interactive Dispute Category Launchpad */}
            <div className="rounded-2xl border border-border/80 bg-card/40 p-6 sm:p-8 backdrop-blur-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <h3 className="text-base font-bold text-foreground">
                      {search || statusFilter !== "ALL"
                        ? "No Matching Matters Found"
                        : "Start Your Digital Case Dossier"}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {search || statusFilter !== "ALL"
                      ? "No records matched your search filter. Clear filters or select a category below."
                      : "Choose a dispute category to begin your guided AI intake interview, or simulate a live matter."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs font-semibold h-9 border-accent/40 bg-accent/5 hover:bg-accent/10"
                    onClick={() => seedCaseMutation.mutate()}
                    isLoading={seedCaseMutation.isPending}
                  >
                    <Zap className="w-3.5 h-3.5 text-accent" />
                    <span>⚡ Load Sample Consumer Matter</span>
                  </Button>
                </div>
              </div>

              {/* 4 Launchpad Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Tile 1: Consumer Protection */}
                <Link
                  to="/dashboard/cases/new?category=consumer-dispute"
                  className="p-5 rounded-xl border border-border/70 bg-card hover:border-amber-500/50 hover:shadow-lg transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-amber-500 transition-colors">
                        Consumer Protection
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        Defective electronics, refund refusals, delivery failures, and misleading trade claims.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <span>File Claim</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                {/* Tile 2: Tenancy & Rental */}
                <Link
                  to="/dashboard/cases/new?category=property-tenancy"
                  className="p-5 rounded-xl border border-border/70 bg-card hover:border-blue-500/50 hover:shadow-lg transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-blue-500 transition-colors">
                        Tenancy & Rent Recovery
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        Withheld security deposits, illegal eviction notices, maintenance breaches, and lease defaults.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <span>File Claim</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                {/* Tile 3: Labour & Unpaid Wages */}
                <Link
                  to="/dashboard/cases/new?category=labour-employment"
                  className="p-5 rounded-xl border border-border/70 bg-card hover:border-emerald-500/50 hover:shadow-lg transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-emerald-500 transition-colors">
                        Employment & Wages
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        Delayed monthly salaries, wrongful termination without notice, gratuity, and relieving letters.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>File Claim</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                {/* Tile 4: Civil Debt Recovery */}
                <Link
                  to="/dashboard/cases/new?category=civil-recovery"
                  className="p-5 rounded-xl border border-border/70 bg-card hover:border-purple-500/50 hover:shadow-lg transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-purple-500 transition-colors">
                        Debt & Summary Suits
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        Commercial recovery, Order 37 summary claims, promissory notes dishonour, and unpaid invoices.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                    <span>File Claim</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCases.map((c) => (
              <Card
                key={c.id}
                className="glass-card hover:shadow-xl hover:border-primary/40 transition-all flex flex-col justify-between group overflow-hidden"
              >
                <CardContent className="p-5 sm:p-6 space-y-4 flex-1">
                  {/* Top Bar: Case Number & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary tracking-wider bg-primary/10 px-2 py-0.5 rounded-md">
                        {c.caseNumber}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {c.category?.name || "General Dispute"}
                      </Badge>
                    </div>
                    {getStatusBadge(c.status)}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {c.title}
                  </h3>

                  {/* Details row: Location, Incident Date, Counts */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                    {c.incidentDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Incident: {formatDate(c.incidentDate)}
                      </span>
                    )}
                    {c.city && (
                      <span>
                        {c.city}, {c.state || "India"}
                      </span>
                    )}
                    {c._count && (
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Shield className="w-3.5 h-3.5 text-accent" /> {c._count.evidence} Evidence Files
                      </span>
                    )}
                  </div>
                </CardContent>

                {/* Footer Action */}
                <div className="p-4 pt-3 border-t border-border/50 bg-background/50 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Created {formatDate(c.createdAt)}
                  </span>
                  <Link to={`/dashboard/cases/${c.id}`}>
                    <Button variant="default" size="sm" className="h-8 text-xs font-semibold gap-1.5 shadow-sm">
                      Open Matter File <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
