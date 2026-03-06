import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../../lib/api";
import type { Master } from "../../types/api";
import type { HomeStackParams } from "../../navigation/HomeStack";

type Props = NativeStackScreenProps<HomeStackParams, "Master">;

export function MasterScreen({ navigation, route }: Props) {
  const { masterId } = route.params;

  const { data: master, isLoading } = useQuery({
    queryKey: ["master", masterId],
    queryFn: async () => {
      const { data } = await api.get<Master>(`/api/salons/masters/${masterId}`);
      return data;
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#C81D60" />
      </SafeAreaView>
    );
  }

  if (!master) return null;

  const fullName = [master.firstName, master.lastName].filter(Boolean).join(" ");

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Back */}
      <TouchableOpacity
        className="px-4 py-3"
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={22} color="#374151" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View className="items-center py-6">
          <Image
            source={
              master.avatarUrl
                ? { uri: master.avatarUrl }
                : require("../../../assets/avatar-placeholder.png")
            }
            className="w-28 h-28 rounded-full"
            contentFit="cover"
          />
          <Text className="text-2xl font-bold text-gray-900 mt-4">{fullName}</Text>
          {master.specialization && (
            <Text className="text-gray-500 mt-1">{master.specialization}</Text>
          )}
          {master.rating != null && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text className="ml-1 font-semibold text-gray-700">
                {master.rating.toFixed(1)}
              </Text>
              {master.reviewCount != null && (
                <Text className="text-gray-400 ml-1">({master.reviewCount})</Text>
              )}
            </View>
          )}
        </View>

        {master.bio && (
          <View className="mx-4 p-4 bg-gray-50 rounded-2xl mb-6">
            <Text className="text-base text-gray-700 leading-6">{master.bio}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
