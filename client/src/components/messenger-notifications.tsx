import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { MessageCircle, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useMessengerCopy } from "@/lib/messenger-copy";
import { Button } from "@/components/ui/button";

export function MessengerNotifications() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const { data: user } = useQuery<{ id: string } | null>({
    queryKey: ["messenger-notification-user", location],
    queryFn: async () => {
      const response = await fetch("/api/auth/user", { credentials: "include" });
      if (!response.ok) return null;
      return response.json();
    },
    retry: false,
  });
  const c = useMessengerCopy();
  const [dismissed, setDismissed] = useState("");
  const chats = useQuery<{ id: string; name: string; unread: number; lastIncomingId: number }[]>({
    queryKey: ["messenger", user?.id, "chats"],
    queryFn: async () => (await apiRequest("GET", "/api/messenger/conversations")).json(),
    enabled: !!user,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    retry: false,
  });
  const selected = location === "/messenger" ? new URLSearchParams(search).get("chat") : null;
  const pending = chats.data?.filter((x) => x.unread > 0 && x.id !== selected) || [];
  const signature = `${user?.id}:${pending.map((x) => `${x.id}:${x.lastIncomingId}`).join(",")}`;
  if (!user || chats.isError || !pending.length || dismissed === signature) return null;
  const total = pending.reduce((sum, x) => sum + x.unread, 0);
  return (
    <aside role="status" aria-live="polite" className="fixed z-50 bottom-5 right-4 left-4 sm:left-auto sm:w-80 rounded-2xl border bg-background shadow-xl p-3 flex items-center gap-2">
      <Button variant="ghost" className="flex-1 min-w-0 h-auto justify-start gap-3 text-left whitespace-normal" onClick={() => navigate(`/messenger?chat=${pending[0].id}`)}>
        <MessageCircle className="text-primary h-6 w-6 shrink-0" />
        <span className="min-w-0"><span className="block font-semibold">{c.newMessages} · {total}</span><span className="block truncate text-xs text-muted-foreground">{pending[0].name}</span></span>
      </Button>
      <Button variant="ghost" size="icon" aria-label={c.dismiss} onClick={() => setDismissed(signature)}><X className="h-4 w-4" /></Button>
    </aside>
  );
}
