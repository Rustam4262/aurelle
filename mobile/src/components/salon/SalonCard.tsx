import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { Salon } from "../../types/api";

function localizedName(name: Salon["name"]): string {
  if (typeof name === "string") return name;
  return name.ru || name.en || name.uz || "";
}

interface SalonCardProps {
  salon: Salon;
  onPress: () => void;
}

export function SalonCard({ salon, onPress }: SalonCardProps) {
  return (
    <TouchableOpacity
      className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden border border-gray-100"
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Cover Image */}
      <Image
        source={
          salon.coverImageUrl
            ? { uri: salon.coverImageUrl }
            : require("../../../assets/salon-placeholder.png")
        }
        className="w-full h-44"
        contentFit="cover"
        transition={200}
      />

      {/* Verified badge */}
      {salon.isVerified && (
        <View className="absolute top-3 right-3 bg-white/90 rounded-full px-2 py-1 flex-row items-center">
          <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
          <Text className="text-xs text-green-600 font-medium ml-1">
            Проверен
          </Text>
        </View>
      )}

      <View className="p-4">
        <Text className="text-base font-semibold text-gray-900 mb-1" numberOfLines={1}>
          {localizedName(salon.name)}
        </Text>

        <View className="flex-row items-center mb-2">
          <Ionicons name="location-outline" size={13} color="#9ca3af" />
          <Text className="text-sm text-gray-500 ml-1" numberOfLines={1}>
            {salon.address}
          </Text>
        </View>

        {salon.rating != null && (
          <View className="flex-row items-center">
            <Ionicons name="star" size={13} color="#f59e0b" />
            <Text className="text-sm font-medium text-gray-700 ml-1">
              {salon.rating.toFixed(1)}
            </Text>
            {salon.reviewCount != null && (
              <Text className="text-sm text-gray-400 ml-1">
                ({salon.reviewCount})
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
