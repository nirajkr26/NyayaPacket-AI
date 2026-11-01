import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Ban,
  RefreshCw,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/Dialog";
import { formatDate } from "../../lib/utils";

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: "CITIZEN" | "LAWYER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  _count?: {
    cases: number;
    consultationRequests: number;
  };
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<UserItem | null>(null);
  const [statusReason, setStatusReason] = useState("");

  const { data, isLoading, refetch } = useQuery<{ items: UserItem[]; pagination: any }>({
    queryKey: ["admin-users", search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      const res = await api.get<UserItem[]>(`/admin/users?${params.toString()}`);
      return { items: res.data || [], pagination: res.pagination };
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, newStatus, reason }: { userId: string; newStatus: boolean; reason?: string }) => {
      const res = await api.patch(`/admin/users/${userId}/status`, {
        isActive: newStatus,
        reason,
      });
      return res.data;
    },
    onSuccess: () => {
      setSelectedUserForStatus(null);
      setStatusReason("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
  });

  const users = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">User Accounts & Access Management</h1>
          <p className="text-xs text-muted-foreground">
            Enforce role privileges, monitor security standing, or suspend compromised citizen or advocate accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search email or full name..."
            className="text-xs h-9 w-60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Filter Users by Role"
            className="h-9 px-2.5 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">All Roles</option>
            <option value="CITIZEN">Citizen</option>
            <option value="LAWYER">Advocate</option>
            <option value="ADMIN">Platform Admin</option>
          </select>
        </div>
      </div>

      <Card className="glass-card border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Registered</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Loading user accounts...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No user accounts match your search filter.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground">{u.fullName}</div>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            u.role === "ADMIN"
                              ? "destructive"
                              : u.role === "LAWYER"
                              ? "success"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive font-semibold text-[11px]">
                            <Ban className="w-3.5 h-3.5" /> Suspended
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{formatDate(u.createdAt)}</td>
                      <td className="px-5 py-3.5 text-right">
                        {u.role !== "ADMIN" && (
                          <Button
                            variant={u.isActive ? "outline" : "default"}
                            size="sm"
                            className={`h-7 text-[11px] px-2.5 ${
                              u.isActive ? "text-destructive hover:bg-destructive/10" : ""
                            }`}
                            onClick={() => setSelectedUserForStatus(u)}
                          >
                            {u.isActive ? "Suspend User" : "Reactivate"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Suspend / Reactivate Confirmation Modal */}
      <Dialog open={!!selectedUserForStatus} onOpenChange={() => setSelectedUserForStatus(null)}>
        <DialogContent onClose={() => setSelectedUserForStatus(null)}>
          <DialogHeader>
            <DialogTitle>
              {selectedUserForStatus?.isActive ? "Suspend User Account" : "Reactivate User Account"}
            </DialogTitle>
            <DialogDescription>
              Modify security access standing for <strong>{selectedUserForStatus?.fullName}</strong> (
              {selectedUserForStatus?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Audit Reason / Regulatory Note</label>
              <Input
                placeholder="e.g. Terms violation, compromised credentials, or verification update"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedUserForStatus(null)}>
              Cancel
            </Button>
            <Button
              variant={selectedUserForStatus?.isActive ? "destructive" : "default"}
              size="sm"
              onClick={() => {
                if (selectedUserForStatus) {
                  toggleStatusMutation.mutate({
                    userId: selectedUserForStatus.id,
                    newStatus: !selectedUserForStatus.isActive,
                    reason: statusReason.trim() || undefined,
                  });
                }
              }}
              isLoading={toggleStatusMutation.isPending}
            >
              {selectedUserForStatus?.isActive ? "Confirm Suspension" : "Confirm Reactivation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
