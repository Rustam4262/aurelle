import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

export function MasterDashboardScreen() {
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["master-bookings"],
    queryFn: async () => {
      const { data } = await api.get<any[]>("/api/master/bookings", {
        params: { limit: 20 },
      });
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["master-stats"],
    queryFn: async () => {
      const { data } = await api.get<{
        totalBookings: number;
        completedBookings: number;
        rating: number;
      }>("/api/master/statistics");
      return data;
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayBookings = bookings.filter((b) => b.scheduledDate === today);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#C81D60" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-3 bg-white">
          <Text className="text-2xl font-bold text-gray-900">Мастер</Text>
        </View>

        {/* Stats row */}
        <View className="flex-row px-4 pt-4 gap-3">
          <View className="flex-1 bg-primary/10 p-3 rounded-2xl">
            <Ionicons name="checkmark-circle-outline" size={20} color="#C81D60" />
            <Text className="text-2xl font-bold text-gray-800 mt-2">
              {stats?.completedBookings ?? 0}
            </Text>
            <Text className="text-xs text-gray-500">Выполнено</Text>
          </View>
          <View className="flex-1 bg-amber-50 p-3 rounded-2xl">
            <Ionicons name="star-outline" size={20} color="#d97706" />
            <Text className="text-2xl font-bold text-gray-800 mt-2">
              {stats?.rating?.toFixed(1) ?? "—"}
            </Text>
            <Text className="text-xs text-gray-500">Рейтинг</Text>
          </View>
          <View className="flex-1 bg-blue-50 p-3 rounded-2xl">
            <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
            <Text className="text-2xl font-bold text-gray-800 mt-2">
              {todayBookings.length}
            </Text>
            <Text className="text-xs text-gray-500">Сегодня</Text>
          </View>
        </View>

        {/* Today schedule */}
        <View className="mx-4 mt-4">
          <Text className="text-base font-bold text-gray-800 mb-3">
            Расписание сегодня
          </Text>
          {todayBookings.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <Ionicons name="sunny-outline" size={32} color="#d1d5db" />
              <Text className="text-gray-400 mt-2">Свободный день</Text>
            </View>
          ) : (
            todayBookings.map((b) => (
              <View
                key={b.id}
                className="bg-white rounded-xl p-4 mb-2 flex-row items-center"
              >
                <View className="w-12 items-center mr-3">
                  <Text className="text-sm font-bold text-primary">
                    {b.scheduledTime}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-800">
                    {b.clientName ?? "Клиент"}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {b.serviceName ?? "Услуга"} · {b.durationMinutes} мин
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
