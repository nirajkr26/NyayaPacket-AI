import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  FolderLock,
  Sparkles,
  FileText,
  Calendar,
  Layers,
  KeyRound,
  MessageSquare,
  ShieldCheck,
  Clock,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card, CardContent } from "../../components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatDate } from "../../lib/utils";

// Tab Subcomponents
import { InterviewChat } from "../../components/citizen/InterviewChat";
import { EvidenceManager } from "../../components/citizen/EvidenceManager";
import { TimelineVerification } from "../../components/citizen/TimelineVerification";
import { PacketViewer } from "../../components/citizen/PacketViewer";
import { ConsultationAndGrants } from "../../components/citizen/ConsultationAndGrants";
import { CaseCollaboration } from "../../components/citizen/CaseCollaboration";

export interface CaseDetail {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  description?: string | null;
  incidentDate?: string | null;
  city?: string | null;
  state?: string | null;
  createdAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  parties?: Array<{
    id: string;
    name: string;
    relationship?: string | null;
    organization?: string | null;
  }>;
}

export function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [activeTab, setActiveTab] = useState("interview");

  const { data: caseData, isLoading, refetch } = useQuery<CaseDetail>({
    queryKey: ["case-details", caseId],
    queryFn: async () => {
      const res = await api.get<CaseDetail>(`/cases/${caseId}`);
      return res.data!;
    },
    enabled: !!caseId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-12 w-96 rounded-xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!caseData || !caseId) {
    return (
      <div className="p-12 text-center border rounded-2xl glass-panel space-y-4">
        <h3 className="text-lg font-bold text-foreground">Matter Not Found</h3>
        <p className="text-xs text-muted-foreground">The requested case record does not exist or access is restricted.</p>
        <Link to="/dashboard">
          <Button variant="default" size="sm">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

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
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to All Cases
          </Button>
        </Link>
      </div>

      {/* Case Header Dossier Banner */}
      <Card className="glass-card border-border overflow-hidden relative">
        <CardContent className="p-6 sm:p-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                {caseData.caseNumber}
              </span>
              <Badge variant="outline" className="text-xs">
                {caseData.category?.name}
              </Badge>
              {getStatusBadge(caseData.status)}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {caseData.incidentDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Incident: {formatDate(caseData.incidentDate)}
                </span>
              )}
              {caseData.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {caseData.city}, {caseData.state || "India"}
                </span>
              )}
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {caseData.title}
          </h1>

          {/* Involved Parties snippet if present */}
          {caseData.parties && caseData.parties.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs">
              <span className="text-muted-foreground font-semibold">Opposing / Involved Parties:</span>
              {caseData.parties.map((p) => (
                <Badge key={p.id} variant="secondary" className="text-xs">
                  {p.name} {p.relationship ? `(${p.relationship})` : ""}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 w-full h-auto p-1 gap-1">
          <TabsTrigger value="interview" className="gap-1.5 text-xs py-2">
            <Sparkles className="w-3.5 h-3.5" /> AI Interview
          </TabsTrigger>
          <TabsTrigger value="evidence" className="gap-1.5 text-xs py-2">
            <FileText className="w-3.5 h-3.5" /> Evidence ({caseData.parties?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5 text-xs py-2">
            <Calendar className="w-3.5 h-3.5" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="packet" className="gap-1.5 text-xs py-2">
            <Layers className="w-3.5 h-3.5" /> Court Packet
          </TabsTrigger>
          <TabsTrigger value="advocates" className="gap-1.5 text-xs py-2">
            <KeyRound className="w-3.5 h-3.5" /> Advocates & Access
          </TabsTrigger>
          <TabsTrigger value="collaboration" className="gap-1.5 text-xs py-2">
            <MessageSquare className="w-3.5 h-3.5" /> Collaboration
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: AI Intake Interview */}
        <TabsContent value="interview" className="focus-visible:outline-none">
          <InterviewChat
            caseId={caseId}
            onStatementCompiled={() => {
              refetch();
              setActiveTab("evidence");
            }}
          />
        </TabsContent>

        {/* Tab 2: Evidence & Documents */}
        <TabsContent value="evidence" className="focus-visible:outline-none">
          <EvidenceManager caseId={caseId} />
        </TabsContent>

        {/* Tab 3: Timeline & Verification */}
        <TabsContent value="timeline" className="focus-visible:outline-none">
          <TimelineVerification caseId={caseId} />
        </TabsContent>

        {/* Tab 4: Court PDF Packet */}
        <TabsContent value="packet" className="focus-visible:outline-none">
          <PacketViewer caseId={caseId} />
        </TabsContent>

        {/* Tab 5: Advocates & Access Grants */}
        <TabsContent value="advocates" className="focus-visible:outline-none">
          <ConsultationAndGrants caseId={caseId} />
        </TabsContent>

        {/* Tab 6: Collaboration & Action Plan */}
        <TabsContent value="collaboration" className="focus-visible:outline-none">
          <CaseCollaboration caseId={caseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
