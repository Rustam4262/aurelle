import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenWrapper } from "../../components/layout/ScreenWrapper";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useLogin } from "../../hooks/useAuth";
import type { AuthStackParams } from "../../navigation/AuthStack";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});

type FormData = z.infer<typeof schema>;
type Props = NativeStackScreenProps<AuthStackParams, "Login">;

export function LoginScreen({ navigation }: Props) {
  const loginMutation = useLogin();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await loginMutation.mutateAsync(data);
    } catch {
      Alert.alert("Ошибка", "Неверный email или пароль");
    }
  });

  return (
    <ScreenWrapper scroll padded>
      {/* Logo / Header */}
      <View className="items-center mt-12 mb-10">
        <Text className="text-4xl font-bold text-primary tracking-widest">
          AURELLE
        </Text>
        <Text className="text-gray-500 mt-2 text-base">
          Красота у вас под рукой
        </Text>
      </View>

      {/* Form */}
      <View>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              placeholder="example@mail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
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
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Пароль"
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              leftIcon="lock-closed-outline"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message}
            />
          )}
        />

        <TouchableOpacity
          className="self-end mb-5"
          onPress={() => navigation.navigate("ForgotPassword")}
        >
          <Text className="text-primary text-sm">Забыли пароль?</Text>
        </TouchableOpacity>

        <Button
          title="Войти"
          onPress={onSubmit}
          loading={loginMutation.isPending}
        />
      </View>

      {/* Footer */}
      <View className="flex-row justify-center mt-8">
        <Text className="text-gray-500">Нет аккаунта? </Text>
        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text className="text-primary font-semibold">Зарегистрироваться</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}
