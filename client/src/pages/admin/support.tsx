import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Headphones, Send, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface Ticket {
  ticket: {
    id: string;
    userId: string;
    subject: string;
    category: string;
    status: string;
    priority: string;
    createdAt: string;
    updatedAt: string;
  };
  userFirstName: string;
  userLastName: string;
  userEmail: string;
}

interface TicketDetail extends Ticket {
  messages: {
    id: string;
    ticketId: string;
    senderId: string;
    senderType: string;
    message: string;
    createdAt: string;
  }[];
}

const CATEGORY_ICONS: Record<string, string> = {
  bug: "🐛",
  payment: "💳",
  question: "❓",
  suggestion: "💡",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "default",
  in_progress: "secondary",
  resolved: "outline",
  closed: "outline",
};

export default function AdminSupport() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("open");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");

  const params = statusFilter === "all" ? {} : { status: statusFilter };

  const { data, isLoading } = useQuery<{ tickets: Ticket[] }>({
    queryKey: ["/api/admin/support/tickets", params],
  });

  const { data: detail, isLoading: detailLoading } = useQuery<TicketDetail>({
    queryKey: ["/api/admin/support/tickets/" + selectedTicket?.ticket.id],
    enabled: !!selectedTicket,
  });

  const replyMutation = useMutation({
    mutationFn: (text: string) =>
      apiRequest("POST", `/api/admin/support/tickets/${selectedTicket!.ticket.id}/messages`, {
        message: text,
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets"] });
      setReplyText("");
      toast({ title: t("common.success"), description: t("adminSupport.replySent") });
    },
    onError: () =>
      toast({ title: t("common.error"), description: t("adminSupport.replyFailed"), variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PATCH", `/api/admin/support/tickets/${selectedTicket!.ticket.id}/status`, {
        status,
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets"] });
      setSelectedTicket(null);
      toast({ title: t("common.success"), description: t("adminSupport.statusUpdated") });
    },
    onError: () =>
      toast({ title: t("common.error"), description: t("adminSupport.statusFailed"), variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-semibold">{t("adminSupport.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("adminSupport.subtitle")}</p>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("adminSupport.allStatuses")}</SelectItem>
            <SelectItem value="open">{t("adminSupport.status.open")}</SelectItem>
            <SelectItem value="in_progress">{t("adminSupport.status.in_progress")}</SelectItem>
            <SelectItem value="resolved">{t("adminSupport.status.resolved")}</SelectItem>
            <SelectItem value="closed">{t("adminSupport.status.closed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            {t("adminSupport.tickets")}
            {data?.tickets?.length ? (
              <Badge variant="secondary">{data.tickets.length}</Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
          ) : !data?.tickets?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("adminSupport.noTickets")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("adminSupport.table.subject")}</TableHead>
                  <TableHead>{t("adminSupport.table.user")}</TableHead>
                  <TableHead>{t("adminSupport.table.category")}</TableHead>
                  <TableHead>{t("adminSupport.table.status")}</TableHead>
                  <TableHead>{t("adminSupport.table.created")}</TableHead>
                  <TableHead className="text-right">{t("adminSupport.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tickets.map((row) => (
                  <TableRow key={row.ticket.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {row.ticket.subject}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">
                          {row.userFirstName && row.userLastName
                            ? `${row.userFirstName} ${row.userLastName}`
                            : row.userEmail}
                        </p>
                        <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {CATEGORY_ICONS[row.ticket.category] ?? "📋"}{" "}
                        {t(`adminSupport.category.${row.ticket.category}`, row.ticket.category)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.ticket.status] ?? "outline"}>
                        {t(`adminSupport.status.${row.ticket.status}`, row.ticket.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(row.ticket.createdAt), "d MMM, HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTicket(row)}
                      >
                        {t("adminSupport.open")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ticket detail dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(o) => !o && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTicket && CATEGORY_ICONS[selectedTicket.ticket.category]}
              {selectedTicket?.ticket.subject}
            </DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>
                {selectedTicket?.userFirstName} {selectedTicket?.userLastName} &lt;{selectedTicket?.userEmail}&gt;
              </span>
              {selectedTicket && (
                <Badge variant={STATUS_VARIANT[selectedTicket.ticket.status] ?? "outline"} className="ml-2">
                  {t(`adminSupport.status.${selectedTicket.ticket.status}`, selectedTicket.ticket.status)}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0 max-h-[400px] border rounded-md p-3 bg-muted/30">
            {detailLoading ? (
              <p className="text-center text-muted-foreground text-sm py-4">{t("common.loading")}</p>
            ) : !detail?.messages?.length ? (
              <p className="text-center text-muted-foreground text-sm py-4">{t("adminSupport.noMessages")}</p>
            ) : (
              <div className="space-y-3">
                {detail.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        msg.senderType === "admin"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.senderType === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {format(new Date(msg.createdAt), "d MMM, HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Reply box — only when ticket is not closed/resolved */}
          {selectedTicket && !["resolved", "closed"].includes(selectedTicket.ticket.status) && (
            <div className="flex gap-2 mt-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t("adminSupport.replyPlaceholder")}
                rows={2}
                className="resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    if (replyText.trim()) replyMutation.mutate(replyText);
                  }
                }}
              />
              <Button
                onClick={() => replyText.trim() && replyMutation.mutate(replyText)}
                disabled={!replyText.trim() || replyMutation.isPending}
                size="icon"
                className="h-auto"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          <DialogFooter className="gap-2 mt-2">
            {selectedTicket && !["resolved", "closed"].includes(selectedTicket.ticket.status) && (
              <Button
                variant="outline"
                onClick={() => statusMutation.mutate("resolved")}
                disabled={statusMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {t("adminSupport.markResolved")}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setSelectedTicket(null)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
