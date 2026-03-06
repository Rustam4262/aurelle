import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SalonCard } from "../../components/salon/SalonCard";
import { useSalons, useCities } from "../../hooks/useSalons";
import type { HomeStackParams } from "../../navigation/HomeStack";

type Props = NativeStackScreenProps<HomeStackParams, "Home">;

const CITIES = ["Все города", "Ташкент", "Самарканд", "Бухара", "Наманган", "Андижан"];

export function HomeScreen({ navigation }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const { data, isLoading } = useSalons({
    city: selectedCity || undefined,
    limit: 20,
  });

  const salons = data?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="px-4 pt-2 pb-4 bg-white">
        <Text className="text-2xl font-bold text-gray-900 mb-3">
          Найдите мастера
        </Text>

        {/* Search bar */}
        <TouchableOpacity
          className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3"
          onPress={() =>
            navigation.navigate("Search", { query: searchQuery })
          }
          activeOpacity={0.8}
        >
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <Text className="ml-2 text-gray-400 text-base flex-1">
            Салон, мастер, услуга...
          </Text>
        </TouchableOpacity>
      </View>

      {/* City chips */}
      <View className="h-12 bg-white border-b border-gray-100">
        <FlatList
          horizontal
          data={CITIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, alignItems: "center" }}
          renderItem={({ item }) => {
            const city = item === "Все города" ? "" : item;
            const active = selectedCity === city;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCity(city)}
                className={`mr-2 px-4 py-1.5 rounded-full border ${
                  active
                    ? "bg-primary border-primary"
                    : "border-gray-200 bg-white"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    active ? "text-white" : "text-gray-600"
                  }`}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Salon list */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#C81D60" />
        </View>
      ) : (
        <FlatList
          data={salons}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Text className="text-gray-400 text-base">Салоны не найдены</Text>
            </View>
          }
          renderItem={({ item }) => (
            <SalonCard
              salon={item}
              onPress={() => navigation.navigate("Salon", { salonId: item.id })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
