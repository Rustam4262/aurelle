import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, Users, Clock, TrendingUp } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";

interface OnlineUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  lastActivityAt: string;
  loginAt: string;
  deviceType: string;
}

interface UserSession {
  session: {
    id: string;
    userId: string;
    sessionId: string;
    loginAt: string;
    logoutAt: string | null;
    lastActivityAt: string;
    ipAddress: string;
    deviceType: string;
    browser: string;
    os: string;
    durationSeconds: number;
    actionsCount: number;
  };
  userEmail: string;
  userFirstName: string;
  userLastName: string;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function AdminActivity() {
  const { t } = useTranslation();
  const [activeOnlyFilter, setActiveOnlyFilter] = useState<string>("false");

  // Get online users
  const { data: onlineData, isLoading: onlineLoading } = useQuery<{
    onlineUsers: OnlineUser[];
    count: number;
  }>({
    queryKey: ["/api/admin/activity/online"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get sessions
  const queryParams: Record<string, string> = { limit: "100" };
  if (activeOnlyFilter === "true") queryParams.activeOnly = "true";

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery<{
    sessions: UserSession[];
  }>({
    queryKey: ["/api/admin/activity/sessions", queryParams],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-semibold">User Activity</h1>
        <p className="text-muted-foreground mt-2">
          Monitor user sessions and activity in real-time
        </p>
      </div>

      {/* Online Users Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Currently Online
            {onlineData && (
              <Badge variant="default" className="ml-2">
                {onlineData.count}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {onlineLoading ? (
            <div className="text-center py-8">Loading online users...</div>
          ) : !onlineData?.onlineUsers || onlineData.onlineUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users currently online
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {onlineData.onlineUsers.map((user) => (
                <div
                  key={user.userId}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.email}
                      </p>
                      {user.email && (
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {user.deviceType}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Active {formatDistanceToNow(new Date(user.lastActivityAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Logged in {formatDistanceToNow(new Date(user.loginAt), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              User Sessions
            </CardTitle>
            <div className="w-48">
              <Select value={activeOnlyFilter} onValueChange={setActiveOnlyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">All Sessions</SelectItem>
                  <SelectItem value="true">Active Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="text-center py-12">Loading sessions...</div>
          ) : !sessionsData?.sessions || sessionsData.sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No sessions found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Login Time</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionsData.sessions.map(({ session, userEmail, userFirstName, userLastName }) => (
                    <TableRow key={session.id}>
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
                        {session.logoutAt ? (
                          <Badge variant="outline">Ended</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(session.loginAt), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {session.logoutAt
                          ? formatDuration(session.durationSeconds)
                          : formatDuration(
                              Math.floor(
                                (new Date().getTime() - new Date(session.loginAt).getTime()) / 1000
                              )
                            )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {session.deviceType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {session.browser}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {session.ipAddress || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {session.actionsCount} actions
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
