import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  category: z.enum(["spam", "fraud", "abuse", "quality", "other"]),
  description: z.string().min(10, "Минимум 10 символов").max(2000),
});

type FormValues = z.infer<typeof formSchema>;

interface ComplaintDialogProps {
  targetType: "salon" | "master" | "user";
  targetId: string;
  targetName?: string;
}

export function ComplaintDialog({ targetType, targetId, targetName }: ComplaintDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { category: "quality", description: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      apiRequest("POST", "/api/complaints", { targetType, targetId, ...data }),
    onSuccess: () => {
      toast({
        title: t("complaint.submitted"),
        description: t("complaint.submittedDesc"),
      });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: t("complaint.error"),
        description: t("complaint.errorDesc"),
        variant: "destructive",
      });
    },
  });

  const categories = [
    { value: "quality", label: t("complaint.category.quality") },
    { value: "abuse", label: t("complaint.category.abuse") },
    { value: "fraud", label: t("complaint.category.fraud") },
    { value: "spam", label: t("complaint.category.spam") },
    { value: "other", label: t("complaint.category.other") },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5">
          <Flag className="h-4 w-4" />
          {t("complaint.report")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("complaint.title")}
            {targetName && (
              <span className="font-normal text-muted-foreground text-sm ml-2">— {targetName}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("complaint.categoryLabel")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("complaint.descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t("complaint.descriptionPlaceholder")}
                      rows={4}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? t("common.sending") : t("complaint.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
