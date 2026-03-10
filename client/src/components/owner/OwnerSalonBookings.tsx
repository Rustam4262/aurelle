import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Clock, Scissors } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Booking, Master } from "@shared/schema";

interface EnrichedOwnerBooking extends Booking {
  client?: { fullName?: string | null; avatarUrl?: string | null } | null;
  service?: { name: Record<string, string> | string } | null;
}

interface OwnerSalonBookingsProps {
  salonId: string;
}

export function OwnerSalonBookings({ salonId }: OwnerSalonBookingsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: bookings } = useQuery<EnrichedOwnerBooking[]>({
    queryKey: ["/api/owner/salons", salonId, "bookings"],
  });

  const { data: masters } = useQuery<Master[]>({
    queryKey: ["/api/owner/salons", salonId, "masters"],
  });

  const assignMasterMutation = useMutation({
    mutationFn: async ({ bookingId, masterId }: { bookingId: string; masterId: string | null }) => {
      return apiRequest("PATCH", `/api/owner/bookings/${bookingId}/assign-master`, { masterId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/salons", salonId, "bookings"] });
      toast({ title: t("marketplace.owner.masterAssigned") });
    },
    onError: (error: Error) => {
      toast({
        title: t("marketplace.owner.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="p-6">
      <h3 className="font-medium text-foreground mb-4">
        {t("marketplace.owner.upcomingBookings")}
      </h3>
      {bookings && bookings.length > 0 ? (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const assignedMaster = masters?.find((m) => m.id === booking.masterId);
            return (
              <div
                key={booking.id}
                className="flex items-start justify-between p-5 bg-muted/50 rounded-md gap-4"
                data-testid={`booking-item-${booking.id}`}
              >
                <div className="flex-1 space-y-2.5">
                  <div className="flex flex-wrap gap-3 items-center">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={booking.client?.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {booking.client?.fullName?.[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    {booking.client?.fullName && (
                      <span className="font-medium text-foreground">
                        {booking.client.fullName}
                      </span>
                    )}
                    {booking.service && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Scissors className="h-4 w-4" />
                        <span>
                          {typeof booking.service.name === "object" && booking.service.name
                            ? (booking.service.name as Record<string, string>)[t("language")] ||
                              (booking.service.name as Record<string, string>).en
                            : booking.service.name}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 items-center text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(booking.bookingDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {booking.startTime}
                    </span>
                    <Badge
                      variant={
                        booking.status === "confirmed"
                          ? "default"
                          : booking.status === "cancelled"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {t(`marketplace.booking.status.${booking.status}`)}
                    </Badge>
                  </div>

                  {assignedMaster && (
                    <p className="text-sm text-primary flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      {t("marketplace.owner.master")}: {assignedMaster.name}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span className="font-semibold text-foreground text-lg whitespace-nowrap">
                    {booking.priceSnapshot?.toLocaleString()} UZS
                  </span>
                  <Select
                    value={booking.masterId || "unassigned"}
                    onValueChange={(value) => {
                      const masterId = value === "unassigned" ? null : value;
                      assignMasterMutation.mutate({ bookingId: booking.id, masterId });
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t("marketplace.owner.selectMaster")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">{t("marketplace.owner.noMaster")}</SelectItem>
                      {masters?.map((master) => (
                        <SelectItem key={master.id} value={master.id}>
                          {master.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">
          {t("marketplace.owner.noBookings")}
        </p>
      )}
    </Card>
  );
}
