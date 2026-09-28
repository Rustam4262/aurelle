import {
  Scissors,
  Paintbrush,
  Brush,
  Flower2,
  Droplets,
  CircleHelp,
  UserRound,
  Store,
  Mail,
  Phone,
  Sunrise,
  Sun,
  CloudSun,
  Moon,
  Flame,
  Sparkles,
  Zap,
  Ban,
  CalendarDays,
  Bug,
  CreditCard,
  Lightbulb,
  ClipboardList,
  MapPin,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  hair: Scissors,
  nails: Paintbrush,
  makeup: Brush,
  spa: Flower2,
  skincare: Droplets,
  barbershop: Store,
  help: CircleHelp,
  user: UserRound,
  salon: Store,
  mail: Mail,
  phone: Phone,
  morning: Sunrise,
  midday: Sun,
  afternoon: CloudSun,
  evening: Moon,
  popular: Flame,
  recommended: Sparkles,
  quick: Zap,
  unavailable: Ban,
  calendar: CalendarDays,
  bug: Bug,
  payment: CreditCard,
  suggestion: Lightbulb,
  clipboard: ClipboardList,
  location: MapPin,
};

export function SymbolIcon({ name, className = "h-4 w-4" }: { name?: string; className?: string }) {
  const Icon = icons[name ?? ""] ?? ClipboardList;
  return (
    <Icon
      aria-hidden="true"
      strokeWidth={1.75}
      className={`inline-block shrink-0 align-middle ${className}`}
    />
  );
}
