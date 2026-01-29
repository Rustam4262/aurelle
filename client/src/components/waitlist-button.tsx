import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Clock } from "lucide-react";

interface WaitlistButtonProps {
  salonId: string;
  serviceId: string;
  masterId?: string;
  disabled?: boolean;
}

export function WaitlistButton({ salonId, serviceId, masterId, disabled }: WaitlistButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTimeStart, setPreferredTimeStart] = useState("");
  const [preferredTimeEnd, setPreferredTimeEnd] = useState("");

  const joinWaitlistMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/waitlist", {
        salonId,
        serviceId,
        masterId,
        preferredDate: preferredDate || null,
        preferredTimeStart: preferredTimeStart || null,
        preferredTimeEnd: preferredTimeEnd || null,
      });
    },
    onSuccess: () => {
      toast({
        title: t("waitlist.joined"),
        description: t("waitlist.willNotify"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/waitlist/my-waitlist"] });
      setIsOpen(false);
      setPreferredDate("");
      setPreferredTimeStart("");
      setPreferredTimeEnd("");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("waitlist.joinError"),
        variant: "destructive",
      });
    },
  });

  const handleJoin = () => {
    joinWaitlistMutation.mutate();
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="w-full"
      >
        <Clock className="h-4 w-4 mr-2" />
        {t("waitlist.joinWaitlist")}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("waitlist.joinWaitlist")}</DialogTitle>
            <DialogDescription>{t("waitlist.description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preferred-date">
                {t("waitlist.preferredDate")} ({t("common.optional")})
              </Label>
              <Input
                id="preferred-date"
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time-start">
                  {t("waitlist.preferredTimeStart")} ({t("common.optional")})
                </Label>
                <Input
                  id="time-start"
                  type="time"
                  value={preferredTimeStart}
                  onChange={(e) => setPreferredTimeStart(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time-end">
                  {t("waitlist.preferredTimeEnd")} ({t("common.optional")})
                </Label>
                <Input
                  id="time-end"
                  type="time"
                  value={preferredTimeEnd}
                  onChange={(e) => setPreferredTimeEnd(e.target.value)}
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{t("waitlist.expiresIn")}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleJoin} disabled={joinWaitlistMutation.isPending}>
              {joinWaitlistMutation.isPending ? t("common.submitting") : t("waitlist.join")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
