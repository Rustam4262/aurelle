import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "../screens/home/HomeScreen";
import { SearchScreen } from "../screens/home/SearchScreen";
import { SalonScreen } from "../screens/home/SalonScreen";
import { MasterScreen } from "../screens/home/MasterScreen";

export type HomeStackParams = {
  Home: undefined;
  Search: { query?: string; city?: string; category?: string };
  Salon: { salonId: string };
  Master: { masterId: string };
};

const Stack = createNativeStackNavigator<HomeStackParams>();

export function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Salon" component={SalonScreen} />
      <Stack.Screen name="Master" component={MasterScreen} />
    </Stack.Navigator>
  );
}
