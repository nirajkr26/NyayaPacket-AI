import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Video,
  MapPin,
  Clock,
  ArrowRight,
  Shield,
  ExternalLink,
  FolderLock,
  Layers,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/Dialog";
import { formatDate, formatDateTime } from "../../lib/utils";

interface SharedCaseItem {
  grantId: string;
  grantedAt: string;
  expiresAt: string;
  permissions: {
    canViewSummary: boolean;
    canViewEvidence: boolean;
    canDownload: boolean;
  };
  case: {
    id: string;
    caseNumber: string;
    title: string;
    status: string;
    createdAt: string;
    category?: { name: string };
    owner?: { fullName: string; email: string; phone?: string | null };
  };
}

interface ConsultationItem {
  id: string;
  citizenId: string;
  lawyerProfileId: string;
  caseId?: string | null;
  mode: "ONLINE" | "IN_PERSON";
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "RESCHEDULE_REQUESTED" | "COMPLETED";
  citizenMessage?: string | null;
  scheduledAt?: string | null;
  meetingLink?: string | null;
  createdAt: string;
  citizen?: {
    fullName: string;
    email: string;
    phone?: string | null;
  };
}

export function LawyerDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Accept Consultation Modal State
  const [acceptingConsult, setAcceptingConsult] = useState<ConsultationItem | null>(null);
  const [scheduledTime, setScheduledTime] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [lawyerResponse, setLawyerResponse] = useState("");

  // Fetch shared cases
  const { data: sharedCases, isLoading: sharedLoading } = useQuery<SharedCaseItem[]>({
    queryKey: ["lawyer-shared-cases"],
    queryFn: async () => {
      const res = await api.get<SharedCaseItem[]>("/lawyers/me/shared-cases");
      return res.data || [];
    },
  });

  // Fetch consultations
  const { data: consultations, isLoading: consultsLoading, refetch: refetchConsults } = useQuery<
    ConsultationItem[]
  >({
    queryKey: ["lawyer-consultations"],
    queryFn: async () => {
      const res = await api.get<ConsultationItem[]>("/consultations/my");
      return res.data || [];
    },
  });

  // Respond to consultation mutation
  const respondConsultMutation = useMutation({
    mutationFn: async ({
      consultId,
      status,
      scheduledAt,
      meetingLink,
      lawyerResponse,
    }: {
      consultId: string;
      status: "ACCEPTED" | "DECLINED";
      scheduledAt?: string;
      meetingLink?: string;
      lawyerResponse?: string;
    }) => {
      const res = await api.patch(`/consultations/${consultId}`, {
        status,
        scheduledAt,
        meetingLink,
        lawyerResponse,
      });
      return res.data;
    },
    onSuccess: () => {
      setAcceptingConsult(null);
      setScheduledTime("");
      setMeetingLink("");
      setLawyerResponse("");
      refetchConsults();
    },
  });

  const pendingConsults = (consultations || []).filter((c) => c.status === "PENDING");
  const confirmedConsults = (consultations || []).filter((c) => c.status === "ACCEPTED");

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-emerald-600/10 via-background to-primary/10 border border-border/80 shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Advocate Workspace
            </h1>
            <Badge variant="success" className="text-[10px] px-2.5 py-0.5 gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Bar Council Verified
            </Badge>
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
              Status: Accepting Clients
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Review shared citizen court dossiers, manage booked legal consultations, and collaborate via privileged
            dual-channel advisory notes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/lawyers">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 font-semibold bg-background/50 hover:bg-muted/50 border-border">
              <Users className="w-3.5 h-3.5" /> View Public Directory
            </Button>
          </Link>
          <Link to="/lawyer/onboarding">
            <Button variant="default" size="sm" className="text-xs gap-1.5 font-bold shadow-md shadow-primary/20">
              <Briefcase className="w-3.5 h-3.5" /> Bar Roll & Practice Areas
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card border-border/80 border-t-2 border-t-emerald-500 hover:border-emerald-500/50 transition-all shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Shared Client Cases</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FolderLock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{sharedCases?.length ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Dossiers with active citizen grants</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/80 border-t-2 border-t-amber-500 hover:border-amber-500/50 transition-all shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Consultations</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-500 flex items-center gap-2">
              {pendingConsults.length}
              {pendingConsults.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Awaiting your response</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/80 border-t-2 border-t-blue-500 hover:border-blue-500/50 transition-all shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Confirmed Sessions</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-400">{confirmedConsults.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Scheduled advisory appointments</p>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 1: CONSULTATION INBOX */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Consultation Inbox
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Respond to incoming citizen meeting requests and provide video room links or conference details.
              </CardDescription>
            </div>
            <Badge variant="accent" className="text-xs font-bold">
              {pendingConsults.length} New
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {consultsLoading ? (
            <div className="h-28 bg-muted/20 rounded-xl animate-pulse flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Loading consultations...</span>
            </div>
          ) : !consultations || consultations.length === 0 ? (
            <div className="py-10 px-6 text-center rounded-xl bg-card/40 border border-border/60 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-sm font-bold text-foreground">No Consultation Requests Yet</h4>
                <p className="text-xs text-muted-foreground">
                  When citizens search the advocate directory and book a session with you, their requests will appear here with instant accept/decline controls.
                </p>
              </div>
              <Link to="/lawyers">
                <Button variant="outline" size="sm" className="text-xs gap-1.5 font-medium mt-2">
                  <Users className="w-3.5 h-3.5" /> Check Your Public Directory Listing
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">
                        {c.citizen?.fullName || "Citizen Client"}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {c.mode === "ONLINE" ? "Video Call" : "In-Person"}
                      </Badge>
                      {c.status === "PENDING" ? (
                        <Badge variant="warning" className="text-[10px]">
                          Pending Acceptance
                        </Badge>
                      ) : c.status === "ACCEPTED" ? (
                        <Badge variant="success" className="text-[10px]">
                          Accepted
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Declined
                        </Badge>
                      )}
                    </div>

                    {c.citizenMessage && (
                      <p className="text-xs text-muted-foreground italic">"{c.citizenMessage}"</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span>Received {formatDate(c.createdAt)}</span>
                      {c.scheduledAt && (
                        <span>
                          • Scheduled: <strong>{formatDateTime(c.scheduledAt)}</strong>
                        </span>
                      )}
                      {c.meetingLink && (
                        <a
                          href={c.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <Video className="w-3 h-3" /> Meeting Link
                        </a>
                      )}
                    </div>
                  </div>

                  {c.status === "PENDING" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 text-xs font-bold gap-1"
                        onClick={() => {
                          setAcceptingConsult(c);
                          setMeetingLink("https://meet.google.com/new");
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          respondConsultMutation.mutate({ consultId: c.id, status: "DECLINED" })
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: SHARED CLIENT MATTERS */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <FolderLock className="w-4 h-4 text-primary" /> Active Shared Client Cases
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Dossiers where citizens have explicitly authorized you via cryptographically scoped access grants.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {sharedLoading ? (
            <div className="h-28 bg-muted/20 rounded-xl animate-pulse flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Loading shared dossiers...</span>
            </div>
          ) : !sharedCases || sharedCases.length === 0 ? (
            <div className="py-10 px-6 text-center rounded-xl bg-card/40 border border-border/60 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <FolderLock className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-sm font-bold text-foreground">No Shared Cases Yet</h4>
                <p className="text-xs text-muted-foreground">
                  When citizens grant you cryptographically scoped access to their case dossiers, they will appear here with instant access to claims, chronologies, and evidence vaults.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sharedCases.map((item) => (
                <div
                  key={item.grantId}
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {item.case?.caseNumber}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.case?.category?.name || "Dispute"}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        Client: {item.case?.owner?.fullName}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {item.case?.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span>Grant Valid Until: {formatDate(item.expiresAt)}</span>
                      <span>•</span>
                      <span>Scopes:</span>
                      {item.permissions.canViewSummary && (
                        <Badge variant="outline" className="text-[9px]">
                          Summary
                        </Badge>
                      )}
                      {item.permissions.canViewEvidence && (
                        <Badge variant="outline" className="text-[9px]">
                          Evidence
                        </Badge>
                      )}
                      {item.permissions.canDownload && (
                        <Badge variant="outline" className="text-[9px]">
                          PDF Download
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Link to={`/lawyer/cases/${item.case?.id}`}>
                    <Button variant="default" size="sm" className="h-8 text-xs font-bold gap-1.5 shrink-0">
                      Open Matter Workspace <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accept Consultation Modal */}
      <Dialog open={!!acceptingConsult} onOpenChange={() => setAcceptingConsult(null)}>
        <DialogContent onClose={() => setAcceptingConsult(null)}>
          <DialogHeader>
            <DialogTitle>Confirm & Schedule Consultation</DialogTitle>
            <DialogDescription>
              Set the meeting date and conference link for {acceptingConsult?.citizen?.fullName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Scheduled Date & Time *</label>
              <Input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Meeting Link / Video Room URL</label>
              <Input
                placeholder="e.g. https://meet.google.com/xyz-abcd-efg"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Message to Client (Optional)</label>
              <Input
                placeholder="e.g. Looking forward to discussing your tenancy matter. Please keep all receipts handy."
                value={lawyerResponse}
                onChange={(e) => setLawyerResponse(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setAcceptingConsult(null)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!scheduledTime}
              onClick={() => {
                if (acceptingConsult) {
                  respondConsultMutation.mutate({
                    consultId: acceptingConsult.id,
                    status: "ACCEPTED",
                    scheduledAt: scheduledTime,
                    meetingLink: meetingLink || undefined,
                    lawyerResponse: lawyerResponse.trim() || undefined,
                  });
                }
              }}
              isLoading={respondConsultMutation.isPending}
              className="font-bold gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Send Invite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
