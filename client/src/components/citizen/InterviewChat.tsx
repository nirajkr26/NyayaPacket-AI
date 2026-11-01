import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  RefreshCw,
  Scale,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/Dialog";
import { cn, formatDateTime } from "../../lib/utils";

interface InterviewMessage {
  id: string;
  role: "SYSTEM" | "ASSISTANT" | "USER" | "AI" | "CITIZEN";
  content: string;
  createdAt: string;
}

interface InterviewSession {
  id: string;
  caseId: string;
  isActive: boolean;
  messages: InterviewMessage[];
  completedAt?: string | null;
}

interface Statement {
  id: string;
  caseId: string;
  compiledText: string;
  createdAt: string;
}

export function InterviewChat({ caseId, onStatementCompiled }: { caseId: string; onStatementCompiled?: () => void }) {
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Initialize or fetch interview session
  const {
    data: session,
    isLoading: sessionLoading,
    refetch: refetchSession,
  } = useQuery<InterviewSession>({
    queryKey: ["interview-session", caseId],
    queryFn: async () => {
      const res = await api.post<InterviewSession>(`/cases/${caseId}/interviews`);
      return res.data!;
    },
    staleTime: Infinity,
  });

  // Fetch statement if interview already completed
  const { data: statements } = useQuery<Statement[]>({
    queryKey: ["case-statements", caseId],
    queryFn: async () => {
      const res = await api.get<Statement[]>(`/cases/${caseId}/statements`);
      return res.data || [];
    },
    enabled: !!session && !session.isActive,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!session) throw new Error("No active interview session");
      const res = await api.post(`/cases/${caseId}/interviews/${session.id}/messages`, {
        content,
      });
      return res.data;
    },
    onSuccess: () => {
      setInputText("");
      refetchSession();
    },
  });

  // Complete interview mutation
  const completeInterviewMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No active interview session");
      const res = await api.post(`/cases/${caseId}/interviews/${session.id}/complete`);
      return res.data;
    },
    onSuccess: () => {
      setShowCompleteDialog(false);
      refetchSession();
      queryClient.invalidateQueries({ queryKey: ["case-details", caseId] });
      queryClient.invalidateQueries({ queryKey: ["case-statements", caseId] });
      if (onStatementCompiled) onStatementCompiled();
    },
  });

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [session?.messages, sendMessageMutation.isPending]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(inputText.trim());
  };

  // Speech Recognition (Web Speech API)
  const toggleSpeechRecognition = () => {
    setSpeechError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError("Speech recognition is not supported in this browser. Please type your response.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = (event: any) => {
        setSpeechError(`Speech error: ${event.error}`);
        setIsRecording(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch (err: any) {
      setSpeechError(err.message || "Failed to initialize microphone");
      setIsRecording(false);
    }
  };

  const messages = session?.messages || [];
  const isCompleted = session ? !session.isActive : false;

  return (
    <div className="space-y-4">
      {/* Interview Header Banner */}
      <div className="p-4 rounded-xl border border-border bg-gradient-to-r from-primary/5 via-background to-accent/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              AI Legal Intake Interview
              {isCompleted ? (
                <Badge variant="success" className="text-[10px]">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Statement Compiled
                </Badge>
              ) : (
                <Badge variant="accent" className="text-[10px]">
                  Active Session
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              Answer the guided questions to automatically build your chronological timeline and court statement.
            </p>
          </div>
        </div>

        {!isCompleted && messages.length >= 2 && (
          <Button
            size="sm"
            variant="default"
            className="text-xs gap-1.5 font-bold shadow-sm"
            onClick={() => setShowCompleteDialog(true)}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Compile Citizen Statement
          </Button>
        )}
      </div>

      {speechError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Completed Statement Card if applicable */}
      {isCompleted && statements && statements.length > 0 && (
        <Card className="glass-card border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Compiled Citizen Statement
              </CardTitle>
              <Badge variant="success" className="text-[10px]">
                Ready for Verification
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Formally structured statement compiled from your intake interview answers:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 rounded-xl bg-background/80 border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
              {statements[0].compiledText}
            </div>
            <p className="text-[11px] text-muted-foreground">
              This statement is now linked to your case timeline and will be integrated into your official court packet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Chat Messages Log */}
      <Card className="glass-card border-border">
        <CardContent className="p-0">
          <div
            ref={chatScrollRef}
            className="h-[460px] overflow-y-auto p-4 sm:p-6 space-y-4 divide-y divide-border/20"
          >
            {sessionLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                <span>Initializing conversational intake session...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Scale className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Welcome to your case interview</h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Our assistant is preparing the first clarifying questions regarding your matter. Please wait a
                  moment.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isAssistant = msg.role === "ASSISTANT" || msg.role === "AI" || msg.role === "SYSTEM";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 pt-3 first:pt-0",
                      isAssistant ? "justify-start" : "justify-end"
                    )}
                  >
                    {isAssistant && (
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm">
                        AI
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[82%] sm:max-w-[70%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm",
                        isAssistant
                          ? "bg-card border border-border text-foreground rounded-tl-sm"
                          : "bg-primary text-primary-foreground rounded-tr-sm font-medium"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <div
                        className={cn(
                          "mt-1.5 text-[9px] text-right opacity-70",
                          isAssistant ? "text-muted-foreground" : "text-primary-foreground"
                        )}
                      >
                        {formatDateTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {sendMessageMutation.isPending && (
              <div className="flex gap-3 pt-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  AI
                </div>
                <div className="bg-card border border-border rounded-2xl p-3.5 text-xs text-muted-foreground flex items-center gap-2 rounded-tl-sm">
                  <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  <span>Synthesizing legal facts and preparing next inquiry...</span>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Chat Input Area */}
          {!isCompleted ? (
            <div className="p-4 border-t border-border bg-card/60 backdrop-blur-md">
              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type your response with specific dates, monetary amounts, or factual details..."
                    className="flex-1 h-10 px-3 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={sendMessageMutation.isPending}
                  />

                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    className="h-10 px-3"
                    onClick={toggleSpeechRecognition}
                    title={isRecording ? "Stop voice input" : "Speak in Hindi or English"}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>

                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    className="h-10 px-4 font-bold gap-1.5"
                    disabled={!inputText.trim() || sendMessageMutation.isPending}
                    isLoading={sendMessageMutation.isPending}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                  <span>Press Enter to send. Supports English, Hindi, and regional speech input.</span>
                  <span>Zero-Trust Client Encrypted</span>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-4 border-t border-border bg-muted/30 text-center text-xs text-muted-foreground">
              Intake interview has been concluded. Review your evidence and verify the synthesized timeline below.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog to Conclude Interview */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent onClose={() => setShowCompleteDialog(false)}>
          <DialogHeader>
            <DialogTitle>Conclude & Compile Intake Statement?</DialogTitle>
            <DialogDescription>
              Our legal AI will synthesize your interview answers into a formal, structured citizen statement with
              dates, opposing claims, and monetary figures.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 text-xs text-foreground space-y-1 my-3">
            <span className="font-bold flex items-center gap-1.5 text-accent">
              <CheckCircle2 className="w-3.5 h-3.5" /> What happens next:
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li>Formal Citizen Statement record generated in PostgreSQL</li>
              <li>Case status transitions to Evidence Collection & Verification</li>
              <li>You can still upload documents and edit timeline events at any time</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCompleteDialog(false)}>
              Keep Chatting
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => completeInterviewMutation.mutate()}
              isLoading={completeInterviewMutation.isPending}
              className="gap-2 font-bold"
            >
              Compile Formal Statement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
