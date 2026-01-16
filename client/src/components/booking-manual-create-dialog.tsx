import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface ManualBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salons: Array<{ id: string; name: string | { en: string; ru: string; uz: string } }>;
}

export function BookingManualCreateDialog({ open, onOpenChange, salons }: ManualBookingDialogProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [salonId, setSalonId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [masterId, setMasterId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [bookingDate, setBookingDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch services for selected salon
  const { data: services = [] } = useQuery({
    queryKey: [`/api/salons/${salonId}/services`],
    queryFn: () => apiRequest("GET", `/salons/${salonId}/services`),
    enabled: !!salonId,
  });

  // Fetch masters for selected salon
  const { data: masters = [] } = useQuery({
    queryKey: [`/api/salons/${salonId}/masters`],
    queryFn: () => apiRequest("GET", `/salons/${salonId}/masters`),
    enabled: !!salonId,
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/owner/bookings/manual", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      toast({
        title: t("bookings.manual.success", "Booking created"),
        description: t("bookings.manual.successDesc", "The booking has been successfully created"),
      });
      handleClose();
    },
    onError: (error: any) => {
      console.error("Manual booking creation error:", error);
      const errorMessage = error.response?.data?.error || error.message;
      toast({
        title: t("bookings.manual.error", "Creation failed"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    // Reset form
    setSalonId("");
    setServiceId("");
    setMasterId("");
    setClientName("");
    setClientPhone("");
    setBookingDate(undefined);
    setStartTime("");
    setEndTime("");
    setNotes("");
    onOpenChange(false);
  };

  const handleSubmit = () => {
    // Validation
    if (!salonId || !serviceId || !clientName || !clientPhone || !bookingDate || !startTime || !endTime) {
      toast({
        title: t("common.error", "Error"),
        description: t("bookings.manual.missingFields", "Please fill in all required fields"),
        variant: "destructive",
      });
      return;
    }

    // Phone validation (simple)
    if (!/^\+?[\d\s-()]+$/.test(clientPhone)) {
      toast({
        title: t("common.error", "Error"),
        description: t("bookings.manual.invalidPhone", "Please enter a valid phone number"),
        variant: "destructive",
      });
      return;
    }

    // Time validation
    if (startTime >= endTime) {
      toast({
        title: t("common.error", "Error"),
        description: t("bookings.manual.invalidTime", "End time must be after start time"),
        variant: "destructive",
      });
      return;
    }

    createBookingMutation.mutate({
      salonId,
      serviceId,
      masterId: masterId || null,
      clientName,
      clientPhone,
      bookingDate: format(bookingDate, "yyyy-MM-dd"),
      startTime,
      endTime,
      notes,
    });
  };

  const getSalonName = (salon: any) => {
    if (typeof salon.name === "string") return salon.name;
    return salon.name[i18n.language as keyof typeof salon.name] || salon.name.en;
  };

  const getServiceName = (service: any) => {
    if (typeof service.name === "string") return service.name;
    return service.name[i18n.language as keyof typeof service.name] || service.name.en;
  };

  const getMasterName = (master: any) => {
    return master.fullName || master.name || "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("bookings.manual.title", "Create Manual Booking")}</DialogTitle>
          <DialogDescription>
            {t("bookings.manual.description", "Create a booking on behalf of a client")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Salon Selection */}
          <div className="space-y-2">
            <Label htmlFor="salonId">{t("bookings.manual.salon", "Salon")} <span className="text-red-500">*</span></Label>
            <Select value={salonId} onValueChange={(value) => {
              setSalonId(value);
              setServiceId("");
              setMasterId("");
            }}>
              <SelectTrigger id="salonId">
                <SelectValue placeholder={t("bookings.manual.selectSalon", "Select a salon")} />
              </SelectTrigger>
              <SelectContent>
                {salons.map((salon) => (
                  <SelectItem key={salon.id} value={salon.id}>
                    {getSalonName(salon)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="serviceId">{t("bookings.manual.service", "Service")} <span className="text-red-500">*</span></Label>
            <Select value={serviceId} onValueChange={setServiceId} disabled={!salonId}>
              <SelectTrigger id="serviceId">
                <SelectValue placeholder={t("bookings.manual.selectService", "Select a service")} />
              </SelectTrigger>
              <SelectContent>
                {services.map((service: any) => (
                  <SelectItem key={service.id} value={service.id}>
                    {getServiceName(service)} - {service.basePrice} UZS
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Master Selection (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="masterId">
              {t("bookings.manual.master", "Master")} <span className="text-muted-foreground">({t("common.optional", "Optional")})</span>
            </Label>
            <Select value={masterId} onValueChange={setMasterId} disabled={!salonId}>
              <SelectTrigger id="masterId">
                <SelectValue placeholder={t("bookings.manual.selectMaster", "Select a master")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  {t("bookings.manual.anyMaster", "Any available master")}
                </SelectItem>
                {masters.map((master: any) => (
                  <SelectItem key={master.id} value={master.id}>
                    {getMasterName(master)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Name */}
          <div className="space-y-2">
            <Label htmlFor="clientName">{t("bookings.manual.clientName", "Client Name")} <span className="text-red-500">*</span></Label>
            <Input
              id="clientName"
              placeholder={t("bookings.manual.clientNamePlaceholder", "Enter client name")}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          {/* Client Phone */}
          <div className="space-y-2">
            <Label htmlFor="clientPhone">{t("bookings.manual.clientPhone", "Client Phone")} <span className="text-red-500">*</span></Label>
            <Input
              id="clientPhone"
              type="tel"
              placeholder="+998 90 123 45 67"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
          </div>

          {/* Booking Date */}
          <div className="space-y-2">
            <Label>{t("bookings.manual.date", "Date")} <span className="text-red-500">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {bookingDate ? format(bookingDate, "PPP") : t("bookings.manual.pickDate", "Pick a date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={bookingDate}
                  onSelect={setBookingDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">{t("bookings.manual.startTime", "Start Time")} <span className="text-red-500">*</span></Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">{t("bookings.manual.endTime", "End Time")} <span className="text-red-500">*</span></Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {t("bookings.manual.notes", "Notes")} <span className="text-muted-foreground">({t("common.optional", "Optional")})</span>
            </Label>
            <Textarea
              id="notes"
              placeholder={t("bookings.manual.notesPlaceholder", "Add any additional notes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createBookingMutation.isPending}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createBookingMutation.isPending}
          >
            {createBookingMutation.isPending
              ? t("bookings.manual.creating", "Creating...")
              : t("bookings.manual.create", "Create Booking")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
