import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FolderLock,
  PlusCircle,
  FileCheck,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Search,
  Filter,
  Clock,
  Shield,
  Layers,
  Sparkles,
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
        return <Badge variant="accent">Intake Phase</Badge>;
      case "EVIDENCE_COLLECTION":
        return <Badge variant="secondary">Evidence Upload</Badge>;
      case "AI_DRAFT_GENERATED":
      case "CITIZEN_VERIFICATION":
        return <Badge variant="warning">Verification Needed</Badge>;
      case "READY_FOR_LAWYER":
        return <Badge variant="success">Court Packet Ready</Badge>;
      case "ACTION_PLAN_ACTIVE":
        return <Badge variant="default">Counsel Active</Badge>;
      case "CLOSED":
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome & Top Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-background to-accent/10 border border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Welcome back, {user?.fullName || "Citizen"}
            </h1>
            <Badge variant="accent" className="text-[10px]">Client Vault</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your legal claims, upload evidence, review AI-synthesized timelines, and connect with verified advocates.
          </p>
        </div>
        <Link to="/dashboard/cases/new">
          <Button variant="default" size="lg" className="gap-2 shadow-md w-full sm:w-auto font-bold">
            <PlusCircle className="w-4 h-4" /> Start New Case Intake
          </Button>
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Total Cases</CardTitle>
            <FolderLock className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-black text-foreground">{stats?.totalCases ?? 0}</div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Initiated dispute records</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Active In-Flight</CardTitle>
            <Layers className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-black text-accent">{stats?.activeCases ?? 0}</div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">In intake, analysis or review</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Needs Verification</CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-black text-amber-500">{stats?.verificationNeeded ?? 0}</div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Timeline facts awaiting sign-off</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Consultations</CardTitle>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {stats?.pendingConsultations ?? 0}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Sessions booked with advocates</p>
          </CardContent>
        </Card>
      </div>

      {/* Case Management Header & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Your Registered Matters</h2>
            <p className="text-xs text-muted-foreground">
              Select any matter to continue intake interview, add evidence, or generate your court packet
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by title or #..."
                className="pl-8 text-xs h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="Filter Cases by Status"
              className="h-9 px-2.5 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW_CASE">New Intake</option>
              <option value="INTERVIEW_IN_PROGRESS">Interview</option>
              <option value="EVIDENCE_COLLECTION">Evidence Collection</option>
              <option value="CITIZEN_VERIFICATION">Needs Verification</option>
              <option value="READY_FOR_LAWYER">Packet Ready</option>
              <option value="ACTION_PLAN_ACTIVE">Action Plan Active</option>
            </select>
          </div>
        </div>

        {/* Case List or Empty State */}
        {casesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-5 space-y-3">
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
          <Card className="glass-card p-12 text-center border-dashed border-border space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">No Case Matters Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search || statusFilter !== "ALL"
                  ? "No cases matched your filter criteria. Try clearing your search."
                  : "You haven't initiated any legal claims yet. Start an AI-guided intake interview in under 3 minutes."}
              </p>
            </div>
            <Link to="/dashboard/cases/new">
              <Button size="sm" variant="default" className="gap-2">
                <PlusCircle className="w-4 h-4" /> Create Your First Case
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCases.map((c) => (
              <Card
                key={c.id}
                className="glass-card hover:shadow-md transition-all border-border flex flex-col justify-between group"
              >
                <CardContent className="p-5 space-y-4 flex-1">
                  {/* Top Bar: Case Number & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{c.caseNumber}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {c.category?.name || "General Dispute"}
                      </Badge>
                    </div>
                    {getStatusBadge(c.status)}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {c.title}
                  </h3>

                  {/* Details row: Location, Incident Date, Counts */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
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
                <div className="p-4 pt-0 border-t border-border/50 bg-background/40 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Created {formatDate(c.createdAt)}
                  </span>
                  <Link to={`/dashboard/cases/${c.id}`}>
                    <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5">
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
