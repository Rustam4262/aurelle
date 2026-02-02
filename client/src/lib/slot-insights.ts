/**
 * Slot Insights Utility
 * Provides smart analysis of time slots for better UX
 */

export interface TimeSlotAnalysis {
  period: "morning" | "midday" | "afternoon" | "evening";
  isPrimeTime: boolean;
  heatLevel: "cold" | "warm" | "hot";
  label: string;
  icon: string;
}

export interface DayInsights {
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  primeTimeAvailable: number;
  bestPeriod: string;
  recommendation: string;
  dayQuality: "excellent" | "good" | "limited" | "full";
  peakHours: string;
}

// Time period definitions
const TIME_PERIODS = {
  morning: { start: 9, end: 12, label: "morning", icon: "🌅" },
  midday: { start: 12, end: 14, label: "midday", icon: "☀️" },
  afternoon: { start: 14, end: 17, label: "afternoon", icon: "🌤️" },
  evening: { start: 17, end: 21, label: "evening", icon: "🌙" },
} as const;

// Prime time hours (highest demand)
const PRIME_TIME_HOURS = [11, 12, 13, 14, 15, 16];

/**
 * Analyze a single time slot
 */
export function analyzeTimeSlot(time: string): TimeSlotAnalysis {
  const hour = parseInt(time.split(":")[0]);

  let period: TimeSlotAnalysis["period"] = "morning";
  let label: string = TIME_PERIODS.morning.label;
  let icon: string = TIME_PERIODS.morning.icon;

  if (hour >= TIME_PERIODS.evening.start) {
    period = "evening";
    label = TIME_PERIODS.evening.label;
    icon = TIME_PERIODS.evening.icon;
  } else if (hour >= TIME_PERIODS.afternoon.start) {
    period = "afternoon";
    label = TIME_PERIODS.afternoon.label;
    icon = TIME_PERIODS.afternoon.icon;
  } else if (hour >= TIME_PERIODS.midday.start) {
    period = "midday";
    label = TIME_PERIODS.midday.label;
    icon = TIME_PERIODS.midday.icon;
  }

  const isPrimeTime = PRIME_TIME_HOURS.includes(hour);

  let heatLevel: TimeSlotAnalysis["heatLevel"] = "cold";
  if (isPrimeTime) {
    heatLevel = "hot";
  } else if (hour >= 10 && hour <= 17) {
    heatLevel = "warm";
  }

  return { period, isPrimeTime, heatLevel, label, icon };
}

/**
 * Group slots by time period
 */
export function groupSlotsByPeriod<T extends { startTime: string }>(
  slots: T[],
): Record<TimeSlotAnalysis["period"], T[]> {
  const groups: Record<TimeSlotAnalysis["period"], T[]> = {
    morning: [],
    midday: [],
    afternoon: [],
    evening: [],
  };

  for (const slot of slots) {
    const analysis = analyzeTimeSlot(slot.startTime);
    groups[analysis.period].push(slot);
  }

  return groups;
}

/**
 * Find recommended slots (best available times)
 */
export function findRecommendedSlots<T extends { startTime: string; isAvailable: boolean }>(
  slots: T[],
  maxRecommendations = 3,
): T[] {
  const availableSlots = slots.filter((s) => s.isAvailable);

  // Score each slot
  const scored = availableSlots.map((slot) => {
    const analysis = analyzeTimeSlot(slot.startTime);
    let score = 0;

    // Prime time bonus
    if (analysis.isPrimeTime) score += 30;

    // Midday/afternoon bonus (most popular)
    if (analysis.period === "midday") score += 20;
    if (analysis.period === "afternoon") score += 15;

    // Avoid very early or very late
    const hour = parseInt(slot.startTime.split(":")[0]);
    if (hour < 10 || hour >= 18) score -= 10;

    // Prefer round hours
    if (slot.startTime.endsWith(":00")) score += 5;

    return { slot, score };
  });

  // Sort by score and return top recommendations
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRecommendations)
    .map((s) => s.slot);
}

/**
 * Calculate day insights
 */
