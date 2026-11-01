import { useQuery } from "@tanstack/react-query";
import { FolderLock, Lock, ShieldCheck, Clock, RefreshCw } from "lucide-react";
import { api } from "../../lib/apiClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { formatDate } from "../../lib/utils";

interface AdminCaseItem {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  category?: { name: string };
  _count?: {
    evidence: number;
    timelineEvents: number;
    packetGenerations: number;
  };
}

export function AdminCasesPage() {
  const { data, isLoading, refetch } = useQuery<{ items: AdminCaseItem[]; pagination: any }>({
    queryKey: ["admin-cases-metadata"],
    queryFn: async () => {
      const res = await api.get<AdminCaseItem[]>("/admin/cases");
      return { items: res.data || [], pagination: res.pagination };
    },
  });

  const cases = data?.items || [];

  return (
    <div className="space-y-6">
      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            <strong>Zero-Knowledge Administrative Registry:</strong> Platform administrators can monitor lifecycle
            milestones only. Raw evidentiary files, PDFs, and client statements are strictly encrypted and shielded.
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 text-xs text-destructive">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Case Metadata Registry</h1>
          <p className="text-xs text-muted-foreground">
            Platform-wide inventory of all registered dispute records and legal aid files.
          </p>
        </div>
      </div>

      <Card className="glass-card border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Case Number</th>
                  <th className="px-4 py-3.5">Title & Category</th>
                  <th className="px-4 py-3.5">Lifecycle Status</th>
                  <th className="px-4 py-3.5">Files / Facts Count</th>
                  <th className="px-5 py-3.5 text-right">Initiated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Loading case registry...
                    </td>
                  </tr>
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No dispute records in platform registry.
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-primary">{c.caseNumber}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground truncate max-w-xs">{c.title}</div>
                        <Badge variant="outline" className="text-[9px] mt-0.5">
                          {c.category?.name || "Dispute"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-[11px]">
                        <span>{c._count?.evidence ?? 0} Evidence Files</span> •{" "}
                        <span>{c._count?.timelineEvents ?? 0} Events</span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
