import { useLocation } from "wouter";
import { MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useMessengerCopy } from "@/lib/messenger-copy";
import { apiRequest } from "@/lib/queryClient";

export function MessengerLink({
  userId,
  recipientId,
}: {
  userId?: string;
  recipientId?: string | null;
}) {
  const [, navigate] = useLocation();
  const c = useMessengerCopy();
  const chats = useQuery<{ unread: number }[]>({
    queryKey: ["messenger", userId, "chats"],
    queryFn: async () => (await apiRequest("GET", "/api/messenger/conversations")).json(),
    enabled: !!userId && !recipientId,
    refetchInterval: 30000,
    retry: false,
  });
  const unread = chats.data?.reduce((n, x) => n + x.unread, 0) || 0;
  return (
    <Button
      variant="outline"
      className="gap-2 shrink-0"
      onClick={() =>
        navigate(recipientId ? `/messenger?to=${encodeURIComponent(recipientId)}` : "/messenger")
      }
    >
      <MessageCircle className="h-4 w-4" />
      <span>{recipientId ? c.write : c.title}</span>
      {unread > 0 && (
        <span className="rounded-full bg-primary text-primary-foreground px-1.5 text-xs">
          {unread}
        </span>
      )}
    </Button>
  );
}