export function calculateDayInsights<T extends { startTime: string; isAvailable: boolean }>(
  slots: T[],
  lang = "ru",
): DayInsights {
  const totalSlots = slots.length;
  const availableSlots = slots.filter((s) => s.isAvailable).length;
  const bookedSlots = totalSlots - availableSlots;

  // Count prime time available slots
  const primeTimeSlots = slots.filter((s) => {
    const hour = parseInt(s.startTime.split(":")[0]);
    return PRIME_TIME_HOURS.includes(hour);
  });
  const primeTimeAvailable = primeTimeSlots.filter((s) => s.isAvailable).length;

  // Find best period
  const groups = groupSlotsByPeriod(slots.filter((s) => s.isAvailable));
  let bestPeriod = "midday";
  let maxAvailable = 0;
  for (const [period, periodSlots] of Object.entries(groups)) {
    if (periodSlots.length > maxAvailable) {
      maxAvailable = periodSlots.length;
      bestPeriod = period;
    }
  }

  // Determine day quality
  const availableRatio = availableSlots / totalSlots;
  let dayQuality: DayInsights["dayQuality"] = "excellent";
  if (availableRatio === 0) dayQuality = "full";
  else if (availableRatio < 0.2) dayQuality = "limited";
  else if (availableRatio < 0.5) dayQuality = "good";

  // Generate recommendation
  const recommendations: Record<string, Record<DayInsights["dayQuality"], string>> = {
    ru: {
      excellent: "Отличный день для записи",
      good: "Хороший выбор времени",
      limited: "Осталось мало свободных слотов",
      full: "Все слоты заняты",
    },
    en: {
      excellent: "Great day for booking",
      good: "Good time selection",
      limited: "Few slots remaining",
      full: "Fully booked",
    },
    uz: {
      excellent: "Yozilish uchun ajoyib kun",
      good: "Yaxshi vaqt tanlovi",
      limited: "Kam bo'sh slotlar qoldi",
      full: "To'liq band",
    },
  };

  const recommendation = recommendations[lang]?.[dayQuality] || recommendations.en[dayQuality];

  // Peak hours description
  const peakHoursLabels: Record<string, string> = {
    ru: "Пик с 12:00 до 16:00",
    en: "Peak from 12:00 to 16:00",
    uz: "Eng ko'p 12:00 dan 16:00 gacha",
  };

  return {
    totalSlots,
    availableSlots,
    bookedSlots,
    primeTimeAvailable,
    bestPeriod,
    recommendation,
    dayQuality,
    peakHours: peakHoursLabels[lang] || peakHoursLabels.en,
  };
}

/**
 * Get period label translations
 */
export function getPeriodLabel(period: TimeSlotAnalysis["period"], lang = "ru"): string {
  const labels: Record<string, Record<TimeSlotAnalysis["period"], string>> = {
    ru: {
      morning: "Утро",
      midday: "День",
      afternoon: "После обеда",
      evening: "Вечер",
    },
    en: {
      morning: "Morning",
      midday: "Midday",
      afternoon: "Afternoon",
      evening: "Evening",
    },
    uz: {
      morning: "Ertalab",
      midday: "Kunduzi",
      afternoon: "Tushdan keyin",
      evening: "Kechqurun",
    },
  };

  return labels[lang]?.[period] || labels.en[period];
}

/**
 * Get heat level color classes
 */
export function getHeatLevelClasses(heatLevel: TimeSlotAnalysis["heatLevel"]): string {
  switch (heatLevel) {
    case "hot":
      return "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800";
    case "warm":
      return "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800";
    case "cold":
      return "bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800";
    default:
      return "";
  }
}

/**
 * Get day quality badge variant
 */
export function getDayQualityVariant(
  quality: DayInsights["dayQuality"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (quality) {
    case "excellent":
      return "default";
    case "good":
      return "secondary";
    case "limited":
      return "outline";
    case "full":
      return "destructive";
    default:
      return "secondary";
  }
}

/**
 * Get day quality icon
 */
export function getDayQualityIcon(quality: DayInsights["dayQuality"]): string {
  switch (quality) {
    case "excellent":
      return "🔥";
    case "good":
      return "✨";
    case "limited":
      return "⚡";
    case "full":
      return "🚫";
    default:
      return "📅";
  }
}
