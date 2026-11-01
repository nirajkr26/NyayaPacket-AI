import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Layers,
  Lock,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { formatDateTime } from "../../lib/utils";

export interface PacketVersion {
  id: string;
  caseId: string;
  version: number;
  storageKey: string;
  sha256: string;
  generatedAt: string;
}

export function PacketViewer({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [downloadingVersion, setDownloadingVersion] = useState<number | null>(null);

  // Fetch available packets
  const { data: packets, isLoading, refetch } = useQuery<PacketVersion[]>({
    queryKey: ["case-packets", caseId],
    queryFn: async () => {
      const res = await api.get<PacketVersion[]>(`/cases/${caseId}/packets`);
      return res.data || [];
    },
  });

  // Generate packet mutation
  const generatePacketMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/cases/${caseId}/packets/generate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-packets", caseId] });
      queryClient.invalidateQueries({ queryKey: ["case-details", caseId] });
      refetch();
    },
  });

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownload = async (version: number) => {
    setDownloadingVersion(version);
    try {
      const res = await api.get<{ downloadUrl: string }>(
        `/cases/${caseId}/packets/${version}/download`
      );
      if (res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, "_blank");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to download court packet");
    } finally {
      setDownloadingVersion(null);
    }
  };

  const latestPacket = packets && packets.length > 0 ? packets[0] : null;

  return (
    <div className="space-y-6">
      {/* Dossier Header Card */}
      <Card className="glass-card border-border overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="accent" className="text-[10px]">
                  Court-Ready PDF Dossier
                </Badge>
                {latestPacket && (
                  <Badge variant="success" className="text-[10px]">
                    v{latestPacket.version} Generated
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl font-bold text-foreground">
                Tamper-Evident Case Packet
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground max-w-xl">
                Compiles your verified statements, chronological timeline, involved party roster, and evidence
                integrity index into a signed court submission packet.
              </CardDescription>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => generatePacketMutation.mutate()}
              isLoading={generatePacketMutation.isPending}
              className="gap-2 font-bold shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              <span>{latestPacket ? "Recompile New Version" : "Compile Court Packet"}</span>
            </Button>
          </div>
        </CardHeader>

        {latestPacket && (
          <CardContent className="space-y-4">
            {/* SHA-256 Cryptographic Hash Banner */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> SHA-256 Tamper-Proof Cryptographic Digest
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Compiled {formatDateTime(latestPacket.generatedAt)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-background border border-border">
                <code className="text-xs font-mono text-foreground break-all">{latestPacket.sha256}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 shrink-0 text-xs gap-1"
                  onClick={() => handleCopyHash(latestPacket.sha256)}
                  title="Copy SHA-256 hash"
                >
                  {copiedHash === latestPacket.sha256 ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedHash === latestPacket.sha256 ? "Copied" : "Copy"}</span>
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground">
                This cryptographic fingerprint confirms the document was generated directly from your verified
                ledger and has not been altered or tampered with.
              </p>
            </div>

            {/* Quick Action Button to Download Latest */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="w-4 h-4 text-primary" />
                <span>Format: PDF with Embedded Verification Seals</span>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleDownload(latestPacket.version)}
                isLoading={downloadingVersion === latestPacket.version}
                className="gap-2 font-bold"
              >
                <Download className="w-4 h-4" /> Download Latest (v{latestPacket.version})
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Packet Version History */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" /> Dossier Version History ({packets?.length || 0})
        </h4>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse border border-border" />
            ))}
          </div>
        ) : !packets || packets.length === 0 ? (
          <Card className="glass-card p-8 text-center border-dashed border-border text-xs text-muted-foreground">
            No packet has been compiled yet. Click "Compile Court Packet" above once you have finished your intake
            and uploaded evidence.
          </Card>
        ) : (
          <div className="space-y-2.5">
            {packets.map((pkt) => (
              <Card
                key={pkt.id}
                className="glass-card border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-xs transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">Version {pkt.version}.0</span>
                    <Badge variant="outline" className="text-[10px]">
                      Official Dossier
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDateTime(pkt.generatedAt)}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[10px]">SHA: {pkt.sha256.slice(0, 16)}...</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => handleDownload(pkt.version)}
                    isLoading={downloadingVersion === pkt.version}
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
