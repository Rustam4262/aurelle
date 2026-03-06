import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useBooking, useCancelBooking } from "../../hooks/useBookings";
import type { BookingStackParams } from "../../navigation/BookingStack";

type Props = NativeStackScreenProps<BookingStackParams, "BookingDetail">;

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает подтверждения",
  confirmed: "Подтверждена",
  completed: "Завершена",
  cancelled: "Отменена",
  no_show: "Клиент не пришёл",
};

export function BookingDetailScreen({ navigation, route }: Props) {
  const { bookingId } = route.params;
  const { data: booking, isLoading } = useBooking(bookingId);
  const cancelMutation = useCancelBooking();

  const handleCancel = () => {
    Alert.alert("Отменить запись?", "Это действие нельзя отменить.", [
      { text: "Нет" },
      {
        text: "Да, отменить",
        style: "destructive",
        onPress: async () => {
          await cancelMutation.mutateAsync(bookingId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#C81D60" />
      </SafeAreaView>
    );
  }

  if (!booking) return null;

  const canCancel = booking.status === "pending" || booking.status === "confirmed";
  const salonName = booking.salon
    ? typeof booking.salon.name === "string" ? booking.salon.name : booking.salon.name.ru
    : "Салон";
  const serviceName = booking.service
    ? typeof booking.service.name === "string" ? booking.service.name : booking.service.name.ru
    : "";
  const masterName = booking.master
    ? [booking.master.firstName, booking.master.lastName].filter(Boolean).join(" ")
    : "Любой мастер";

  const rows = [
    { label: "Салон", value: salonName, icon: "storefront-outline" },
    { label: "Услуга", value: serviceName, icon: "cut-outline" },
    { label: "Мастер", value: masterName, icon: "person-outline" },
    { label: "Дата", value: booking.scheduledDate, icon: "calendar-outline" },
    { label: "Время", value: booking.scheduledTime, icon: "time-outline" },
    {
      label: "Стоимость",
      value: `${booking.priceUzs?.toLocaleString("ru-UZ") ?? 0} сум`,
      icon: "card-outline",
    },
    {
      label: "Длительность",
      value: `${booking.durationMinutes} мин`,
      icon: "hourglass-outline",
    },
  ] as const;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Back */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-800">Запись</Text>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Status badge */}
        <View className="items-center py-6">
          <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-3">
            <Ionicons name="calendar-outline" size={28} color="#C81D60" />
          </View>
          <Text className="text-base font-semibold text-gray-700">
            {STATUS_LABELS[booking.status] ?? booking.status}
          </Text>
          <Text className="text-sm text-gray-400 mt-1">#{bookingId.slice(0, 8)}</Text>
        </View>

        {/* Details */}
        <View className="bg-gray-50 rounded-2xl p-4">
          {rows.map((row) => (
            <View
              key={row.label}
              className="flex-row items-center py-3 border-b border-gray-100 last:border-0"
            >
              <Ionicons name={row.icon as any} size={18} color="#9ca3af" className="mr-3" />
              <Text className="text-gray-500 w-28 ml-3">{row.label}</Text>
              <Text className="text-gray-800 font-medium flex-1">{row.value}</Text>
            </View>
          ))}
        </View>

        {booking.notes && (
          <View className="mt-4 p-4 bg-amber-50 rounded-2xl">
            <Text className="text-sm text-amber-700">{booking.notes}</Text>
          </View>
        )}
      </ScrollView>

      {canCancel && (
        <View className="px-4 pb-6 pt-3 border-t border-gray-100">
          <TouchableOpacity
            onPress={handleCancel}
            disabled={cancelMutation.isPending}
            className="border border-red-400 py-4 rounded-xl items-center"
          >
            {cancelMutation.isPending ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Text className="text-red-500 font-semibold">Отменить запись</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
