import { useQuery } from "@tanstack/react-query";
import { History, Shield, RefreshCw } from "lucide-react";
import { api } from "../../lib/apiClient";
import { Card, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { formatDateTime } from "../../lib/utils";

interface AuditLogItem {
  id: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: any;
  createdAt: string;
  actor?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
}

export function AdminAuditLogsPage() {
  const { data, isLoading, refetch } = useQuery<{ items: AuditLogItem[]; pagination: any }>({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const res = await api.get<AuditLogItem[]>("/admin/audit-logs?limit=50");
      return { items: res.data || [], pagination: res.pagination };
    },
  });

  const logs = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Immutable Security Audit Trail</h1>
          <p className="text-xs text-muted-foreground">
            Complete cryptographic event logging of case creations, evidence uploads, access grants, and staff actions.
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 text-xs gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
        </Button>
      </div>

      <Card className="glass-card border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Actor</th>
                  <th className="px-4 py-3.5">Action Event</th>
                  <th className="px-4 py-3.5">Resource</th>
                  <th className="px-5 py-3.5">Audit Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors font-mono text-[11px]">
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <span className="font-semibold text-foreground">
                          {log.actor?.fullName || log.actorId}
                        </span>
                        <span className="block text-[10px] text-muted-foreground font-mono">
                          {log.actor?.email}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-sans text-muted-foreground">
                        <span>{log.resourceType}</span>
                        {log.resourceId && (
                          <span className="block text-[10px] font-mono truncate max-w-xs opacity-70">
                            {log.resourceId}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 max-w-xs truncate text-muted-foreground text-[10px]">
                        {log.metadata ? JSON.stringify(log.metadata) : "-"}
                      </td>
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
