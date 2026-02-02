import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Plus,
  Bug,
  CreditCard,
  HelpCircle,
  Lightbulb,
  Clock,
  CheckCircle2,
  ChevronRight,
  Send,
  ArrowLeft,
  Loader2,
  X,
} from "lucide-react";
import type { SupportTicket, SupportMessage } from "@shared/schema";

interface TicketWithCounts extends SupportTicket {
  messageCount: number;
  unreadCount: number;
}

interface TicketWithMessages extends SupportTicket {
  messages: SupportMessage[];
}

const categoryIcons = {
  bug: Bug,
  payment: CreditCard,
  question: HelpCircle,
  suggestion: Lightbulb,
};

const categoryColors = {
  bug: "text-red-500 bg-red-100 dark:bg-red-900/20",
  payment: "text-blue-500 bg-blue-100 dark:bg-blue-900/20",
  question: "text-purple-500 bg-purple-100 dark:bg-purple-900/20",
  suggestion: "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20",
};

const statusColors = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export function ClientSupport() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newTicketDialogOpen, setNewTicketDialogOpen] = useState(false);
  const [newTicketCategory, setNewTicketCategory] = useState<string | null>(null);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");

  const { data: tickets, isLoading: ticketsLoading } = useQuery<TicketWithCounts[]>({
    queryKey: ["/api/client/support/tickets"],
  });

  const { data: selectedTicket, isLoading: ticketLoading } = useQuery<TicketWithMessages>({
    queryKey: ["/api/client/support/tickets", selectedTicketId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/client/support/tickets/${selectedTicketId}`);
      return res.json();
    },
    enabled: !!selectedTicketId,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: { subject: string; category: string; message: string }) => {
      return apiRequest("POST", "/api/client/support/tickets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/support/tickets"] });
      toast({ title: t("marketplace.client.support.ticketCreated") });
      setNewTicketDialogOpen(false);
      setNewTicketCategory(null);
      setNewTicketSubject("");
      setNewTicketMessage("");
    },
    onError: () => {
      toast({ title: t("marketplace.client.error"), variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      return apiRequest("POST", `/api/client/support/tickets/${ticketId}/messages`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/client/support/tickets", selectedTicketId],
      });
      setReplyMessage("");
    },
    onError: () => {
      toast({ title: t("marketplace.client.error"), variant: "destructive" });
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      return apiRequest("PATCH", `/api/client/support/tickets/${ticketId}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/support/tickets"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/client/support/tickets", selectedTicketId],
      });
      toast({ title: t("marketplace.client.support.ticketClosed") });
    },
    onError: () => {
      toast({ title: t("marketplace.client.error"), variant: "destructive" });
    },
  });

  const quickCategories = [
    {
      id: "bug",
      icon: Bug,
      label: t("marketplace.client.support.types.bug"),
      color: categoryColors.bug,
    },
    {
      id: "payment",
      icon: CreditCard,
      label: t("marketplace.client.support.types.payment"),
      color: categoryColors.payment,
    },
    {
      id: "question",
      icon: HelpCircle,
      label: t("marketplace.client.support.types.question"),
      color: categoryColors.question,
    },
    {
      id: "suggestion",
      icon: Lightbulb,
      label: t("marketplace.client.support.types.suggestion"),
      color: categoryColors.suggestion,
    },
  ];

  const handleCreateTicket = () => {
    if (!newTicketCategory || !newTicketSubject.trim() || !newTicketMessage.trim()) return;
    createTicketMutation.mutate({
      subject: newTicketSubject,
      category: newTicketCategory,
      message: newTicketMessage,
    });
  };

  const handleSendReply = () => {
    if (!selectedTicketId || !replyMessage.trim()) return;
    sendMessageMutation.mutate({ ticketId: selectedTicketId, message: replyMessage });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString(
      i18n.language === "ru" ? "ru-RU" : i18n.language === "uz" ? "uz-UZ" : "en-US",
      { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
    );
  };

  // Ticket detail view
  if (selectedTicketId && selectedTicket) {
    const CategoryIcon =
      categoryIcons[selectedTicket.category as keyof typeof categoryIcons] || HelpCircle;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTicketId(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="font-medium truncate">{selectedTicket.subject}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[selectedTicket.status as keyof typeof statusColors]}>
                {t(`marketplace.client.support.status.${selectedTicket.status}`)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDate(selectedTicket.createdAt)}
              </span>
            </div>
          </div>
          {selectedTicket.status !== "closed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => closeTicketMutation.mutate(selectedTicketId)}
              disabled={closeTicketMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              {t("marketplace.client.support.closeTicket")}
            </Button>
          )}
        </div>

        {/* Messages */}
        <Card className="flex flex-col h-[500px]">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {selectedTicket.messages?.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.senderType === "user" ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback
                      className={
                        message.senderType === "admin" ? "bg-primary text-primary-foreground" : ""
                      }
                    >
                      {message.senderType === "admin" ? "S" : "Y"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.senderType === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    <p
                      className={`text-xs mt-1 ${message.senderType === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    >
                      {formatDate(message.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Reply input */}
          {selectedTicket.status !== "closed" && (
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder={t("marketplace.client.support.typeMessage")}
                  className="min-h-[60px] resize-none"
                />
                <Button
                  onClick={handleSendReply}
                  disabled={!replyMessage.trim() || sendMessageMutation.isPending}
                  className="self-end"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Ticket list view
  return (
    <div className="space-y-6">
      {/* Quick Categories */}
      <Card className="p-6">
        <h3 className="font-serif text-lg mb-4">{t("marketplace.client.support.newTicket")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickCategories.map((cat) => (
            <button
              key={cat.id}
              className={`p-4 rounded-lg ${cat.color} hover:opacity-80 transition-opacity text-center`}
              onClick={() => {
                setNewTicketCategory(cat.id);
                setNewTicketDialogOpen(true);
              }}
            >
              <cat.icon className="h-6 w-6 mx-auto mb-2" />
              <p className="text-sm font-medium">{cat.label}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Ticket List */}
      <div className="space-y-4">
        <h3 className="font-serif text-lg">{t("marketplace.client.support.myTickets")}</h3>

        {ticketsLoading ? (
          <Card className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </Card>
        ) : !tickets || tickets.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">
              {t("marketplace.client.support.noTickets")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t("marketplace.client.support.noTicketsDesc")}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const CategoryIcon =
                categoryIcons[ticket.category as keyof typeof categoryIcons] || HelpCircle;

              return (
                <Card
                  key={ticket.id}
                  className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-full ${categoryColors[ticket.category as keyof typeof categoryColors]}`}
                    >
                      <CategoryIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{ticket.subject}</h4>
                        {ticket.unreadCount > 0 && (
                          <Badge variant="default" className="rounded-full px-2 py-0 text-xs">
                            {ticket.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={statusColors[ticket.status as keyof typeof statusColors]}
                          variant="secondary"
                        >
                          {t(`marketplace.client.support.status.${ticket.status}`)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(ticket.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* New Ticket Dialog */}
      <Dialog open={newTicketDialogOpen} onOpenChange={setNewTicketDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("marketplace.client.support.createTicket")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t("marketplace.client.support.category")}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {quickCategories.map((cat) => (
                  <button
                    key={cat.id}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      newTicketCategory === cat.id
                        ? "border-primary bg-primary/10"
                        : "border-transparent bg-muted hover:bg-accent"
                    }`}
                    onClick={() => setNewTicketCategory(cat.id)}
                  >
                    <cat.icon
                      className={`h-5 w-5 mx-auto ${newTicketCategory === cat.id ? "text-primary" : ""}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t("marketplace.client.support.subject")}
              </label>
              <Input
                value={newTicketSubject}
                onChange={(e) => setNewTicketSubject(e.target.value)}
                placeholder={t("marketplace.client.support.subjectPlaceholder")}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t("marketplace.client.support.message")}
              </label>
              <Textarea
                value={newTicketMessage}
                onChange={(e) => setNewTicketMessage(e.target.value)}
                placeholder={t("marketplace.client.support.messagePlaceholder")}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTicketDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateTicket}
              disabled={
                !newTicketCategory ||
                !newTicketSubject.trim() ||
                !newTicketMessage.trim() ||
                createTicketMutation.isPending
              }
            >
              {createTicketMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t("marketplace.client.support.createTicket")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
