import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  KeyRound,
  Calendar,
  Video,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Trash2,
  UserCheck,
  Shield,
  ExternalLink,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/Dialog";
import { formatDate, formatDateTime } from "../../lib/utils";

interface AccessGrant {
  id: string;
  caseId: string;
  lawyerProfileId: string;
  canViewSummary: boolean;
  canViewEvidence: boolean;
  canDownload: boolean;
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  lawyer: {
    id: string;
    barCouncilNumber: string;
    stateBarCouncil: string;
    user: {
      id: string;
      fullName: string;
      email: string;
    };
  };
}

interface ConsultationRequest {
  id: string;
  citizenId: string;
  lawyerProfileId: string;
  caseId?: string | null;
  mode: "ONLINE" | "IN_PERSON";
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "RESCHEDULE_REQUESTED" | "COMPLETED";
  citizenMessage?: string | null;
  lawyerResponse?: string | null;
  scheduledAt?: string | null;
  meetingLink?: string | null;
  location?: string | null;
  createdAt: string;
  lawyer: {
    id: string;
    barCouncilNumber: string;
    user: {
      fullName: string;
    };
  };
}

export function ConsultationAndGrants({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();

  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showConsultModal, setShowConsultModal] = useState(false);

  // Grant Form State
  const [grantLawyerId, setGrantLawyerId] = useState("");
  const [canViewSummary, setCanViewSummary] = useState(true);
  const [canViewEvidence, setCanViewEvidence] = useState(true);
  const [canDownload, setCanDownload] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(30);

  // Consultation Form State
  const [consultLawyerId, setConsultLawyerId] = useState("");
  const [consultMode, setConsultMode] = useState<"ONLINE" | "IN_PERSON">("ONLINE");
  const [consultPreferredAt, setConsultPreferredAt] = useState("");
  const [consultMessage, setConsultMessage] = useState("");

  // Fetch approved lawyers list for dropdown
  const { data: approvedLawyers } = useQuery<any[]>({
    queryKey: ["approved-lawyers-dropdown"],
    queryFn: async () => {
      const res = await api.get<any[]>("/lawyers?limit=30");
      return res.data || [];
    },
  });

  // Fetch active access grants for this case
  const { data: grants, isLoading: grantsLoading, refetch: refetchGrants } = useQuery<AccessGrant[]>({
    queryKey: ["case-grants", caseId],
    queryFn: async () => {
      const res = await api.get<AccessGrant[]>(`/cases/${caseId}/grants`);
      return res.data || [];
    },
  });

  // Fetch consultations for this case
  const { data: consultations, isLoading: consultsLoading, refetch: refetchConsults } = useQuery<
    ConsultationRequest[]
  >({
    queryKey: ["case-consultations", caseId],
    queryFn: async () => {
      const res = await api.get<ConsultationRequest[]>("/consultations/my");
      const all = res.data || [];
      return all.filter((c) => c.caseId === caseId);
    },
  });

  // Create Grant Mutation
  const createGrantMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/cases/${caseId}/grants`, {
        lawyerProfileId: grantLawyerId,
        canViewSummary,
        canViewEvidence,
        canDownload,
        expiresInDays: Number(expiresInDays),
      });
      return res.data;
    },
    onSuccess: () => {
      setShowGrantModal(false);
      setGrantLawyerId("");
      refetchGrants();
    },
  });

  // Revoke Grant Mutation
  const revokeGrantMutation = useMutation({
    mutationFn: async (grantId: string) => {
      const res = await api.delete(`/cases/${caseId}/grants/${grantId}`);
      return res.data;
    },
    onSuccess: () => {
      refetchGrants();
    },
  });

  // Request Consultation Mutation
  const requestConsultMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/consultations", {
        lawyerProfileId: consultLawyerId,
        caseId,
        mode: consultMode,
        preferredAt: consultPreferredAt || undefined,
        citizenMessage: consultMessage.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      setShowConsultModal(false);
      setConsultLawyerId("");
      setConsultMessage("");
      refetchConsults();
    },
  });

  return (
    <div className="space-y-8">
      {/* SECTION 1: SCOPED ACCESS GRANTS */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" /> Scoped Case Access Grants
                </CardTitle>
                <Badge variant="accent" className="text-[10px]">
                  Zero-Trust Enforcement
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Authorize specific verified advocates to review your dossier. You can revoke access immediately at any
                second.
              </CardDescription>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => setShowGrantModal(true)}
              className="text-xs gap-1.5 font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Issue Scoped Grant
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {grantsLoading ? (
            <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />
          ) : !grants || grants.length === 0 ? (
            <div className="p-6 text-center border border-dashed rounded-xl text-xs text-muted-foreground">
              No access grants issued for this case. Your records are completely private to you.
            </div>
          ) : (
            <div className="space-y-2.5">
              {grants.map((grant) => {
                const isRevoked = !!grant.revokedAt;
                const isExpired = new Date(grant.expiresAt) < new Date();
                const isActive = !isRevoked && !isExpired;

                return (
                  <div
                    key={grant.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isActive ? "bg-card border-border shadow-xs" : "bg-muted/20 border-border/50 opacity-60"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">
                          {grant.lawyer?.user?.fullName || "Advocate"}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ({grant.lawyer?.barCouncilNumber})
                        </span>
                        {isActive ? (
                          <Badge variant="success" className="text-[9px]">
                            Active Grant
                          </Badge>
                        ) : isRevoked ? (
                          <Badge variant="destructive" className="text-[9px]">
                            Revoked
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px]">
                            Expired
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span>Scopes:</span>
                        {grant.canViewSummary && (
                          <Badge variant="outline" className="text-[9px]">
                            Summary
                          </Badge>
                        )}
                        {grant.canViewEvidence && (
                          <Badge variant="outline" className="text-[9px]">
                            Evidence
                          </Badge>
                        )}
                        {grant.canDownload && (
                          <Badge variant="outline" className="text-[9px]">
                            Download PDF
                          </Badge>
                        )}
                        <span>•</span>
                        <span>Expires {formatDate(grant.expiresAt)}</span>
                      </div>
                    </div>

                    {isActive && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs gap-1 font-semibold"
                        onClick={() => revokeGrantMutation.mutate(grant.id)}
                        isLoading={revokeGrantMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Revoke Access
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: CONSULTATION SESSIONS */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Consultation Sessions
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Request and track video calls or in-person advisory sessions with accredited legal practitioners.
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConsultModal(true)}
              className="text-xs gap-1.5 font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Book Consultation
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {consultsLoading ? (
            <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />
          ) : !consultations || consultations.length === 0 ? (
            <div className="p-6 text-center border border-dashed rounded-xl text-xs text-muted-foreground">
              No consultations scheduled for this matter. Click "Book Consultation" above to connect with an advocate.
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border border-border bg-card space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">
                        {c.lawyer?.user?.fullName || "Advocate"}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {c.mode === "ONLINE" ? "Video Consultation" : "In-Person Meeting"}
                      </Badge>
                    </div>

                    <div>
                      {c.status === "ACCEPTED" ? (
                        <Badge variant="success" className="text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Accepted
                        </Badge>
                      ) : c.status === "DECLINED" ? (
                        <Badge variant="destructive" className="text-[10px]">
                          <XCircle className="w-3 h-3 mr-1" /> Declined
                        </Badge>
                      ) : (
                        <Badge variant="accent" className="text-[10px]">
                          <Clock className="w-3 h-3 mr-1" /> Awaiting Advocate Response
                        </Badge>
                      )}
                    </div>
                  </div>

                  {c.citizenMessage && (
                    <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg italic">
                      "{c.citizenMessage}"
                    </p>
                  )}

                  {c.status === "ACCEPTED" && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Session Confirmed
                      </span>
                      {c.scheduledAt && (
                        <p className="text-muted-foreground">
                          Scheduled Time: <strong className="text-foreground">{formatDateTime(c.scheduledAt)}</strong>
                        </p>
                      )}
                      {c.meetingLink && (
                        <div className="pt-1">
                          <a
                            href={c.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-bold text-accent hover:underline text-xs"
                          >
                            <Video className="w-3.5 h-3.5" /> Join Secure Video Meeting Room <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {c.location && (
                        <p className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {c.location}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grant Creation Modal */}
      <Dialog open={showGrantModal} onOpenChange={setShowGrantModal}>
        <DialogContent onClose={() => setShowGrantModal(false)}>
          <DialogHeader>
            <DialogTitle>Issue Scoped Case Access Grant</DialogTitle>
            <DialogDescription>
              Grant a verified advocate temporary authorization to inspect your case file and evidence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Select Verified Advocate *</label>
              <select
                aria-label="Select Verified Advocate"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                value={grantLawyerId}
                onChange={(e) => setGrantLawyerId(e.target.value)}
              >
                <option value="">-- Choose Advocate --</option>
                {(approvedLawyers || []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.user?.fullName} ({l.barCouncilNumber} • {l.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 p-3 rounded-xl bg-muted/40 border border-border">
              <span className="text-xs font-bold text-foreground block">Granular Permission Scopes:</span>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={canViewSummary}
                  onChange={(e) => setCanViewSummary(e.target.checked)}
                  className="rounded border-input text-primary"
                />
                <span>Allow Viewing Case Overview & AI Synthesized Claims</span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={canViewEvidence}
                  onChange={(e) => setCanViewEvidence(e.target.checked)}
                  className="rounded border-input text-primary"
                />
                <span>Allow Viewing Extracted Evidence & OCR Documents</span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={canDownload}
                  onChange={(e) => setCanDownload(e.target.checked)}
                  className="rounded border-input text-primary"
                />
                <span>Allow Downloading Court PDF Dossier</span>
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Access Validity (Days)</label>
              <Input
                type="number"
                min="1"
                max="90"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowGrantModal(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!grantLawyerId}
              onClick={() => createGrantMutation.mutate()}
              isLoading={createGrantMutation.isPending}
              className="font-bold"
            >
              Sign & Issue Grant
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Book Consultation Modal */}
      <Dialog open={showConsultModal} onOpenChange={setShowConsultModal}>
        <DialogContent onClose={() => setShowConsultModal(false)}>
          <DialogHeader>
            <DialogTitle>Book Advocate Consultation</DialogTitle>
            <DialogDescription>
              Schedule an advisory session with an approved legal practitioner.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Select Advocate *</label>
              <select
                aria-label="Select Advocate"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                value={consultLawyerId}
                onChange={(e) => setConsultLawyerId(e.target.value)}
              >
                <option value="">-- Choose Advocate --</option>
                {(approvedLawyers || []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.user?.fullName} ({l.barCouncilNumber} • {l.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Consultation Mode</label>
                <select
                  aria-label="Consultation Mode"
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  value={consultMode}
                  onChange={(e) => setConsultMode(e.target.value as "ONLINE" | "IN_PERSON")}
                >
                  <option value="ONLINE">Video Meeting</option>
                  <option value="IN_PERSON">In-Person Meeting</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Preferred Date & Time</label>
                <Input
                  type="datetime-local"
                  value={consultPreferredAt}
                  onChange={(e) => setConsultPreferredAt(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Intake Note / Message</label>
              <Textarea
                placeholder="Briefly mention key questions or immediate relief you require (e.g. need urgent stay notice drafted)..."
                rows={3}
                value={consultMessage}
                onChange={(e) => setConsultMessage(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowConsultModal(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!consultLawyerId}
              onClick={() => requestConsultMutation.mutate()}
              isLoading={requestConsultMutation.isPending}
              className="font-bold"
            >
              Submit Consultation Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
