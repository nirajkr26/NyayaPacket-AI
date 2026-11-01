import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Users,
  FolderLock,
  Calendar,
  Layers,
  Award,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";

interface AdminMetrics {
  users: {
    total: number;
    citizens: number;
    lawyers: number;
    admins: number;
    active: number;
    suspended: number;
  };
  cases: {
    total: number;
    byStatus: Record<string, number>;
  };
  consultations: {
    total: number;
    byStatus: Record<string, number>;
  };
  packets: {
    total: number;
  };
  lawyerVerifications: Record<string, number>;
}

export function AdminDashboard() {
  const { data: metrics, isLoading } = useQuery<AdminMetrics>({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const res = await api.get<AdminMetrics>("/admin/dashboard/metrics");
      return res.data!;
    },
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const pendingLawyers = metrics?.lawyerVerifications?.PENDING || 0;
  const approvedLawyers = metrics?.lawyerVerifications?.APPROVED || 0;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-destructive/10 via-background to-accent/10 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Platform System Governance
            </h1>
            <Badge variant="destructive" className="text-[10px]">
              Root Console
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Monitor real-time system metrics, review advocate accreditation requests, and enforce audit compliance.
          </p>
        </div>

        {pendingLawyers > 0 && (
          <Link to="/admin/lawyers">
            <Button variant="default" size="sm" className="gap-2 font-bold bg-amber-600 hover:bg-amber-700 text-white">
              <Clock className="w-4 h-4" /> Review {pendingLawyers} Pending Advocates
            </Button>
          </Link>
        )}
      </div>

      {/* Core KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-border/80 border-t-2 border-t-blue-500 hover:border-blue-500/50 transition-all shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Registered Users</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{metrics?.users?.total ?? 0}</div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
              <span>{metrics?.users?.citizens ?? 0} Citizens</span>
              <span>•</span>
              <span>{metrics?.users?.lawyers ?? 0} Advocates</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/80 border-t-2 border-t-purple-500 hover:border-purple-500/50 transition-all shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Cases</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <FolderLock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-purple-400">{metrics?.cases?.total ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Total dispute ledgers created</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/80 border-t-2 border-t-emerald-500 hover:border-emerald-500/50 transition-all shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Court Dossiers</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-400">
              {metrics?.packets?.total ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">PDF packets compiled with SHA-256</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/80 border-t-2 border-t-amber-500 hover:border-amber-500/50 transition-all shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Advocates Pipeline</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{approvedLawyers}</div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
              <span className="text-emerald-500 font-semibold">{approvedLawyers} Verified</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{pendingLawyers} Pending</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Case Status Distribution */}
        <Card className="glass-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground">Cases Lifecycle Breakdown</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Distribution of cases across legal intake, analysis, verification, and active counsel:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics?.cases?.byStatus && Object.keys(metrics.cases.byStatus).length > 0 ? (
              Object.entries(metrics.cases.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-xs">
                  <span className="font-semibold text-foreground">{status}</span>
                  <Badge variant="secondary" className="font-mono">
                    {count}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No case status data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Consultation Status Distribution */}
        <Card className="glass-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground">Consultations Breakdown</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Status of advocate advisory requests across the platform:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics?.consultations?.byStatus && Object.keys(metrics.consultations.byStatus).length > 0 ? (
              Object.entries(metrics.consultations.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-xs">
                  <span className="font-semibold text-foreground">{status}</span>
                  <Badge variant="secondary" className="font-mono">
                    {count}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No consultation data available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
