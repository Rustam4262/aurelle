import { BookingCalendar } from "@/components/booking-calendar";
import type { EnrichedBooking } from "@/hooks/use-master-data";

interface MasterCalendarTabProps {
  bookings: EnrichedBooking[];
  isLoading: boolean;
}

export function MasterCalendarTab({ bookings, isLoading }: MasterCalendarTabProps) {
  return (
    <div className="space-y-6">
      <BookingCalendar bookings={bookings} isLoading={isLoading} showClient={true} />
    </div>
  );
}
