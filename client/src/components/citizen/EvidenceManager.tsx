import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Music,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Eye,
  Copy,
  Check,
  Shield,
  RefreshCw,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/Dialog";
import { formatBytes, formatDate } from "../../lib/utils";

export interface EvidenceItem {
  id: string;
  caseId: string;
  originalName: string;
  mimeType: string;
  fileSize: string;
  fileType: "DOCUMENT" | "IMAGE" | "AUDIO" | "VIDEO";
  sha256: string;
  description?: string | null;
  processingStatus: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  extractedText?: string | null;
  ocrConfidence?: number | null;
  transcription?: string | null;
  createdAt: string;
}

export function EvidenceManager({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [viewingEvidence, setViewingEvidence] = useState<EvidenceItem | null>(null);

  // Fetch evidence items for the case
  const { data: evidenceItems, isLoading, refetch } = useQuery<EvidenceItem[]>({
    queryKey: ["case-evidence", caseId],
    queryFn: async () => {
      const res = await api.get<EvidenceItem[]>(`/cases/${caseId}/evidence`);
      return res.data || [];
    },
    refetchInterval: (query) => {
      // Auto-poll every 4s if any evidence item is in QUEUED or PROCESSING state
      const hasPending = query.state.data?.some(
        (e) => e.processingStatus === "QUEUED" || e.processingStatus === "PROCESSING"
      );
      return hasPending ? 4000 : false;
    },
  });

  // Calculate client-side SHA-256 hash using Web Crypto API
  const computeSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  // Determine EvidenceType enum based on MIME type
  const getEvidenceType = (mime: string): "DOCUMENT" | "IMAGE" | "AUDIO" => {
    if (mime.startsWith("image/")) return "IMAGE";
    if (mime.startsWith("audio/")) return "AUDIO";
    return "DOCUMENT";
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadError(null);
      setUploadProgress(10);

      // 1. Compute SHA-256 client-side
      const sha256 = await computeSHA256(file);
      setUploadProgress(25);

      const fileType = getEvidenceType(file.type);

      // 2. Obtain presigned upload URL from backend
      const presignedRes = await api.post<{ uploadUrl: string; storageKey: string }>(
        `/cases/${caseId}/evidence/upload-url`,
        {
          originalName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          fileType,
        }
      );

      const { uploadUrl, storageKey } = presignedRes.data!;
      setUploadProgress(50);

      // 3. Upload binary directly to S3 via presigned PUT URL
      await axios.put(uploadUrl, file, {
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round(50 + (progressEvent.loaded / progressEvent.total) * 40);
            setUploadProgress(pct);
          }
        },
      });

      setUploadProgress(90);

      // 4. Confirm completion & trigger processing job
      const completeRes = await api.post(`/cases/${caseId}/evidence/complete`, {
        storageKey,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        fileType,
        sha256,
      });

      setUploadProgress(100);
      return completeRes.data;
    },
    onSuccess: () => {
      setTimeout(() => setUploadProgress(null), 1000);
      queryClient.invalidateQueries({ queryKey: ["case-evidence", caseId] });
      queryClient.invalidateQueries({ queryKey: ["case-details", caseId] });
    },
    onError: (err: any) => {
      setUploadProgress(null);
      setUploadError(err?.message || "Failed to upload evidence file");
    },
  });

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    uploadMutation.mutate(file);
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownload = async (evidenceId: string) => {
    try {
      const res = await api.get<{ downloadUrl: string }>(
        `/cases/${caseId}/evidence/${evidenceId}/download`
      );
      if (res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, "_blank");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to generate download link");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="success" className="text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Verified & Parsed
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="accent" className="text-[10px] animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> OCR Extracting...
          </Badge>
        );
      case "QUEUED":
        return (
          <Badge variant="secondary" className="text-[10px]">
            <Clock className="w-3 h-3 mr-1" /> Queued
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="text-[10px]">
            <AlertCircle className="w-3 h-3 mr-1" /> Extraction Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "IMAGE":
        return <ImageIcon className="w-5 h-5 text-accent" />;
      case "AUDIO":
        return <Music className="w-5 h-5 text-emerald-500" />;
      default:
        return <FileText className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-primary" /> Upload Evidentiary Records
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              SHA-256 Cryptographic Sealed
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Upload rent receipts, WhatsApp chat screenshots, notices, invoices, or audio recordings. Files are
            client-hashed and stored in private S3 vaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-150 ${
              isDragging
                ? "border-primary bg-primary/10 scale-[0.99]"
                : "border-border hover:border-primary/50 hover:bg-muted/20"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.doc,.docx"
            />
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-foreground">
              Click to select or drag and drop evidentiary documents
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Supports PDF, PNG, JPG, WEBP, MP3, WAV (Max 100MB per file)
            </p>
          </div>

          {/* Upload Progress Bar */}
          {uploadProgress !== null && (
            <div className="mt-4 p-4 rounded-xl bg-muted/40 border border-border space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Hashing & Secure Uploading to S3...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {uploadError && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evidence List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            Uploaded Evidence Items ({evidenceItems?.length || 0})
          </h3>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 text-xs gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse border border-border" />
            ))}
          </div>
        ) : !evidenceItems || evidenceItems.length === 0 ? (
          <Card className="glass-card p-8 text-center border-dashed border-border text-xs text-muted-foreground">
            No evidence documents attached to this case yet. Upload contracts, notices, or payment proofs above.
          </Card>
        ) : (
          <div className="space-y-2.5">
            {evidenceItems.map((item) => (
              <Card
                key={item.id}
                className="glass-card border-border hover:shadow-sm transition-all p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* File info */}
                <div className="flex items-start sm:items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    {getFileIcon(item.fileType)}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-xs font-bold text-foreground truncate" title={item.originalName}>
                      {item.originalName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{formatBytes(parseInt(item.fileSize, 10))}</span>
                      <span>•</span>
                      <span>{formatDate(item.createdAt)}</span>
                      <span>•</span>
                      <button
                        onClick={() => handleCopyHash(item.sha256)}
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground bg-muted/60 px-1.5 py-0.5 rounded transition-colors"
                        title="Click to copy full SHA-256 hash"
                      >
                        <Shield className="w-2.5 h-2.5 text-accent" />
                        <span>{item.sha256.slice(0, 10)}...</span>
                        {copiedHash === item.sha256 ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {getStatusBadge(item.processingStatus)}

                  {(item.extractedText || item.transcription) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => setViewingEvidence(item)}
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect OCR
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => handleDownload(item.id)}
                    title="Download original file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Inspect OCR / Transcript Modal */}
      <Dialog open={!!viewingEvidence} onOpenChange={() => setViewingEvidence(null)}>
        <DialogContent className="max-w-2xl" onClose={() => setViewingEvidence(null)}>
          {viewingEvidence && (
            <div className="space-y-4 pt-2">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-primary" />
                  Extracted Intelligence: {viewingEvidence.originalName}
                </DialogTitle>
                <DialogDescription className="font-mono text-[11px]">
                  SHA-256: {viewingEvidence.sha256}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Extracted Text / Transcript
                </span>
                <div className="p-4 rounded-xl bg-muted/50 border border-border text-xs leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap font-sans">
                  {viewingEvidence.extractedText ||
                    viewingEvidence.transcription ||
                    "No textual content recognized."}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
                <span>Processed via Multimodal AI Pipeline</span>
                <Button variant="outline" size="sm" onClick={() => setViewingEvidence(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
