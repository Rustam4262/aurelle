import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenWrapper } from "../../components/layout/ScreenWrapper";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useRegister } from "../../hooks/useAuth";
import type { AuthStackParams } from "../../navigation/AuthStack";

const schema = z.object({
  firstName: z.string().min(2, "Минимум 2 символа"),
  lastName: z.string().optional(),
  email: z.string().email("Введите корректный email"),
  phone: z.string().optional(),
  password: z.string().min(8, "Минимум 8 символов"),
});

type FormData = z.infer<typeof schema>;
type Props = NativeStackScreenProps<AuthStackParams, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const registerMutation = useRegister();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await registerMutation.mutateAsync(data);
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? "Ошибка регистрации";
      Alert.alert("Ошибка", msg);
    }
  });

  return (
    <ScreenWrapper scroll padded>
      {/* Header */}
      <View className="flex-row items-center mt-4 mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Text className="text-primary text-base">← Назад</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-800">Регистрация</Text>
      </View>

      <Controller
        control={control}
        name="firstName"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Имя"
            placeholder="Алина"
            leftIcon="person-outline"
            autoCapitalize="words"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.firstName?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="lastName"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Фамилия (необязательно)"
            placeholder="Каримова"
            leftIcon="person-outline"
            autoCapitalize="words"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value ?? ""}
            error={errors.lastName?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Email"
            placeholder="example@mail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Телефон (необязательно)"
            placeholder="+998 90 123 45 67"
            keyboardType="phone-pad"
            leftIcon="call-outline"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value ?? ""}
            error={errors.phone?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Пароль"
            placeholder="Минимум 8 символов"
            secureTextEntry
            leftIcon="lock-closed-outline"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.password?.message}
          />
        )}
      />

      <Button
        title="Создать аккаунт"
        onPress={onSubmit}
        loading={registerMutation.isPending}
        className="mt-2"
      />

      <View className="flex-row justify-center mt-6">
        <Text className="text-gray-500">Уже есть аккаунт? </Text>
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text className="text-primary font-semibold">Войти</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}
