import React, { useState, useCallback, useRef } from "react";
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
function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  return useCallback((...args: Parameters<T>) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SalonCard } from "../../components/salon/SalonCard";
import { useSalons } from "../../hooks/useSalons";
import type { HomeStackParams } from "../../navigation/HomeStack";

type Props = NativeStackScreenProps<HomeStackParams, "Search">;

const CATEGORIES = ["Все", "Стрижки", "Маникюр", "Ресницы", "Брови", "Макияж", "Массаж", "Спа"];

export function SearchScreen({ navigation, route }: Props) {
  const [query, setQuery] = useState(route.params?.query ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [selectedCategory, setSelectedCategory] = useState("");

  const debounce = useDebouncedCallback((v: string) => setDebouncedQuery(v), 400);

  const handleQueryChange = (v: string) => {
    setQuery(v);
    debounce(v);
  };

  const { data, isLoading } = useSalons({
    query: debouncedQuery || undefined,
    category: selectedCategory || undefined,
    limit: 30,
  });

  const salons = data?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Search bar */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-800"
            placeholder="Поиск..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={handleQueryChange}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleQueryChange("")}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category chips */}
      <View className="h-12 border-b border-gray-100">
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, alignItems: "center" }}
          renderItem={({ item }) => {
            const cat = item === "Все" ? "" : item;
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategory(cat)}
                className={`mr-2 px-4 py-1.5 rounded-full border ${
                  active ? "bg-primary border-primary" : "border-gray-200"
                }`}
              >
                <Text className={`text-sm font-medium ${active ? "text-white" : "text-gray-600"}`}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Results */}
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
          ListHeaderComponent={
            <Text className="text-sm text-gray-400 mb-3">
              {salons.length > 0 ? `Найдено: ${salons.length}` : "Ничего не найдено"}
            </Text>
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
