import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  CheckSquare,
  Square,
  Plus,
  Send,
  Calendar,
  Clock,
  User,
  CheckCircle2,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/Dialog";
import { formatDateTime, formatDate } from "../../lib/utils";

interface Comment {
  id: string;
  caseId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    fullName: string;
    role: string;
  };
}

interface ActionItem {
  id: string;
  caseId: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  dueDate?: string | null;
  assignedTo?: {
    id: string;
    fullName: string;
  } | null;
  createdAt: string;
}

export function CaseCollaboration({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionTitle, setActionTitle] = useState("");
  const [actionDesc, setActionDesc] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");

  // Fetch comments
  const { data: comments, isLoading: commentsLoading, refetch: refetchComments } = useQuery<Comment[]>({
    queryKey: ["case-comments", caseId],
    queryFn: async () => {
      const res = await api.get<Comment[]>(`/cases/${caseId}/comments`);
      return res.data || [];
    },
  });

  // Fetch action items
  const { data: actionItems, isLoading: actionsLoading, refetch: refetchActions } = useQuery<ActionItem[]>({
    queryKey: ["case-action-items", caseId],
    queryFn: async () => {
      const res = await api.get<ActionItem[]>(`/cases/${caseId}/action-items`);
      return res.data || [];
    },
  });

  // Post Comment Mutation
  const postCommentMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/cases/${caseId}/comments`, {
        content: newComment.trim(),
        visibility: "SHARED_WITH_CITIZEN",
      });
      return res.data;
    },
    onSuccess: () => {
      setNewComment("");
      refetchComments();
    },
  });

  // Create Action Item Mutation
  const createActionMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/cases/${caseId}/action-items`, {
        title: actionTitle.trim(),
        description: actionDesc.trim() || undefined,
        dueDate: actionDueDate || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      setShowActionModal(false);
      setActionTitle("");
      setActionDesc("");
      setActionDueDate("");
      refetchActions();
    },
  });

  // Toggle Action Item Status Mutation
  const toggleActionMutation = useMutation({
    mutationFn: async ({ itemId, currentStatus }: { itemId: string; currentStatus: string }) => {
      const newStatus = currentStatus === "COMPLETED" ? "TODO" : "COMPLETED";
      const res = await api.patch(`/cases/${caseId}/action-items/${itemId}`, {
        status: newStatus,
      });
      return res.data;
    },
    onSuccess: () => {
      refetchActions();
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* SHARED ACTION PLAN */}
      <Card className="glass-card border-border flex flex-col justify-between">
        <div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Action Plan Checklist
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Key procedural steps, notices to draft, or filings agreed with your advocate.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setShowActionModal(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-2.5">
            {actionsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !actionItems || actionItems.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl text-xs text-muted-foreground">
                No active procedural tasks. Tasks added here keep your legal strategy on schedule.
              </div>
            ) : (
              actionItems.map((item) => {
                const isCompleted = item.status === "COMPLETED";
                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      toggleActionMutation.mutate({ itemId: item.id, currentStatus: item.status })
                    }
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isCompleted
                        ? "bg-muted/30 border-border/60 opacity-60 line-through"
                        : "bg-card border-border hover:border-primary/50"
                    }`}
                  >
                    <button className="mt-0.5 text-primary shrink-0" aria-label="Toggle task status">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>

                    <div className="space-y-0.5 flex-1 overflow-hidden">
                      <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</p>
                      )}
                      {item.dueDate && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3 text-accent" /> Due: {formatDate(item.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </div>
      </Card>

      {/* LAWYER-CITIZEN DIRECT COMMENTS */}
      <Card className="glass-card border-border flex flex-col justify-between">
        <div>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Matter Discussion Thread
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Direct communication between you and your appointed legal counsel.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="h-64 overflow-y-auto space-y-3 p-3 rounded-xl bg-muted/20 border border-border">
              {commentsLoading ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  Loading discussion messages...
                </div>
              ) : !comments || comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-xs text-muted-foreground space-y-1">
                  <span>No comments posted yet.</span>
                  <span>Share notes, clarify facts, or attach replies below.</span>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-card border border-border space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <User className="w-3 h-3 text-primary" /> {c.author?.fullName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTime(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </div>

        <div className="p-4 pt-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newComment.trim()) postCommentMutation.mutate();
            }}
            className="flex items-center gap-2"
          >
            <Input
              placeholder="Write a message to your advocate..."
              className="text-xs h-9"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={postCommentMutation.isPending}
            />
            <Button
              type="submit"
              size="sm"
              variant="default"
              className="h-9 px-3 gap-1 font-bold"
              disabled={!newComment.trim() || postCommentMutation.isPending}
              isLoading={postCommentMutation.isPending}
            >
              <Send className="w-3.5 h-3.5" /> Send
            </Button>
          </form>
        </div>
      </Card>

      {/* Add Action Item Modal */}
      <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
        <DialogContent onClose={() => setShowActionModal(false)}>
          <DialogHeader>
            <DialogTitle>Add Strategic Action Item</DialogTitle>
            <DialogDescription>
              Assign a task, evidence retrieval deadline, or filing milestone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Task Title *</label>
              <Input
                placeholder="e.g. Procure certified copy of bank ledger statement"
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Target Deadline</label>
              <Input
                type="date"
                value={actionDueDate}
                onChange={(e) => setActionDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Notes / Instructions</label>
              <Textarea
                placeholder="Any specific branch address or details required..."
                rows={3}
                value={actionDesc}
                onChange={(e) => setActionDesc(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowActionModal(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!actionTitle.trim()}
              onClick={() => createActionMutation.mutate()}
              isLoading={createActionMutation.isPending}
            >
              Create Action Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
