import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Plus,
  RefreshCw,
  Clock,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/Dialog";
import { formatDate } from "../../lib/utils";

export interface TimelineSource {
  id: string;
  evidence?: {
    id: string;
    originalName: string;
    fileType: string;
  } | null;
  statement?: {
    id: string;
    type: string;
  } | null;
}

export interface TimelineEventItem {
  id: string;
  caseId: string;
  title: string;
  description?: string | null;
  eventDate?: string | null;
  verificationStatus:
    | "UNVERIFIED"
    | "CITIZEN_CONFIRMED"
    | "CITIZEN_CORRECTED"
    | "LAWYER_REVIEWED"
    | "DISPUTED";
  createdAt: string;
  sources?: TimelineSource[];
}

export function TimelineVerification({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyNote, setVerifyNote] = useState("");

  // New Event Form
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");

  // Fetch timeline events
  const { data: events, isLoading, refetch } = useQuery<TimelineEventItem[]>({
    queryKey: ["case-timeline", caseId],
    queryFn: async () => {
      const res = await api.get<TimelineEventItem[]>(`/cases/${caseId}/timeline`);
      return res.data || [];
    },
  });

  // Fetch verification snapshots
  const { data: verifications } = useQuery<any[]>({
    queryKey: ["case-verifications", caseId],
    queryFn: async () => {
      const res = await api.get<any[]>(`/cases/${caseId}/timeline/verifications`);
      return res.data || [];
    },
  });

  // AI Synthesis Mutation
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/cases/${caseId}/ai/analyze`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-timeline", caseId] });
      queryClient.invalidateQueries({ queryKey: ["case-details", caseId] });
      setTimeout(() => refetch(), 3000);
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      eventId,
      status,
    }: {
      eventId: string;
      status: "CITIZEN_CONFIRMED" | "CITIZEN_CORRECTED" | "DISPUTED";
    }) => {
      const res = await api.patch(`/cases/${caseId}/timeline/${eventId}`, {
        verificationStatus: status,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-timeline", caseId] });
    },
  });

  // Create Manual Event Mutation
  const createEventMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/cases/${caseId}/timeline`, {
        title: newEventTitle.trim(),
        eventDate: newEventDate || undefined,
        description: newEventDesc.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      setShowAddModal(false);
      setNewEventTitle("");
      setNewEventDate("");
      setNewEventDesc("");
      queryClient.invalidateQueries({ queryKey: ["case-timeline", caseId] });
    },
  });

  // Formal Case Verification Mutation
  const verifyCaseMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/cases/${caseId}/timeline/verify`, {
        verificationNote: verifyNote.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      setShowVerifyModal(false);
      setVerifyNote("");
      queryClient.invalidateQueries({ queryKey: ["case-timeline", caseId] });
      queryClient.invalidateQueries({ queryKey: ["case-verifications", caseId] });
      queryClient.invalidateQueries({ queryKey: ["case-details", caseId] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CITIZEN_CONFIRMED":
        return (
          <Badge variant="success" className="text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmed by You
          </Badge>
        );
      case "CITIZEN_CORRECTED":
        return (
          <Badge variant="accent" className="text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Corrected by You
          </Badge>
        );
      case "DISPUTED":
        return (
          <Badge variant="destructive" className="text-[10px]">
            <AlertTriangle className="w-3 h-3 mr-1" /> Contested / Disputed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[10px]">
            <Clock className="w-3 h-3 mr-1" /> Unverified Fact
          </Badge>
        );
    }
  };

  const isFormallyVerified = verifications && verifications.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Controls Banner */}
      <div className="p-5 rounded-2xl border border-border bg-gradient-to-r from-primary/5 via-background to-accent/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">Chronological Timeline & Provenance</h3>
            {isFormallyVerified ? (
              <Badge variant="success" className="text-[10px]">
                <ShieldCheck className="w-3 h-3 mr-1" /> Formally Certified (v{verifications[0].snapshotVersion})
              </Badge>
            ) : (
              <Badge variant="warning" className="text-[10px]">
                Verification Pending
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Review each synthesized event against uploaded evidentiary documents. Mark facts as confirmed, corrected,
            or disputed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => analyzeMutation.mutate()}
            isLoading={analyzeMutation.isPending}
            className="text-xs gap-1.5"
            title="Re-run Gemini AI to extract timeline facts from your evidence"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" /> AI Synthesize
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Manual Event
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setShowVerifyModal(true)}
            className="text-xs gap-1.5 font-bold shadow-sm"
          >
            <FileCheck className="w-3.5 h-3.5" /> Certify Case Facts
          </Button>
        </div>
      </div>

      {/* Timeline Stream */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/40 border border-border animate-pulse" />
          ))}
        </div>
      ) : !events || events.length === 0 ? (
        <Card className="glass-card p-12 text-center border-dashed border-border space-y-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">No Timeline Events Synthesized Yet</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Click "AI Synthesize" to analyze your interview statements and uploaded evidence, or manually add your
              first date.
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => analyzeMutation.mutate()}
            isLoading={analyzeMutation.isPending}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" /> Synthesize Timeline via Gemini
          </Button>
        </Card>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
          {events.map((event, idx) => (
            <div key={event.id} className="relative group">
              {/* Chronological node marker */}
              <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center text-[10px] font-bold text-primary shadow-xs">
                {idx + 1}
              </div>

              <Card className="glass-card border-border hover:shadow-md transition-all">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  {/* Event Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{event.title}</span>
                      {getStatusBadge(event.verificationStatus)}
                    </div>
                    {event.eventDate && (
                      <span className="text-xs font-semibold text-primary flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {formatDate(event.eventDate)}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {event.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {event.description}
                    </p>
                  )}

                  {/* Provenance source citations */}
                  {event.sources && event.sources.length > 0 && (
                    <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-muted-foreground font-semibold">Sources:</span>
                      {event.sources.map((src) => (
                        <Badge key={src.id} variant="outline" className="text-[10px] gap-1 font-mono">
                          {src.evidence ? `Doc: ${src.evidence.originalName}` : "Intake Statement"}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Verification Quick Action Toggles */}
                  <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">Verify this factual claim:</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant={event.verificationStatus === "CITIZEN_CONFIRMED" ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-[10px] px-2"
                        onClick={() =>
                          updateStatusMutation.mutate({ eventId: event.id, status: "CITIZEN_CONFIRMED" })
                        }
                      >
                        ✓ Confirm Fact
                      </Button>
                      <Button
                        variant={event.verificationStatus === "CITIZEN_CORRECTED" ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-[10px] px-2"
                        onClick={() =>
                          updateStatusMutation.mutate({ eventId: event.id, status: "CITIZEN_CORRECTED" })
                        }
                      >
                        Corrected
                      </Button>
                      <Button
                        variant={event.verificationStatus === "DISPUTED" ? "destructive" : "outline"}
                        size="sm"
                        className="h-7 text-[10px] px-2 text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          updateStatusMutation.mutate({ eventId: event.id, status: "DISPUTED" })
                        }
                      >
                        Dispute Claim
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Add Manual Event Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent onClose={() => setShowAddModal(false)}>
          <DialogHeader>
            <DialogTitle>Add Chronological Fact</DialogTitle>
            <DialogDescription>
              Record a specific event, communication, legal notice, or payment date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Event Title *</label>
              <Input
                placeholder="e.g. Received Final Demand Notice via Registered Speed Post"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Event Date</label>
              <Input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Factual Details</label>
              <Textarea
                placeholder="State what occurred, who was present, and what documents were exchanged..."
                rows={3}
                value={newEventDesc}
                onChange={(e) => setNewEventDesc(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!newEventTitle.trim()}
              onClick={() => createEventMutation.mutate()}
              isLoading={createEventMutation.isPending}
            >
              Add Timeline Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Formal Certification Snapshot Modal */}
      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent onClose={() => setShowVerifyModal(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Certify & Seal Case Verification
            </DialogTitle>
            <DialogDescription>
              Formally sign off on the factual accuracy of this case file prior to sharing with Bar Council advocates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground space-y-2">
              <p className="font-semibold">Statutory Verification Declaration:</p>
              <p className="text-muted-foreground leading-relaxed italic">
                "I hereby declare that the timeline events, monetary claims, and uploaded evidence in this matter are
                true and correct to the best of my personal knowledge and belief."
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Verification Endorsement Note (Optional)
              </label>
              <Input
                placeholder="e.g. Certified ready for advocate consultation and legal notice drafting"
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowVerifyModal(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => verifyCaseMutation.mutate()}
              isLoading={verifyCaseMutation.isPending}
              className="font-bold gap-1.5 shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Seal & Sign Off
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
