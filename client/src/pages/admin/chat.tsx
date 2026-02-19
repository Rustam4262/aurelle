import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Send, UserCheck, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ChatThread {
  thread: {
    id: string;
    userId: string;
    status: string;
    lastMessageAt: string | null;
    assignedAdminId?: string;
    createdAt: string;
  };
  userFirstName: string;
  userLastName: string;
  userEmail: string;
}

interface ChatMessage {
  message: {
    id: string;
    threadId: string;
    senderType: string;
    senderUserId: string;
    text: string;
    createdAt: string;
  };
  senderFirstName: string;
  senderLastName: string;
}

export default function AdminChat() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [closeReason, setCloseReason] = useState("");

  // Build query params
  const queryParams: Record<string, string> = { limit: "100" };
  if (statusFilter !== "all") queryParams.status = statusFilter;

  const { data: threadsData, isLoading: threadsLoading } = useQuery<{ threads: ChatThread[] }>({
    queryKey: ["/api/admin/chat/threads", queryParams],
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery<{ messages: ChatMessage[] }>({
    queryKey: ["/api/admin/chat/threads", selectedThread?.thread.id, "messages"],
    enabled: !!selectedThread,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ threadId, text }: { threadId: string; text: string }) => {
      const res = await apiRequest("POST", `/api/admin/chat/threads/${threadId}/messages`, { text });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/threads"] });
      setMessageText("");
      toast({ title: "Success", description: "Message sent" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    },
  });

  // Assign thread mutation
  const assignMutation = useMutation({
    mutationFn: async (threadId: string) => {
      const res = await apiRequest("PATCH", `/api/admin/chat/threads/${threadId}/assign`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/threads"] });
      toast({ title: "Success", description: "Thread assigned to you" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign thread", variant: "destructive" });
    },
  });

  // Close thread mutation
  const closeMutation = useMutation({
    mutationFn: async ({ threadId, reason }: { threadId: string; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/chat/threads/${threadId}/close`, {
        closeReason: reason,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/threads"] });
      toast({ title: "Success", description: "Thread closed" });
      setShowCloseDialog(false);
      setShowChatDialog(false);
      setSelectedThread(null);
      setCloseReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to close thread", variant: "destructive" });
    },
  });

  const handleSendMessage = () => {
    if (!selectedThread || !messageText.trim()) return;
    sendMessageMutation.mutate({
      threadId: selectedThread.thread.id,
      text: messageText,
    });
  };

  const handleAssign = (threadId: string) => {
    assignMutation.mutate(threadId);
  };

  const handleCloseThread = () => {
    if (!selectedThread || !closeReason.trim()) {
      toast({ title: "Error", description: "Please provide a close reason", variant: "destructive" });
      return;
    }
    closeMutation.mutate({
      threadId: selectedThread.thread.id,
      reason: closeReason,
    });
  };

  const openChatDialog = (thread: ChatThread) => {
    setSelectedThread(thread);
    setShowChatDialog(true);
  };

  const openCloseDialog = (thread: ChatThread) => {
    setSelectedThread(thread);
    setShowCloseDialog(true);
    setCloseReason("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-semibold">Support Chat</h1>
        <p className="text-muted-foreground mt-2">Respond to user support requests</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat Threads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {threadsLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : !threadsData?.threads || threadsData.threads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No chat threads</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Message</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {threadsData.threads.map(({ thread, userFirstName, userLastName, userEmail }) => (
                  <TableRow key={thread.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {userFirstName && userLastName
                            ? `${userFirstName} ${userLastName}`
                            : userEmail || "User"}
                        </p>
                        {userEmail && (
                          <p className="text-xs text-muted-foreground">{userEmail}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={thread.status === "open" ? "default" : "outline"}>
                        {thread.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {thread.lastMessageAt
                        ? format(new Date(thread.lastMessageAt), "MMM d, HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(thread.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!thread.assignedAdminId && thread.status === "open" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAssign(thread.id)}
                            disabled={assignMutation.isPending}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openChatDialog({ thread, userFirstName, userLastName, userEmail })}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Open
                        </Button>
                        {thread.status === "open" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCloseDialog({ thread, userFirstName, userLastName, userEmail })}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Close
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Chat Dialog */}
      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Support Chat</DialogTitle>
            <DialogDescription>
              {selectedThread && (
                <>
                  Chat with{" "}
                  {selectedThread.userFirstName && selectedThread.userLastName
                    ? `${selectedThread.userFirstName} ${selectedThread.userLastName}`
                    : selectedThread.userEmail}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px] pr-4">
              {messagesLoading ? (
                <div className="text-center py-8">Loading messages...</div>
              ) : !messagesData?.messages || messagesData.messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No messages yet</div>
              ) : (
                <div className="space-y-4">
                  {messagesData.messages.map(({ message, senderFirstName, senderLastName }) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderType === "admin" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.senderType === "admin"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <p className="text-xs opacity-70">
                            {senderFirstName && senderLastName
                              ? `${senderFirstName} ${senderLastName}`
                              : message.senderType === "admin"
                                ? "Admin"
                                : "User"}
                          </p>
                          <p className="text-xs opacity-70">
                            {format(new Date(message.createdAt), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <div className="flex gap-2">
              <Textarea
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={3}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending || !messageText.trim()}
                size="icon"
                className="h-auto"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChatDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Thread Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Thread</DialogTitle>
            <DialogDescription>
              Provide a reason for closing this support thread.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="close-reason">Close Reason *</Label>
              <Textarea
                id="close-reason"
                placeholder="Explain why this thread is being closed..."
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCloseThread}
              disabled={closeMutation.isPending || !closeReason.trim()}
            >
              {closeMutation.isPending ? "Closing..." : "Close Thread"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
