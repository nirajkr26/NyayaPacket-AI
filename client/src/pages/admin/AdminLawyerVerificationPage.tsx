import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ExternalLink,
  ShieldAlert,
  Search,
  Filter,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/Dialog";
import { formatDate } from "../../lib/utils";

interface PendingLawyer {
  id: string;
  userId: string;
  barCouncilNumber: string;
  stateBarCouncil: string;
  enrollmentYear: number;
  experienceYears: number;
  city: string;
  state: string;
  bio?: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    createdAt: string;
  };
  verificationDocuments?: Array<{
    id: string;
    documentType: string;
    originalName: string;
    storageKey: string;
    status: string;
  }>;
}

export function AdminLawyerVerificationPage() {
  const queryClient = useQueryClient();
  const [rejectingLawyer, setRejectingLawyer] = useState<PendingLawyer | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [search, setSearch] = useState("");

  // Fetch pending lawyers queue
  const { data: pendingLawyers, isLoading, refetch } = useQuery<PendingLawyer[]>({
    queryKey: ["admin-pending-lawyers"],
    queryFn: async () => {
      const res = await api.get<PendingLawyer[]>("/admin/lawyers/pending");
      return res.data || [];
    },
  });

  // Decision Mutation
  const decisionMutation = useMutation({
    mutationFn: async ({
      lawyerId,
      status,
      notes,
    }: {
      lawyerId: string;
      status: "APPROVED" | "REJECTED";
      notes?: string;
    }) => {
      const res = await api.patch(`/admin/lawyers/${lawyerId}/verification`, {
        status,
        notes,
      });
      return res.data;
    },
    onSuccess: () => {
      setRejectingLawyer(null);
      setRejectionNotes("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
  });

  const filteredLawyers = (pendingLawyers || []).filter(
    (l) =>
      l.user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      l.barCouncilNumber.toLowerCase().includes(search.toLowerCase()) ||
      l.stateBarCouncil.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Advocate Bar Verification Queue</h1>
          <p className="text-xs text-muted-foreground">
            Review submitted Bar Council enrollment credentials and approve advocates for public directory listing.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search by name or Bar Roll #..."
            className="text-xs h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse border border-border" />
          ))}
        </div>
      ) : filteredLawyers.length === 0 ? (
        <Card className="glass-card p-12 text-center border-dashed border-border space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Verification Queue Clear</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            All submitted advocate accreditation requests have been processed. New registrations will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredLawyers.map((lawyer) => (
            <Card key={lawyer.id} className="glass-card border-border overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center text-base shrink-0">
                      {lawyer.user.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-foreground">{lawyer.user.fullName}</h4>
                      <p className="text-xs text-muted-foreground">
                        {lawyer.user.email} {lawyer.user.phone ? `• ${lawyer.user.phone}` : ""}
                      </p>
                    </div>
                  </div>

                  <Badge variant="warning" className="text-xs font-bold self-start sm:self-center">
                    <Clock className="w-3.5 h-3.5 mr-1" /> Pending Registrar Review
                  </Badge>
                </div>

                {/* Credentials details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Bar Council Roll #
                    </span>
                    <strong className="font-mono text-foreground">{lawyer.barCouncilNumber}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      State Bar Council
                    </span>
                    <span className="font-semibold text-foreground truncate block">{lawyer.stateBarCouncil}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Standing & Experience
                    </span>
                    <span className="text-foreground">{lawyer.experienceYears} Years (Enrolled {lawyer.enrollmentYear})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Location</span>
                    <span className="text-foreground">
                      {lawyer.city}, {lawyer.state}
                    </span>
                  </div>
                </div>

                {/* Bio snippet */}
                {lawyer.bio && (
                  <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg leading-relaxed">
                    {lawyer.bio}
                  </p>
                )}

                {/* Attached verification documents */}
                {lawyer.verificationDocuments && lawyer.verificationDocuments.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">
                      Submitted Certificates ({lawyer.verificationDocuments.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {lawyer.verificationDocuments.map((doc) => (
                        <Badge key={doc.id} variant="secondary" className="gap-1.5 text-xs py-1">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          <span>{doc.originalName}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => setRejectingLawyer(lawyer)}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject Application
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    onClick={() =>
                      decisionMutation.mutate({ lawyerId: lawyer.id, status: "APPROVED" })
                    }
                    isLoading={decisionMutation.isPending}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Certify Advocate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <Dialog open={!!rejectingLawyer} onOpenChange={() => setRejectingLawyer(null)}>
        <DialogContent onClose={() => setRejectingLawyer(null)}>
          <DialogHeader>
            <DialogTitle>Reject Bar Council Accreditation</DialogTitle>
            <DialogDescription>
              State the specific regulatory reason for rejecting {rejectingLawyer?.user?.fullName}'s accreditation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Rejection Reason / Defect Notes *</label>
              <Textarea
                placeholder="e.g. Bar enrollment roll certificate is illegible or does not match the provided enrollment year..."
                rows={4}
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setRejectingLawyer(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!rejectionNotes.trim()}
              onClick={() => {
                if (rejectingLawyer) {
                  decisionMutation.mutate({
                    lawyerId: rejectingLawyer.id,
                    status: "REJECTED",
                    notes: rejectionNotes.trim(),
                  });
                }
              }}
              isLoading={decisionMutation.isPending}
            >
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
