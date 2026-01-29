import { useState, useMemo } from "react";
import type { EnrichedBooking } from "./types";
import { useTranslation } from "react-i18next";

function getLocalizedText(
  obj: { en?: string; ru?: string; uz?: string } | null | undefined,
  lang: string,
): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

interface UseBookingFiltersProps {
  bookings: EnrichedBooking[] | undefined;
}

export function useBookingFilters({ bookings }: UseBookingFiltersProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const [bookingFilter, setBookingFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Get unique services for filter dropdown
  const uniqueServices = useMemo(() => {
    if (!bookings) return [];
    const services = new Map<string, string>();
    bookings.forEach((b) => {
      const serviceName = getLocalizedText(b.service?.name as any, currentLang);
      if (serviceName && b.serviceId) {
        services.set(b.serviceId, serviceName);
      }
    });
    return Array.from(services, ([id, name]) => ({ id, name }));
  }, [bookings, currentLang]);

  const clearFilters = () => {
    setBookingFilter("all");
    setServiceFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
    setSortBy("newest");
  };

  const hasActiveFilters =
    bookingFilter !== "all" || serviceFilter !== "all" || dateFrom || dateTo || searchQuery;

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    const now = new Date();

    let result = [...bookings];

    // Status filter
    switch (bookingFilter) {
      case "upcoming":
        result = result.filter((b) => {
          const bookingDate = new Date(b.bookingDate);
          return bookingDate >= now && b.status !== "cancelled" && b.status !== "completed";
        });
        break;
      case "completed":
        result = result.filter((b) => b.status === "completed");
        break;
      case "cancelled":
        result = result.filter((b) => b.status === "cancelled");
        break;
    }

    // Service filter
    if (serviceFilter !== "all") {
      result = result.filter((b) => b.serviceId === serviceFilter);
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter((b) => new Date(b.bookingDate) >= dateFrom);
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter((b) => new Date(b.bookingDate) <= endOfDay);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((b) => {
        const salonName = getLocalizedText(b.salon?.name as any, currentLang).toLowerCase();
        const serviceName = getLocalizedText(b.service?.name as any, currentLang).toLowerCase();
        const masterName = (b.master?.name || "").toLowerCase();
        return (
          salonName.includes(query) || serviceName.includes(query) || masterName.includes(query)
        );
      });
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort(
          (a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime(),
        );
        break;
      case "oldest":
        result.sort(
          (a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime(),
        );
        break;
      case "priceHigh":
        result.sort((a, b) => (b.priceSnapshot || 0) - (a.priceSnapshot || 0));
        break;
      case "priceLow":
        result.sort((a, b) => (a.priceSnapshot || 0) - (b.priceSnapshot || 0));
        break;
    }

    return result;
  }, [bookings, currentLang, bookingFilter, serviceFilter, dateFrom, dateTo, searchQuery, sortBy]);

  return {
    filteredBookings,
    uniqueServices,
    bookingFilter,
    setBookingFilter,
    serviceFilter,
    setServiceFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    clearFilters,
    hasActiveFilters,
  };
}
