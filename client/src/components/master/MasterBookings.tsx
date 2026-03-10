import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Check, X, Loader2 } from "lucide-react";
import type { EnrichedBooking } from "@/hooks/use-master-data";

interface MasterBookingsProps {
  bookings: EnrichedBooking[];
  isLoading: boolean;
  onConfirm: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  isUpdating: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function MasterBookings({
  bookings,
  isLoading,
  onConfirm,
  onComplete,
  onCancel,
  isUpdating,
}: MasterBookingsProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all");

  const filteredBookings =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h3 className="font-medium text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t("marketplace.master.manageBookings")}
        </h3>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "pending", "confirmed", "completed", "cancelled"].map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {t(`marketplace.master.filter.${status}`)}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="p-4 bg-muted/50 rounded-md transition-all hover:shadow-md hover:bg-muted/70"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={booking.clientAvatar ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {booking.client
                          ? booking.client.firstName[0]
                          : booking.clientName?.[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-medium text-foreground">
                      {booking.client
                        ? `${booking.client.firstName} ${booking.client.lastName}`
                        : booking.clientName ?? `${t("marketplace.master.client")} #${booking.clientId.slice(-6)}`}
                    </p>
                    <Badge
                      className={STATUS_COLORS[booking.status || "pending"] || ""}
                      variant="secondary"
                    >
                      {t(`marketplace.master.status.${booking.status || "pending"}`)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(booking.bookingDate).toLocaleDateString()} | {booking.startTime} -{" "}
                    {booking.endTime}
                  </p>
                  <p className="text-sm text-foreground">
                    {booking.priceSnapshot.toLocaleString()} UZS
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {booking.status === "pending" && (
                    <Button size="sm" onClick={() => onConfirm(booking.id)} disabled={isUpdating}>
                      <Check className="h-4 w-4 mr-1" />
                      {t("marketplace.master.confirm")}
                    </Button>
                  )}
                  {booking.status === "confirmed" && (
                    <Button size="sm" onClick={() => onComplete(booking.id)} disabled={isUpdating}>
                      <Check className="h-4 w-4 mr-1" />
                      {t("marketplace.master.complete")}
                    </Button>
                  )}
                  {(booking.status === "pending" || booking.status === "confirmed") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCancel(booking.id)}
                      disabled={isUpdating}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t("marketplace.master.cancel")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          {t("marketplace.master.noBookings")}
        </p>
      )}
    </Card>
  );
}
