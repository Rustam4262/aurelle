import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BookingsScreen } from "../screens/booking/BookingsScreen";
import { BookingDetailScreen } from "../screens/booking/BookingDetailScreen";
import { BookingFlowScreen } from "../screens/booking/BookingFlowScreen";

export type BookingStackParams = {
  BookingsList: undefined;
  BookingDetail: { bookingId: string };
  BookingFlow: { salonId: string; serviceId?: string; masterId?: string };
};

const Stack = createNativeStackNavigator<BookingStackParams>();

export function BookingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="BookingsList" component={BookingsScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen
        name="BookingFlow"
        component={BookingFlowScreen}
        options={{ presentation: "modal" }}
      />
    </Stack.Navigator>
  );
}
