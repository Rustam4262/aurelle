import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

interface DashboardAlerts {
  salonsWithoutServices: string[];
  salonsWithoutMasters: string[];
}

interface OwnerBooking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  clientName?: string;
  serviceName?: string;
}

interface KpiCard {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export function OwnerDashboardScreen() {
  const { data: salons = [], isLoading: salonsLoading } = useQuery({
    queryKey: ["owner-salons"],
    queryFn: async () => {
      const { data } = await api.get<any[]>("/api/owner/salons");
      return data;
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["owner-alerts"],
    queryFn: async () => {
      const { data } = await api.get<DashboardAlerts>("/api/owner/dashboard/alerts");
      return data;
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["owner-bookings-today"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await api.get<OwnerBooking[]>("/api/owner/bookings", {
        params: { date: today, status: "pending,confirmed", limit: 10 },
      });
      return data;
    },
  });

  const kpis: KpiCard[] = [
    {
      label: "Салонов",
      value: salons.length,
      icon: "storefront-outline",
      color: "bg-blue-50",
    },
    {
      label: "Записей сегодня",
      value: bookings.length,
      icon: "calendar-outline",
      color: "bg-primary/10",
    },
    {
      label: "Предупреждений",
      value:
        (alerts?.salonsWithoutServices?.length ?? 0) +
        (alerts?.salonsWithoutMasters?.length ?? 0),
      icon: "warning-outline",
      color: "bg-amber-50",
    },
  ];

  if (salonsLoading) {
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
          <Text className="text-2xl font-bold text-gray-900">Мой салон</Text>
        </View>

        {/* KPI Cards */}
        <View className="flex-row px-4 pt-4 gap-3">
          {kpis.map((kpi) => (
            <View key={kpi.label} className={`flex-1 p-3 rounded-2xl ${kpi.color}`}>
              <Ionicons name={kpi.icon} size={20} color="#6b7280" />
              <Text className="text-2xl font-bold text-gray-800 mt-2">
                {kpi.value}
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">{kpi.label}</Text>
            </View>
          ))}
        </View>

        {/* Alerts */}
        {(alerts?.salonsWithoutServices?.length ?? 0) > 0 && (
          <View className="mx-4 mt-4 p-4 bg-amber-50 rounded-2xl flex-row items-start">
            <Ionicons name="warning" size={18} color="#d97706" />
            <Text className="text-sm text-amber-800 ml-2 flex-1">
              {alerts!.salonsWithoutServices.length} салон(а) без услуг — добавьте услуги для приёма записей
            </Text>
          </View>
        )}

        {/* Today's bookings */}
        <View className="mx-4 mt-4">
          <Text className="text-base font-bold text-gray-800 mb-3">
            Записи на сегодня
          </Text>
          {bookings.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <Ionicons name="calendar-outline" size={32} color="#d1d5db" />
              <Text className="text-gray-400 mt-2">Нет записей на сегодня</Text>
            </View>
          ) : (
            bookings.map((b) => (
              <View
                key={b.id}
                className="bg-white rounded-xl p-4 mb-2 flex-row items-center"
              >
                <View className="w-1 h-10 rounded bg-primary mr-3" />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-800">
                    {b.clientName ?? "Клиент"}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {b.serviceName ?? "Услуга"} · {b.scheduledTime}
                  </Text>
                </View>
                <View
                  className={`px-2 py-1 rounded-full ${
                    b.status === "confirmed" ? "bg-green-50" : "bg-amber-50"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      b.status === "confirmed" ? "text-green-600" : "text-amber-600"
                    }`}
                  >
                    {b.status === "confirmed" ? "Подтверждена" : "Ожидает"}
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
