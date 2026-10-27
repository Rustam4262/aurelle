import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/avatar-upload";
import type { Master, Review } from "@shared/schema";

export function MasterProfileSettings({ master }: { master: Master }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: master.name,
    phone: master.phone || "",
    photo: master.photo,
    experience: master.experience || 0,
    bio: { ru: master.bio?.ru || "", uz: master.bio?.uz || "", en: master.bio?.en || "" },
  });
  const save = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/master/profile", form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/master/me"] });
      toast({ title: t("marketplace.client.profileUpdated") });
    },
    onError: () => toast({ title: t("marketplace.client.error"), variant: "destructive" }),
  });
  return (
    <Card className="p-6">
      <form
        className="space-y-5 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <h2 className="text-lg font-semibold">{t("employeeMaster.profile")}</h2>
        <fieldset disabled={save.isPending} className="space-y-5">
          <AvatarUpload
            value={form.photo || undefined}
            onChange={(photo) => setForm((f) => ({ ...f, photo }))}
            onRemove={() => setForm((f) => ({ ...f, photo: null }))}
          />
          <label className="block space-y-2">
            <span>{t("employeeMaster.name")}</span>
            <Input
              required
              maxLength={200}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="block space-y-2">
            <span>{t("employeeMaster.phone")}</span>
            <Input
              type="tel"
              maxLength={20}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label className="block space-y-2">
            <span>{t("employeeMaster.experience")}</span>
            <Input
              type="number"
              required
              min={0}
              max={80}
              step={1}
              value={form.experience}
              onChange={(e) => setForm((f) => ({ ...f, experience: Number(e.target.value) }))}
            />
          </label>
          {(["ru", "uz", "en"] as const).map((lang) => (
            <label key={lang} className="block space-y-2">
              <span>
                {t("employeeMaster.bio")} ({lang.toUpperCase()})
              </span>
              <Textarea
                maxLength={3000}
                value={form.bio[lang]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bio: { ...f.bio, [lang]: e.target.value } }))
                }
              />
            </label>
          ))}
          <Button type="submit" disabled={save.isPending}>
            {t(save.isPending ? "employeeMaster.saving" : "marketplace.client.saveProfile")}
          </Button>
        </fieldset>
      </form>
    </Card>
  );
}

export function MasterReviews({ reviews }: { reviews: Review[] }) {
  const { t, i18n } = useTranslation();
  const rating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  return (
    <Card className="p-6 space-y-5">
      <h2 className="text-lg font-semibold">{t("employeeMaster.reviews")}</h2>
      <p>
        {rating
          ? `${rating} / 5 · ${t("employeeMaster.reviewCount", { count: reviews.length })}`
          : t("employeeMaster.empty")}
      </p>
      {reviews.map((review) => (
        <article key={review.id} className="rounded-lg border p-4 space-y-2">
          <p className="font-semibold text-amber-600">{review.rating} / 5</p>
          {review.comment && <p className="whitespace-pre-wrap break-words">{review.comment}</p>}
          <MasterReviewReply review={review} />
          {review.createdAt && (
            <time className="text-sm text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString(i18n.language)}
            </time>
          )}
        </article>
      ))}
    </Card>
  );
}

function MasterReviewReply({ review }: { review: Review }) {
 const { t } = useTranslation();
 const [response,setResponse]=useState(review.masterResponse || "");
 const save=useMutation({
 mutationFn:()=>apiRequest("PATCH", "/api/master/reviews/"+review.id+"/respond",{response}),
 onSuccess:()=>queryClient.invalidateQueries({queryKey:["/api/master/me"]}),
 });
 return <form className="space-y-2 border-t pt-3" onSubmit={e=>{e.preventDefault();save.mutate();}}>
 <label className="block space-y-2"><span className="text-sm font-medium">{t("employeeMaster.response")}</span><Textarea aria-label={t("employeeMaster.reply")} value={response} maxLength={3000} required onChange={e=>setResponse(e.target.value)} /></label>
 {save.isError && <p role="alert" className="text-destructive">{t("marketplace.client.error")}</p>}
 <Button type="submit" size="sm" disabled={save.isPending || !response.trim() || response.trim()===review.masterResponse}>{t(save.isPending ? "employeeMaster.saving" : "employeeMaster.saveReply")}</Button>
 </form>;
}
