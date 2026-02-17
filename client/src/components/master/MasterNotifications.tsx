import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, Calendar } from "lucide-react";
import type { Notification } from "@shared/schema";
import { logger } from "@/lib/logger";

interface MasterNotificationsProps {
  notifications: Notification[] | undefined;
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onViewBookings: () => void;
}

export function MasterNotifications({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onViewBookings,
}: MasterNotificationsProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
          <h4 className="font-medium text-sm">{t("marketplace.notifications.title")}</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
              {t("marketplace.notifications.markAllRead")}
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications && notifications.length > 0 ? (
            notifications.slice(0, 10).map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                  !notification.isRead ? "bg-muted/30" : ""
                }`}
                onClick={() => {
                  if (!notification.isRead) onMarkRead(notification.id);
                  if (notification.relatedId) onViewBookings();
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {t("marketplace.notifications.newBooking")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {(() => {
                        if (
                          notification.type === "new_booking" &&
                          notification.metadata?.bookingDate
                        ) {
                          try {
                            const parsedDate = new Date(notification.metadata.bookingDate);
                            if (!isNaN(parsedDate.getTime())) {
                              return t("marketplace.notifications.newBookingMessage", {
                                date: parsedDate.toLocaleDateString(
                                  currentLang === "ru"
                                    ? "ru-RU"
                                    : currentLang === "uz"
                                      ? "uz-UZ"
                                      : "en-US",
                                ),
                                time: notification.metadata.startTime || "",
                              });
                            }
                          } catch (error) {
                            logger.error("Failed to parse notification metadata", error as Error, {
                              source: "MasterNotifications",
                            });
                          }
                        }
                        return (
                          notification.message || t("marketplace.notifications.newBookingFallback")
                        );
                      })()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.createdAt!).toLocaleString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("marketplace.notifications.noNotifications")}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
