import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, TestTube } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function PushNotificationSettings() {
  const { t } = useTranslation();
  const {
    isSupported,
    permission,
    isSubscribed,
    isSubscribing,
    isUnsubscribing,
    subscribe,
    unsubscribe,
    sendTestNotification,
    isSendingTest,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("push.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>{t("push.notSupported")}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isSubscribed ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          {t("push.title")}
        </CardTitle>
        <CardDescription>{t("push.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission === "denied" && (
          <Alert variant="destructive">
            <AlertDescription>{t("push.permissionDenied")}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          {isSubscribed ? (
            <>
              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>{t("push.enabled")}</AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => unsubscribe()} disabled={isUnsubscribing}>
                  <BellOff className="h-4 w-4 mr-2" />
                  {isUnsubscribing ? t("common.loading") : t("push.disable")}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => sendTestNotification()}
                  disabled={isSendingTest}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {isSendingTest ? t("common.sending") : t("push.sendTest")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Alert>
                <BellOff className="h-4 w-4" />
                <AlertDescription>{t("push.disabled")}</AlertDescription>
              </Alert>

              <Button
                onClick={() => subscribe()}
                disabled={isSubscribing || permission === "denied"}
              >
                <Bell className="h-4 w-4 mr-2" />
                {isSubscribing ? t("common.loading") : t("push.enable")}
              </Button>
            </>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">{t("push.whatYouWillReceive")}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{t("push.newBookings")}</li>
            <li>{t("push.bookingReminders")}</li>
            <li>{t("push.reviewResponses")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
