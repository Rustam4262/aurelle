import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { HomeStack } from "./HomeStack";
import { BookingStack } from "./BookingStack";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { OwnerDashboardScreen } from "../screens/owner/OwnerDashboardScreen";
import { MasterDashboardScreen } from "../screens/master/MasterDashboardScreen";

const Tab = createBottomTabNavigator();

export function MainTabs() {
  const { role } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#C81D60",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          borderTopColor: "#f3f4f6",
          paddingBottom: 4,
          height: 60,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case "HomeTab":
              iconName = focused ? "home" : "home-outline";
              break;
            case "BookingsTab":
              iconName = focused ? "calendar" : "calendar-outline";
              break;
            case "ProfileTab":
              iconName = focused ? "person" : "person-outline";
              break;
            case "OwnerTab":
              iconName = focused ? "storefront" : "storefront-outline";
              break;
            case "MasterTab":
              iconName = focused ? "cut" : "cut-outline";
              break;
            default:
              iconName = "ellipse-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ tabBarLabel: "Главная" }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingStack}
        options={{ tabBarLabel: "Записи" }}
      />

      {role === "salon_owner" && (
        <Tab.Screen
          name="OwnerTab"
          component={OwnerDashboardScreen}
          options={{ tabBarLabel: "Салон" }}
        />
      )}

      {role === "master" && (
        <Tab.Screen
          name="MasterTab"
          component={MasterDashboardScreen}
          options={{ tabBarLabel: "Мастер" }}
        />
      )}

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: "Профиль" }}
      />
    </Tab.Navigator>
  );
}
