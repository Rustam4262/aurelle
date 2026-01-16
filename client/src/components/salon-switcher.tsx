/**
 * Salon Switcher Component
 *
 * Allows owners with multiple salons to filter dashboard/analytics by salon
 */

import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Salon {
  id: string;
  name: string;
}

interface SalonSwitcherProps {
  salons: Salon[];
  value: string;
  onChange: (salonId: string) => void;
  className?: string;
  showAllOption?: boolean;
}

export function SalonSwitcher({
  salons,
  value,
  onChange,
  className,
  showAllOption = true
}: SalonSwitcherProps) {
  const { t } = useTranslation();

  // Don't show switcher if only one salon
  if (salons.length <= 1 && !showAllOption) {
    return null;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <Building2 className="mr-2 h-4 w-4" />
        <SelectValue placeholder={t("dashboard.selectSalon", "Select salon")} />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem value="all">
            {t("dashboard.allSalons", "All Salons")}
          </SelectItem>
        )}
        {salons.map((salon) => (
          <SelectItem key={salon.id} value={salon.id}>
            {salon.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
