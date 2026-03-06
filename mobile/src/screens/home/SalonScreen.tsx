import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSalon, useSalonServices, useSalonMasters } from "../../hooks/useSalons";
import type { HomeStackParams } from "../../navigation/HomeStack";

function localizedName(v: { ru: string; en: string; uz: string } | string): string {
  if (typeof v === "string") return v;
  return v.ru || v.en || v.uz;
}

function formatPrice(uzs: number) {
  return uzs.toLocaleString("ru-UZ") + " сум";
}

type Props = NativeStackScreenProps<HomeStackParams, "Salon">;

export function SalonScreen({ navigation, route }: Props) {
  const { salonId } = route.params;
  const { data: salon, isLoading } = useSalon(salonId);
  const { data: services = [] } = useSalonServices(salonId);
  const { data: masters = [] } = useSalonMasters(salonId);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#C81D60" />
      </SafeAreaView>
    );
  }

  if (!salon) return null;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        {/* Sticky back button */}
        <View className="px-4 py-2">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-9 h-9 rounded-full bg-white/90 items-center justify-center shadow-sm"
          >
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <Image
          source={
            salon.coverImageUrl
              ? { uri: salon.coverImageUrl }
              : require("../../../assets/icon.png")
          }
          className="w-full h-56"
          contentFit="cover"
        />

        {/* Info */}
        <View className="px-4 py-4">
          <View className="flex-row items-start justify-between">
            <Text className="text-2xl font-bold text-gray-900 flex-1 mr-2">
              {localizedName(salon.name)}
            </Text>
            {salon.isVerified && (
              <View className="flex-row items-center bg-green-50 rounded-full px-2 py-1">
                <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                <Text className="text-xs text-green-600 ml-1">Проверен</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center mt-2">
            <Ionicons name="location-outline" size={14} color="#9ca3af" />
            <Text className="text-gray-500 ml-1 text-sm">{salon.address}</Text>
          </View>

          {salon.rating != null && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text className="font-semibold text-gray-700 ml-1">
                {salon.rating.toFixed(1)}
              </Text>
              {salon.reviewCount != null && (
                <Text className="text-gray-400 ml-1">({salon.reviewCount} отзывов)</Text>
              )}
            </View>
          )}

          {salon.phone && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="call-outline" size={14} color="#9ca3af" />
              <Text className="text-gray-500 ml-1 text-sm">{salon.phone}</Text>
            </View>
          )}
        </View>

        {/* Services */}
        {services.length > 0 && (
          <View className="px-4 pb-4">
            <Text className="text-lg font-bold text-gray-900 mb-3">Услуги</Text>
            {services.map((service) => (
              <TouchableOpacity
                key={service.id}
                className="flex-row items-center justify-between py-3 border-b border-gray-100"
                onPress={() =>
                  navigation.navigate("Salon", { salonId }) // placeholder — goes to BookingFlow
                }
              >
                <View className="flex-1 mr-4">
                  <Text className="text-base font-medium text-gray-800">
                    {localizedName(service.name)}
                  </Text>
                  <Text className="text-sm text-gray-400 mt-0.5">
                    {service.durationMinutes} мин
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-base font-semibold text-primary">
                    {formatPrice(service.priceUzs)}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#C81D60" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Masters */}
        {masters.length > 0 && (
          <View className="px-4 pb-8">
            <Text className="text-lg font-bold text-gray-900 mb-3">Мастера</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {masters.map((master) => {
                const name = [master.firstName, master.lastName].filter(Boolean).join(" ");
                return (
                  <TouchableOpacity
                    key={master.id}
                    className="items-center mr-4 w-20"
                    onPress={() => navigation.navigate("Master", { masterId: master.id })}
                  >
                    <Image
                      source={
                        master.avatarUrl
                          ? { uri: master.avatarUrl }
                          : require("../../../assets/icon.png")
                      }
                      className="w-16 h-16 rounded-full"
                      contentFit="cover"
                    />
                    <Text className="text-xs text-gray-600 text-center mt-1" numberOfLines={2}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      <View className="px-4 pb-6 pt-3 bg-white border-t border-gray-100">
        <TouchableOpacity
          className="bg-primary rounded-xl py-4 items-center"
          onPress={() =>
            (navigation as any).navigate("BookingsTab", {
              screen: "BookingFlow",
              params: { salonId },
            })
          }
          activeOpacity={0.9}
        >
          <Text className="text-white font-bold text-base">Записаться</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
