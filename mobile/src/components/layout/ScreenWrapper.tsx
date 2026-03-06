import React from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenWrapperProps extends ViewProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: ("top" | "bottom" | "left" | "right")[];
}

export function ScreenWrapper({
  children,
  scroll = false,
  padded = true,
  edges = ["top", "bottom"],
  ...props
}: ScreenWrapperProps) {
  const content = scroll ? (
    <ScrollView
      className={`flex-1 ${padded ? "px-4" : ""}`}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={`flex-1 ${padded ? "px-4" : ""}`} {...props}>
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={edges}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
