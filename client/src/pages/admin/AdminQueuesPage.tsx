import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw, Cpu, FileCheck, Layers } from "lucide-react";
import { api } from "../../lib/apiClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

interface QueueStatus {
  evidenceQueue?: Record<string, number>;
  aiAnalysisQueue?: Record<string, number>;
  pdfQueue?: Record<string, number>;
}

export function AdminQueuesPage() {
  const { data: queues, isLoading, refetch } = useQuery<QueueStatus>({
    queryKey: ["admin-queues-status"],
    queryFn: async () => {
      const res = await api.get<QueueStatus>("/admin/queues/status");
      return res.data || {};
    },
    refetchInterval: 5000,
  });

  const renderQueueCard = (
    title: string,
    description: string,
    icon: any,
    counts?: Record<string, number>
  ) => {
    const Icon = icon;
    const active = counts?.active || 0;
    const waiting = counts?.waiting || 0;
    const completed = counts?.completed || 0;
    const failed = counts?.failed || 0;

    return (
      <Card className="glass-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">{title}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">{description}</CardDescription>
              </div>
            </div>
            {active > 0 ? (
              <Badge variant="accent" className="text-[10px] animate-pulse">
                Active Workers
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                Idle / Ready
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 text-center pt-2">
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Waiting</span>
              <span className="text-base font-black text-foreground">{waiting}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-[10px] font-bold text-primary uppercase block">Active</span>
              <span className="text-base font-black text-primary">{active}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">
                Done
              </span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{completed}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <span className="text-[10px] font-bold text-destructive uppercase block">Failed</span>
              <span className="text-base font-black text-destructive">{failed}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">BullMQ Background Queue Health</h1>
          <p className="text-xs text-muted-foreground">
            Real-time Upstash Redis task queue monitoring for OCR extraction, audio speech-to-text, and PDF compilation.
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 text-xs gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Queues
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderQueueCard(
          "Evidence Pipeline",
          "Multimodal OCR & Deepgram Speech-to-Text",
          Cpu,
          queues?.evidenceQueue
        )}
        {renderQueueCard(
          "AI Synthesis Engine",
          "Gemini Fact Analysis & Timeline Chronology",
          Activity,
          queues?.aiAnalysisQueue
        )}
        {renderQueueCard(
          "PDF Packet Compiler",
          "Puppeteer Headless Dossier & SHA-256 Hashing",
          Layers,
          queues?.pdfQueue
        )}
      </div>
    </div>
  );
}
