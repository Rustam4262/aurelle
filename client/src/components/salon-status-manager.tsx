import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  ExternalLink,
} from "lucide-react";
import type { Salon } from "@shared/schema";

interface SalonStatusManagerProps {
  salon: Salon;
}

type SalonStatus = "draft" | "active" | "paused";

const STATUS_INFO: Record<SalonStatus, {
  label: string;
  icon: React.ElementType;
  color: "default" | "success" | "warning" | "destructive";
  description: string;
}> = {
  draft: {
    label: "Draft",
    icon: Clock,
    color: "default",
    description: "Salon is not visible to clients. Add at least 1 service and 1 master to activate.",
  },
  active: {
    label: "Active",
    icon: CheckCircle2,
    color: "success",
    description: "Salon is live and visible to clients in the marketplace.",
  },
  paused: {
    label: "Paused",
    icon: AlertTriangle,
    color: "warning",
    description: "Salon is temporarily hidden from clients. You can reactivate it anytime.",
  },
};

export function SalonStatusManager({ salon }: SalonStatusManagerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<SalonStatus>(
    (salon.status as SalonStatus) || "draft"
  );

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: SalonStatus) => {
      return apiRequest("PATCH", `/api/owner/salons/${salon.id}/status`, {
        status: newStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/owner/salons/${salon.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/salons"] });
      toast({
        title: t("salonStatus.updated"),
        description: t("salonStatus.updateSuccess"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("salonStatus.updateFailed"),
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus as SalonStatus);
  };

  const handleSave = () => {
    if (selectedStatus === (salon.status as SalonStatus)) {
      toast({
        title: t("salonStatus.noChanges"),
        description: t("salonStatus.noChangesDescription"),
      });
      return;
    }

    // Check if trying to activate without services/masters
    if (selectedStatus === "active") {
      // This would need to be checked via API or passed as prop
      // For now, we'll allow the backend to validate
    }

    updateStatusMutation.mutate(selectedStatus);
  };

  const currentStatus = (salon.status as SalonStatus) || "draft";
  const statusConfig = STATUS_INFO[currentStatus];
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusIcon className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium text-foreground">{t("salonStatus.title")}</h3>
        </div>
        <Badge variant={statusConfig.color as any}>
          {t(`salonStatus.${currentStatus}`)}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            {t(`salonStatus.${currentStatus}Description`)}
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="status-select">{t("salonStatus.changeStatus")}</Label>
          <Select value={selectedStatus} onValueChange={handleStatusChange}>
            <SelectTrigger id="status-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{t("salonStatus.draft")}</span>
                </div>
              </SelectItem>
              <SelectItem value="active">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{t("salonStatus.active")}</span>
                </div>
              </SelectItem>
              <SelectItem value="paused">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{t("salonStatus.paused")}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {selectedStatus !== currentStatus && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                {t(`salonStatus.${selectedStatus}Description`)}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={selectedStatus === currentStatus || updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? t("common.saving") : t("common.save")}
          </Button>

          {currentStatus === "active" && (
            <Button variant="outline" asChild>
              <a href={`/salon/${salon.id}`} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-2" />
                {t("salonStatus.viewPublicPage")}
                <ExternalLink className="h-3 w-3 ml-2" />
              </a>
            </Button>
          )}
        </div>

        {currentStatus === "draft" && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                  {t("salonStatus.activationRequired")}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  {t("salonStatus.activationRequiredDescription")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
