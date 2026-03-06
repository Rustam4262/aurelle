import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSalonServices, useSalonMasters } from "../../hooks/useSalons";
import { useAvailability, useCreateBooking } from "../../hooks/useBookings";
import type { BookingStackParams } from "../../navigation/BookingStack";
import type { Service, Master } from "../../types/api";

type Props = NativeStackScreenProps<BookingStackParams, "BookingFlow">;

type Step = "service" | "master" | "datetime" | "confirm";

function localizedName(v: { ru: string; en: string; uz: string } | string): string {
  if (typeof v === "string") return v;
  return v.ru || v.en || v.uz;
}

// Generate next 14 days as date strings
function getNextDays(n = 14): { label: string; value: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(new Date(), i);
    return {
      value: format(d, "yyyy-MM-dd"),
      label: i === 0
        ? "Сегодня"
        : i === 1
        ? "Завтра"
        : format(d, "d MMM", { locale: ru }),
    };
  });
}

export function BookingFlowScreen({ navigation, route }: Props) {
  const { salonId, serviceId: initialServiceId, masterId: initialMasterId } = route.params;

  const [step, setStep] = useState<Step>(initialServiceId ? "master" : "service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const { data: services = [], isLoading: servicesLoading } = useSalonServices(salonId);
  const { data: masters = [] } = useSalonMasters(salonId);
  const { data: slots = [], isLoading: slotsLoading } = useAvailability(
    selectedMaster?.id ?? "",
    selectedDate,
  );
  const createBooking = useCreateBooking();

  const days = getNextDays();
  const availableSlots = slots.filter((s) => s.available);

  const STEPS: Step[] = ["service", "master", "datetime", "confirm"];
  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const goNext = () => {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    if (stepIndex === 0) {
      navigation.goBack();
    } else {
      setStep(STEPS[stepIndex - 1]);
    }
  };

  const handleConfirm = async () => {
    if (!selectedService || !selectedTime) return;
    try {
      await createBooking.mutateAsync({
        salonId,
        serviceId: selectedService.id,
        masterId: selectedMaster?.id,
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        notes,
      });
      navigation.navigate("BookingsList");
      Alert.alert("Готово!", "Запись создана успешно 🎉");
    } catch (e: any) {
      Alert.alert("Ошибка", e?.response?.data?.error ?? "Не удалось создать запись");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={goBack} className="mr-3">
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-800">
            {step === "service" && "Выберите услугу"}
            {step === "master" && "Выберите мастера"}
            {step === "datetime" && "Выберите дату и время"}
            {step === "confirm" && "Подтверждение"}
          </Text>
          {/* Progress bar */}
          <View className="h-1 bg-gray-100 rounded mt-1">
            <View
              className="h-1 bg-primary rounded"
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* STEP: Service */}
        {step === "service" && (
          <View className="py-4">
            {servicesLoading ? (
              <ActivityIndicator color="#C81D60" className="mt-8" />
            ) : (
              services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  onPress={() => {
                    setSelectedService(service);
                    goNext();
                  }}
                  className={`flex-row items-center justify-between p-4 mb-3 rounded-xl border ${
                    selectedService?.id === service.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-200"
                  }`}
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-base font-medium text-gray-800">
                      {localizedName(service.name)}
                    </Text>
                    <Text className="text-sm text-gray-400 mt-0.5">
                      {service.durationMinutes} мин
                    </Text>
                  </View>
                  <Text className="text-base font-semibold text-primary">
                    {service.priceUzs.toLocaleString("ru-UZ")} сум
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* STEP: Master */}
        {step === "master" && (
          <View className="py-4">
            {/* Skip option */}
            <TouchableOpacity
              className="flex-row items-center p-4 mb-3 rounded-xl border border-dashed border-gray-300"
              onPress={() => {
                setSelectedMaster(null);
                goNext();
              }}
            >
              <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mr-3">
                <Ionicons name="shuffle" size={20} color="#9ca3af" />
              </View>
              <Text className="text-base text-gray-600">Любой мастер</Text>
            </TouchableOpacity>

            {masters.map((master) => {
              const name = [master.firstName, master.lastName].filter(Boolean).join(" ");
              return (
                <TouchableOpacity
                  key={master.id}
                  onPress={() => {
                    setSelectedMaster(master);
                    goNext();
                  }}
                  className={`flex-row items-center p-4 mb-3 rounded-xl border ${
                    selectedMaster?.id === master.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-200"
                  }`}
                >
                  <View className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center mr-3">
                    <Ionicons name="person" size={20} color="#9ca3af" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-800">{name}</Text>
                    {master.specialization && (
                      <Text className="text-sm text-gray-400">{master.specialization}</Text>
                    )}
                  </View>
                  {master.rating != null && (
                    <View className="flex-row items-center">
                      <Ionicons name="star" size={12} color="#f59e0b" />
                      <Text className="text-sm text-gray-600 ml-1">
                        {master.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* STEP: Date + Time */}
        {step === "datetime" && (
          <View className="py-4">
            {/* Date selector */}
            <Text className="text-base font-semibold text-gray-800 mb-3">Дата</Text>
            <FlatList
              horizontal
              data={days}
              keyExtractor={(d) => d.value}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ marginBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedDate(item.value);
                    setSelectedTime(null);
                  }}
                  className={`mr-2 px-4 py-3 rounded-xl border ${
                    selectedDate === item.value
                      ? "bg-primary border-primary"
                      : "border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedDate === item.value ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />

            {/* Time slots */}
            <Text className="text-base font-semibold text-gray-800 mb-3">Время</Text>
            {slotsLoading ? (
              <ActivityIndicator color="#C81D60" />
            ) : availableSlots.length === 0 ? (
              <Text className="text-gray-400 text-center py-4">
                Нет доступного времени на эту дату
              </Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {availableSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot.time}
                    onPress={() => setSelectedTime(slot.time)}
                    className={`px-4 py-2.5 rounded-xl border ${
                      selectedTime === slot.time
                        ? "bg-primary border-primary"
                        : "border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selectedTime === slot.time ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {slot.time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* STEP: Confirm */}
        {step === "confirm" && selectedService && (
          <View className="py-4">
            <Text className="text-lg font-bold text-gray-800 mb-4">
              Проверьте данные записи
            </Text>

            {[
              { label: "Услуга", value: localizedName(selectedService.name) },
              {
                label: "Мастер",
                value: selectedMaster
                  ? [selectedMaster.firstName, selectedMaster.lastName].filter(Boolean).join(" ")
                  : "Любой мастер",
              },
              { label: "Дата", value: selectedDate },
              { label: "Время", value: selectedTime ?? "—" },
              {
                label: "Цена",
                value: `${selectedService.priceUzs.toLocaleString("ru-UZ")} сум`,
              },
              { label: "Длительность", value: `${selectedService.durationMinutes} мин` },
            ].map((row) => (
              <View key={row.label} className="flex-row justify-between py-3 border-b border-gray-100">
                <Text className="text-gray-500">{row.label}</Text>
                <Text className="text-gray-800 font-medium">{row.value}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View className="px-4 pb-6 pt-3 border-t border-gray-100">
        {step === "datetime" && (
          <TouchableOpacity
            disabled={!selectedTime}
            onPress={goNext}
            className={`py-4 rounded-xl items-center ${
              selectedTime ? "bg-primary" : "bg-gray-200"
            }`}
          >
            <Text className={`font-bold text-base ${selectedTime ? "text-white" : "text-gray-400"}`}>
              Далее
            </Text>
          </TouchableOpacity>
        )}

        {step === "confirm" && (
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={createBooking.isPending}
            className="bg-primary py-4 rounded-xl items-center"
          >
            {createBooking.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Подтвердить запись</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
