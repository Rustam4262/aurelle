import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function AudienceSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {t("audience.serviceFor")}
      <select
        required
        aria-label={t("audience.serviceFor")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 rounded-lg border border-input bg-background px-3 text-foreground"
      >
        <option value="" disabled>
          {t("audience.unclassified")}
        </option>
        {["women", "men", "unisex"].map((value) => (
          <option key={value} value={value}>
            {t(`audience.${value}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ServiceAudienceField({
  serviceId,
  audience,
  salonId,
  solo = false,
}: {
  serviceId: string;
  audience?: string | null;
  salonId?: string;
  solo?: boolean;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: (value: string) =>
      apiRequest(
        "PATCH",
        solo
          ? `/api/solo-master/services/${serviceId}/audience`
          : `/api/owner/salons/${salonId}/services/${serviceId}/audience`,
        { audience: value || null },
      ),
    onSuccess: () => {
      void cache.invalidateQueries();
      toast({ title: t("audience.saved") });
    },
    onError: () => toast({ title: t("audience.saveError"), variant: "destructive" }),
  });
  return (
    <label
      className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
      onClick={(event) => event.stopPropagation()}
    >
      {t("audience.serviceFor")}
      <select
        aria-label={t("audience.serviceFor")}
        value={audience || ""}
        disabled={mutation.isPending}
        onChange={(event) => mutation.mutate(event.target.value)}
        className="min-h-10 rounded-lg border border-input bg-background px-3 text-foreground"
      >
        <option value="">{t("audience.unclassified")}</option>
        {["women", "men", "unisex"].map((value) => (
          <option key={value} value={value}>
            {t(`audience.${value}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
