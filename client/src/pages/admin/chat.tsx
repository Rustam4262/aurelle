import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface ChatThread {
  thread: {
    id: string;
    userId: string;
    status: string;
    lastMessageAt: string | null;
    createdAt: string;
  };
  userName: string;
  userEmail: string;
}

export default function AdminChat() {
  const { data, isLoading } = useQuery<{ threads: ChatThread[] }>({
    queryKey: ["/api/admin/chat/threads", { limit: 50 }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-semibold">Support Chat</h1>
        <p className="text-muted-foreground mt-2">Respond to user support requests</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat Threads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : !data?.threads || data.threads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No chat threads</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Message</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.threads.map(({ thread, userName, userEmail }) => (
                  <TableRow key={thread.id}>
                    <TableCell>
                      <p className="font-medium">{userName || "User"}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {userEmail}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={thread.status === "open" ? "default" : "outline"}
                      >
                        {thread.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {thread.lastMessageAt
                        ? format(new Date(thread.lastMessageAt), "MMM d, HH:mm")
                        : "No messages"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Open Chat</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
