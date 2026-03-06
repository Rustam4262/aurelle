import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useLogout } from "../../hooks/useAuth";

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
}

function MenuItem({ icon, label, subtitle, onPress, destructive }: MenuItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-3.5 bg-white border-b border-gray-50"
      activeOpacity={0.7}
    >
      <View
        className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
          destructive ? "bg-red-50" : "bg-gray-100"
        }`}
      >
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? "#ef4444" : "#6b7280"}
        />
      </View>
      <View className="flex-1">
        <Text
          className={`text-base font-medium ${
            destructive ? "text-red-500" : "text-gray-800"
          }`}
        >
          {label}
        </Text>
        {subtitle && (
          <Text className="text-xs text-gray-400 mt-0.5">{subtitle}</Text>
        )}
      </View>
      {!destructive && (
        <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
      )}
    </TouchableOpacity>
  );
}

export function ProfileScreen() {
  const { user } = useAuth();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    Alert.alert("Выйти из аккаунта?", "", [
      { text: "Отмена" },
      {
        text: "Выйти",
        style: "destructive",
        onPress: () => logoutMutation.mutate(),
      },
    ]);
  };

  if (!user) return null;

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const initials = (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "");

  const ROLE_LABELS: Record<string, string> = {
    client: "Клиент",
    salon_owner: "Владелец салона",
    master: "Мастер",
    admin: "Администратор",
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-4 pt-4 pb-6 bg-white">
          <Text className="text-2xl font-bold text-gray-900 mb-4">Профиль</Text>

          <View className="flex-row items-center">
            {/* Avatar */}
            <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center mr-4">
              <Text className="text-xl font-bold text-primary">
                {initials.toUpperCase() || "?"}
              </Text>
            </View>
            <View>
              <Text className="text-lg font-semibold text-gray-800">{displayName}</Text>
              <Text className="text-sm text-gray-500">{user.email}</Text>
              <View className="mt-1 self-start bg-primary/10 px-2 py-0.5 rounded-full">
                <Text className="text-xs text-primary font-medium">
                  {ROLE_LABELS[user.role] ?? user.role}
                </Text>
              </View>
            </View>
          </View>

          {!user.emailVerified && (
            <View className="mt-4 flex-row items-center p-3 bg-amber-50 rounded-xl">
              <Ionicons name="warning-outline" size={16} color="#d97706" />
              <Text className="text-sm text-amber-700 ml-2">
                Email не подтверждён
              </Text>
            </View>
          )}
        </View>

        {/* Menu sections */}
        <View className="mt-4 rounded-2xl overflow-hidden mx-4">
          <MenuItem
            icon="person-outline"
            label="Личные данные"
            subtitle="Имя, телефон, город"
            onPress={() => {}}
          />
          <MenuItem
            icon="notifications-outline"
            label="Уведомления"
            onPress={() => {}}
          />
          <MenuItem
            icon="language-outline"
            label="Язык"
            subtitle="Русский"
            onPress={() => {}}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Безопасность"
            subtitle="Пароль, двухфакторная аутентификация"
            onPress={() => {}}
          />
        </View>

        <View className="mt-4 rounded-2xl overflow-hidden mx-4">
          <MenuItem
            icon="help-circle-outline"
            label="Поддержка"
            onPress={() => {}}
          />
          <MenuItem
            icon="document-text-outline"
            label="Условия использования"
            onPress={() => {}}
          />
          <MenuItem
            icon="information-circle-outline"
            label="О приложении"
            subtitle="v1.0.0"
            onPress={() => {}}
          />
        </View>

        <View className="mt-4 rounded-2xl overflow-hidden mx-4 mb-8">
          <MenuItem
            icon="log-out-outline"
            label="Выйти"
            onPress={handleLogout}
            destructive
          />
        </View>

        {logoutMutation.isPending && (
          <View className="absolute inset-0 bg-white/50 items-center justify-center">
            <ActivityIndicator size="large" color="#C81D60" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
