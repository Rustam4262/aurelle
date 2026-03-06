import React, { useState } from "react";
import { View, TextInput, Text, TouchableOpacity, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>
      )}
      <View
        className={`flex-row items-center border rounded-xl px-3 bg-white ${
          error ? "border-red-400" : "border-gray-200"
        }`}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color="#9ca3af"
            style={{ marginRight: 8 }}
          />
        )}
        <TextInput
          className="flex-1 py-3 text-base text-gray-800"
          placeholderTextColor="#9ca3af"
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color="#9ca3af"
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity onPress={onRightIconPress}>
            <Ionicons name={rightIcon} size={18} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>
      {error && <Text className="text-sm text-red-500 mt-1">{error}</Text>}
    </View>
  );
}
