import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type Lang = "ru" | "uz" | "en";
type Labels = Record<string, Record<Lang, string>>;

// Booking, support-ticket and ticket-category labels in one place, so raw enum
// values like "confirmed" or "other" never leak into the interface.
const BOOKING: Labels = {
  pending: { ru: "Ожидает", uz: "Kutilmoqda", en: "Pending" },
  confirmed: { ru: "Подтверждена", uz: "Tasdiqlandi", en: "Confirmed" },
  completed: { ru: "Завершена", uz: "Yakunlandi", en: "Completed" },
  cancelled: { ru: "Отменена", uz: "Bekor qilindi", en: "Cancelled" },
  no_show: { ru: "Не пришёл", uz: "Kelmadi", en: "No-show" },
};

const TICKET: Labels = {
  open: { ru: "Открыто", uz: "Ochiq", en: "Open" },
  in_progress: { ru: "В работе", uz: "Jarayonda", en: "In progress" },
  waiting: { ru: "Ждёт ответа", uz: "Javob kutilmoqda", en: "Waiting" },
  resolved: { ru: "Решено", uz: "Hal qilindi", en: "Resolved" },
  closed: { ru: "Закрыто", uz: "Yopilgan", en: "Closed" },
};

const CATEGORY: Labels = {
  bug: { ru: "Ошибка", uz: "Xatolik", en: "Bug" },
  payment: { ru: "Оплата", uz: "To‘lov", en: "Payment" },
  question: { ru: "Вопрос", uz: "Savol", en: "Question" },
  suggestion: { ru: "Предложение", uz: "Taklif", en: "Suggestion" },
  account: { ru: "Аккаунт", uz: "Akkaunt", en: "Account" },
  moderation: { ru: "Модерация", uz: "Moderatsiya", en: "Moderation" },
  bookings: { ru: "Записи", uz: "Yozuvlar", en: "Bookings" },
  technical: { ru: "Техническое", uz: "Texnik", en: "Technical" },
  other: { ru: "Другое", uz: "Boshqa", en: "Other" },
};

const TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 ring-amber-500/25 dark:text-amber-300",
  waiting: "bg-amber-500/15 text-amber-600 ring-amber-500/25 dark:text-amber-300",
  open: "bg-sky-500/15 text-sky-600 ring-sky-500/25 dark:text-sky-300",
  in_progress: "bg-sky-500/15 text-sky-600 ring-sky-500/25 dark:text-sky-300",
  confirmed: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/25 dark:text-emerald-300",
  completed: "bg-primary/15 text-primary ring-primary/25",
  resolved: "bg-primary/15 text-primary ring-primary/25",
  cancelled: "bg-foreground/[0.06] text-muted-foreground ring-foreground/10",
  closed: "bg-foreground/[0.06] text-muted-foreground ring-foreground/10",
  no_show: "bg-destructive/10 text-destructive ring-destructive/25",
};

function pick(table: Labels, value: string | null | undefined, lang: string) {
  if (!value) return "";
  const l = (["ru", "uz", "en"].includes(lang) ? lang : "ru") as Lang;
  return table[value]?.[l] ?? value;
}

export function useStatusLabels() {
  const { i18n } = useTranslation();
  const lang = i18n.language || "ru";
  return {
    booking: (s?: string | null) => pick(BOOKING, s, lang),
    ticket: (s?: string | null) => pick(TICKET, s, lang),
    category: (s?: string | null) => pick(CATEGORY, s, lang),
  };
}

/** Colored pill with a status dot; `kind` picks the label dictionary. */
export function StatusPill({
  status,
  kind = "booking",
  className,
}: {
  status?: string | null;
  kind?: "booking" | "ticket";
  className?: string;
}) {
  const labels = useStatusLabels();
  if (!status) return null;
  const text = kind === "ticket" ? labels.ticket(status) : labels.booking(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        TONE[status] ?? "bg-muted text-muted-foreground ring-foreground/10",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {text}
    </span>
  );
}
