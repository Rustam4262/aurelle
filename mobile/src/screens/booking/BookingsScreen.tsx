import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMyBookings, useCancelBooking } from "../../hooks/useBookings";
import type { Booking } from "../../types/api";
import type { BookingStackParams } from "../../navigation/BookingStack";

type Props = NativeStackScreenProps<BookingStackParams, "BookingsList">;

const STATUS_LABELS: Record<Booking["status"], string> = {
  pending: "Ожидает",
  confirmed: "Подтверждена",
  completed: "Завершена",
  cancelled: "Отменена",
  no_show: "Не пришёл",
};

const STATUS_COLORS: Record<Booking["status"], string> = {
  pending: "text-amber-600 bg-amber-50",
  confirmed: "text-green-600 bg-green-50",
  completed: "text-blue-600 bg-blue-50",
  cancelled: "text-red-500 bg-red-50",
  no_show: "text-gray-500 bg-gray-100",
};

function BookingCard({
  booking,
  onPress,
  onCancel,
}: {
  booking: Booking;
  onPress: () => void;
  onCancel: () => void;
}) {
  const canCancel = booking.status === "pending" || booking.status === "confirmed";
  const salonName =
    booking.salon
      ? typeof booking.salon.name === "string"
        ? booking.salon.name
        : booking.salon.name.ru
      : "Салон";

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm"
    >
      <View className="flex-row items-start justify-between mb-2">
        <Text className="text-base font-semibold text-gray-800 flex-1 mr-2">
          {salonName}
        </Text>
        <View className={`px-2 py-1 rounded-full ${STATUS_COLORS[booking.status]}`}>
          <Text className={`text-xs font-medium ${STATUS_COLORS[booking.status]}`}>
            {STATUS_LABELS[booking.status]}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center mb-1">
        <Ionicons name="calendar-outline" size={13} color="#9ca3af" />
        <Text className="text-sm text-gray-500 ml-1">
          {booking.scheduledDate} в {booking.scheduledTime}
        </Text>
      </View>

      {booking.service && (
        <View className="flex-row items-center">
          <Ionicons name="cut-outline" size={13} color="#9ca3af" />
          <Text className="text-sm text-gray-500 ml-1">
            {typeof booking.service.name === "string"
              ? booking.service.name
              : booking.service.name.ru}
          </Text>
        </View>
      )}

      {canCancel && (
        <TouchableOpacity
          onPress={onCancel}
          className="mt-3 self-start px-3 py-1.5 rounded-lg border border-red-200"
        >
          <Text className="text-xs text-red-500">Отменить</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export function BookingsScreen({ navigation }: Props) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const { data: bookings = [], isLoading } = useMyBookings();
  const cancelMutation = useCancelBooking();

  const UPCOMING_STATUSES: Booking["status"][] = ["pending", "confirmed"];
  const PAST_STATUSES: Booking["status"][] = ["completed", "cancelled", "no_show"];

  const filtered = bookings.filter((b) =>
    tab === "upcoming"
      ? UPCOMING_STATUSES.includes(b.status)
      : PAST_STATUSES.includes(b.status),
  );

  const handleCancel = (bookingId: string) => {
    Alert.alert("Отменить запись?", "Это действие нельзя отменить.", [
      { text: "Нет" },
      {
        text: "Да, отменить",
        style: "destructive",
        onPress: () => cancelMutation.mutate(bookingId),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="px-4 pt-2 pb-0 bg-white">
        <Text className="text-2xl font-bold text-gray-900 mb-3">Мои записи</Text>

        {/* Tabs */}
        <View className="flex-row border-b border-gray-100">
          {(["upcoming", "past"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 pb-3 items-center border-b-2 ${
                tab === t ? "border-primary" : "border-transparent"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  tab === t ? "text-primary" : "text-gray-400"
                }`}
              >
                {t === "upcoming" ? "Предстоящие" : "История"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#C81D60" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
              <Text className="text-gray-400 mt-3 text-base">
                {tab === "upcoming" ? "Нет предстоящих записей" : "История пуста"}
              </Text>
              {tab === "upcoming" && (
                <TouchableOpacity
                  className="mt-4 px-6 py-3 bg-primary rounded-xl"
                  onPress={() => navigation.navigate("BookingFlow", { salonId: "" })}
                >
                  <Text className="text-white font-semibold">Записаться</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => navigation.navigate("BookingDetail", { bookingId: item.id })}
              onCancel={() => handleCancel(item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
