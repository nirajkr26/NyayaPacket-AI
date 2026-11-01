import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FolderLock,
  Calendar,
  FileText,
  Lock,
  MessageSquare,
  CheckSquare,
  Eye,
  Send,
  User,
  ShieldCheck,
  Download,
  AlertTriangle,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatDate, formatDateTime } from "../../lib/utils";

interface SharedWorkspaceData {
  case: {
    id: string;
    caseNumber: string;
    title: string;
    status: string;
    description?: string | null;
    incidentDate?: string | null;
    city?: string | null;
    state?: string | null;
    owner: {
      id: string;
      fullName: string;
      email: string;
      phone?: string | null;
    };
    category?: { name: string };
    parties?: Array<{ id: string; name: string; relationship?: string | null }>;
    timelineEvents?: Array<{
      id: string;
      title: string;
      description?: string | null;
      eventDate?: string | null;
      verificationStatus: string;
    }>;
    actionItems?: Array<{
      id: string;
      title: string;
      status: string;
      dueDate?: string | null;
    }>;
  };
  permissions: {
    canViewSummary: boolean;
    canViewEvidence: boolean;
    canDownload: boolean;
  };
}

export function SharedCaseWorkspacePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("timeline");
  const [commentChannel, setCommentChannel] = useState<"SHARED_WITH_CITIZEN" | "PRIVATE_LAWYER_NOTE">(
    "SHARED_WITH_CITIZEN"
  );
  const [commentInput, setCommentInput] = useState("");

  // Fetch shared workspace data
  const { data, isLoading } = useQuery<SharedWorkspaceData>({
    queryKey: ["lawyer-shared-case", caseId],
    queryFn: async () => {
      const res = await api.get<SharedWorkspaceData>(`/lawyers/me/shared-cases/${caseId}`);
      return res.data!;
    },
    enabled: !!caseId,
  });

  // Fetch comments
  const { data: comments, refetch: refetchComments } = useQuery<any[]>({
    queryKey: ["case-comments", caseId],
    queryFn: async () => {
      const res = await api.get<any[]>(`/cases/${caseId}/comments`);
      return res.data || [];
    },
    enabled: !!caseId,
  });

  // Post comment mutation
  const postCommentMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/cases/${caseId}/comments`, {
        content: commentInput.trim(),
        visibility: commentChannel,
      });
      return res.data;
    },
    onSuccess: () => {
      setCommentInput("");
      refetchComments();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data || !data.case) {
    return (
      <div className="p-12 text-center border rounded-2xl glass-panel space-y-4">
        <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Access Restricted or Grant Expired</h3>
        <p className="text-xs text-muted-foreground">
          You do not possess an active access grant from the client to review this matter.
        </p>
        <Link to="/lawyer/dashboard">
          <Button variant="default" size="sm">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const { case: caseRecord, permissions } = data;
  const filteredComments = (comments || []).filter((c) => c.visibility === commentChannel);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/lawyer/dashboard">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Advocate Dashboard
        </Button>
      </Link>

      {/* Case Header Dossier Banner */}
      <Card className="glass-card border-border">
        <CardContent className="p-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                {caseRecord.caseNumber}
              </span>
              <Badge variant="outline" className="text-xs">
                {caseRecord.category?.name}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Client: {caseRecord.owner?.fullName}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>Your Authorized Scopes:</span>
              {permissions.canViewSummary && <Badge variant="outline">Summary</Badge>}
              {permissions.canViewEvidence && <Badge variant="outline">Evidence</Badge>}
              {permissions.canDownload && <Badge variant="outline">Download</Badge>}
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-foreground">{caseRecord.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/50">
            <span>Client Email: <strong className="text-foreground">{caseRecord.owner?.email}</strong></span>
            {caseRecord.owner?.phone && (
              <span>Client Phone: <strong className="text-foreground">{caseRecord.owner.phone}</strong></span>
            )}
            {caseRecord.city && (
              <span>Jurisdiction: <strong>{caseRecord.city}, {caseRecord.state || "India"}</strong></span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="timeline" className="text-xs gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Timeline & Facts
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Advocate Notes
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs gap-1.5">
            <CheckSquare className="w-3.5 h-3.5" /> Action Plan
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Timeline & Facts */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="glass-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground">Verified Case Chronology</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Chronological ledger of events attested by the citizen client:
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!caseRecord.timelineEvents || caseRecord.timelineEvents.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-xl text-xs text-muted-foreground">
                  No chronological events recorded on this matter yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {caseRecord.timelineEvents.map((ev, idx) => (
                    <div key={ev.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground">
                          {idx + 1}. {ev.title}
                        </span>
                        {ev.eventDate && (
                          <span className="text-xs text-primary font-semibold">{formatDate(ev.eventDate)}</span>
                        )}
                      </div>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{ev.description}</p>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        Status: {ev.verificationStatus}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Dual Channel Notes */}
        <TabsContent value="notes" className="space-y-4">
          <Card className="glass-card border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Matter Notes & Communication</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Switch between client discussion and privileged internal work product:
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={commentChannel === "SHARED_WITH_CITIZEN" ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setCommentChannel("SHARED_WITH_CITIZEN")}
                  >
                    Client Discussion
                  </Button>
                  <Button
                    variant={commentChannel === "PRIVATE_LAWYER_NOTE" ? "destructive" : "outline"}
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => setCommentChannel("PRIVATE_LAWYER_NOTE")}
                  >
                    <Lock className="w-3 h-3" /> Confidential Internal Notes
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {commentChannel === "PRIVATE_LAWYER_NOTE" && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>
                    Privileged Attorney Work Product: Notes posted here are strictly encrypted and invisible to the client.
                  </span>
                </div>
              )}

              <div className="h-64 overflow-y-auto space-y-3 p-3 rounded-xl bg-muted/20 border border-border">
                {filteredComments.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    No notes in this channel. Write a note or instruction below.
                  </div>
                ) : (
                  filteredComments.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-card border border-border space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <User className="w-3 h-3 text-emerald-600" /> {c.author?.fullName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (commentInput.trim()) postCommentMutation.mutate();
                }}
                className="flex items-center gap-2"
              >
                <Input
                  placeholder={
                    commentChannel === "PRIVATE_LAWYER_NOTE"
                      ? "Write private legal strategy / defense notes..."
                      : "Write message to client..."
                  }
                  className="text-xs h-9"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  className="h-9 px-3 gap-1 font-bold"
                  disabled={!commentInput.trim() || postCommentMutation.isPending}
                >
                  <Send className="w-3.5 h-3.5" /> Post
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Action Items */}
        <TabsContent value="actions">
          <Card className="glass-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground">Procedural Action Tasks</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Action items tracked collaboratively for this dispute:
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!caseRecord.actionItems || caseRecord.actionItems.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-xl text-xs text-muted-foreground">
                  No action tasks currently logged.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {caseRecord.actionItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-border bg-card flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">{item.title}</p>
                        {item.dueDate && (
                          <span className="text-[11px] text-muted-foreground">Due: {formatDate(item.dueDate)}</span>
                        )}
                      </div>
                      <Badge variant={item.status === "COMPLETED" ? "success" : "secondary"}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
