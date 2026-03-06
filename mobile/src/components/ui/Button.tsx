import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const base = "flex-row items-center justify-center rounded-xl";

  const variants = {
    primary: "bg-primary active:bg-primary-600",
    secondary: "bg-gray-100 active:bg-gray-200",
    outline: "border border-primary bg-transparent active:bg-primary-50",
    ghost: "bg-transparent active:bg-gray-100",
  };

  const sizes = {
    sm: "px-4 py-2",
    md: "px-6 py-3.5",
    lg: "px-8 py-4",
  };

  const textVariants = {
    primary: "text-white font-semibold",
    secondary: "text-gray-800 font-semibold",
    outline: "text-primary font-semibold",
    ghost: "text-gray-700 font-medium",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      className={`${base} ${variants[variant]} ${sizes[size]} ${isDisabled ? "opacity-50" : ""}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#fff" : "#C81D60"}
        />
      ) : (
        <Text className={`${textVariants[variant]} ${textSizes[size]}`}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
