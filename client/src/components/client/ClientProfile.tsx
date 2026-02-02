import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarUpload } from "@/components/avatar-upload";
import { Loader2, User, Calendar, Bell } from "lucide-react";
import type { UserProfile } from "@shared/schema";

const profileFormSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(200),
  phone: z.string().max(20).optional(),
  avatarUrl: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional(),
  gender: z.string().optional(),
  birthday: z.string().optional(),
  notifyEmail: z.boolean().optional(),
  notifyReminder24h: z.boolean().optional(),
  notifyReminder2h: z.boolean().optional(),
  notifyBookingUpdates: z.boolean().optional(),
  notifyPromotions: z.boolean().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ClientProfileProps {
  profileData: UserProfile;
}

export function ClientProfile({ profileData }: ClientProfileProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      avatarUrl: "",
      city: "",
      gender: "",
      birthday: "",
      notifyEmail: true,
      notifyReminder24h: true,
      notifyReminder2h: true,
      notifyBookingUpdates: true,
      notifyPromotions: false,
    },
  });

  useEffect(() => {
    if (profileData) {
      // Use efficient reset with all values
      form.reset({
        fullName: profileData.fullName || "",
        phone: profileData.phone || "",
        avatarUrl: profileData.avatarUrl || "",
        city: (profileData as any).city || "",
        gender: (profileData as any).gender || "",
        birthday: (profileData as any).birthday || "",
        notifyEmail: (profileData as any).notifyEmail ?? true,
        notifyReminder24h: (profileData as any).notifyReminder24h ?? true,
        notifyReminder2h: (profileData as any).notifyReminder2h ?? true,
        notifyBookingUpdates: (profileData as any).notifyBookingUpdates ?? true,
        notifyPromotions: (profileData as any).notifyPromotions ?? false,
      });
    }
  }, [profileData, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return apiRequest("PUT", "/api/client/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/profile"] });
      toast({ title: t("marketplace.client.profileUpdated") });
    },
    onError: () => {
      toast({ title: t("marketplace.client.error"), variant: "destructive" });
    },
  });

  const onSubmitProfile = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <Card className="p-6">
      <h2 className="font-serif text-lg text-foreground mb-6">
        {t("marketplace.client.editProfile")}
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitProfile)} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-24 w-24">
                <AvatarImage src={form.watch("avatarUrl") || profileData.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl">
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 w-full">
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("marketplace.client.avatar")}</FormLabel>
                    <FormControl>
                      <AvatarUpload
                        value={field.value || ""}
                        onChange={(url) => field.onChange(url)}
                        onRemove={() => field.onChange("")}
                        maxSize={5}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("marketplace.client.fullName")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("marketplace.client.fullNamePlaceholder")}
                    {...field}
                    data-testid="input-full-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("marketplace.client.phone")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("marketplace.client.phonePlaceholder")}
                    {...field}
                    value={field.value || ""}
                    data-testid="input-phone"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("marketplace.client.city")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("marketplace.client.cityPlaceholder")}
                    {...field}
                    value={field.value || ""}
                    data-testid="input-city"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("marketplace.client.gender")}</FormLabel>
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("marketplace.client.genderPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">{t("marketplace.client.male")}</SelectItem>
                      <SelectItem value="female">{t("marketplace.client.female")}</SelectItem>
                      <SelectItem value="other">{t("marketplace.client.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthday"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("marketplace.client.birthday")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(new Date(field.value), "dd.MM.yyyy")
                          ) : (
                            <span className="text-muted-foreground">
                              {t("marketplace.client.birthdayPlaceholder")}
                            </span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date?.toISOString().split("T")[0])}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromYear={1930}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {t("marketplace.client.notifications.title")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("marketplace.client.notifications.description")}
              </p>
            </div>

            <FormField
              control={form.control}
              name="notifyEmail"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("marketplace.client.notifications.email")}
                    </FormLabel>
                    <FormDescription>
                      {t("marketplace.client.notifications.emailDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notifyReminder24h"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("marketplace.client.notifications.reminder24h")}
                    </FormLabel>
                    <FormDescription>
                      {t("marketplace.client.notifications.reminder24hDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notifyReminder2h"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("marketplace.client.notifications.reminder2h")}
                    </FormLabel>
                    <FormDescription>
                      {t("marketplace.client.notifications.reminder2hDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notifyBookingUpdates"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("marketplace.client.notifications.bookingUpdates")}
                    </FormLabel>
                    <FormDescription>
                      {t("marketplace.client.notifications.bookingUpdatesDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notifyPromotions"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("marketplace.client.notifications.promotions")}
                    </FormLabel>
                    <FormDescription>
                      {t("marketplace.client.notifications.promotionsDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={updateProfileMutation.isPending}
            data-testid="button-save-profile"
          >
            {updateProfileMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {t("marketplace.client.saveProfile")}
          </Button>
        </form>
      </Form>
    </Card>
  );
}
