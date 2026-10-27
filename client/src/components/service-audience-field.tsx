import { useId } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function AudienceSelect({
  value,
  onChange,
  disabled = false,
  required = true,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const { t } = useTranslation();
  const name = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-2" aria-describedby={`${name}-hint`}>
      <legend className="mb-2 text-sm font-medium text-foreground">
        {t("audience.serviceFor")}
      </legend>
      <div className="flex flex-wrap gap-2">
        {["women", "men", "unisex"].map((option) => (
          <label key={option} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              required={required}
              className="peer sr-only"
            />
            <span className="inline-flex min-h-11 items-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-wait peer-disabled:opacity-60">
              {t(`audience.${option}`)}
            </span>
          </label>
        ))}
      </div>
      <p id={`${name}-hint`} className="text-xs text-muted-foreground">
        {t("audience.ownerHint")}
      </p>
      {!value && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{t("audience.needsChoice")}</p>
      )}
    </fieldset>
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
        { audience: value },
      ),
    onSuccess: async () => {
      await cache.invalidateQueries();
      toast({ title: t("audience.saved") });
    },
    onError: () => toast({ title: t("audience.saveError"), variant: "destructive" }),
  });
  return (
    <div
      className="mt-3 rounded-lg border border-border p-3"
      onClick={(event) => event.stopPropagation()}
      aria-busy={mutation.isPending}
    >
      <AudienceSelect
        value={audience || ""}
        onChange={(value) => mutation.mutate(value)}
        disabled={mutation.isPending}
        required={false}
      />
      {mutation.isPending && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {t("audience.saving")}
        </p>
      )}
    </div>
  );
}
