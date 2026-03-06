import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenWrapper } from "../../components/layout/ScreenWrapper";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { forgotPassword } from "../../lib/auth";
import type { AuthStackParams } from "../../navigation/AuthStack";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
});

type FormData = z.infer<typeof schema>;
type Props = NativeStackScreenProps<AuthStackParams, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      Alert.alert("Ошибка", "Не удалось отправить письмо. Проверьте email.");
    } finally {
      setLoading(false);
    }
  });

  return (
    <ScreenWrapper padded>
      <View className="flex-row items-center mt-4 mb-8">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Text className="text-primary text-base">← Назад</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-800">Сброс пароля</Text>
      </View>

      {sent ? (
        <View className="items-center mt-8">
          <Text className="text-5xl mb-4">📧</Text>
          <Text className="text-xl font-semibold text-gray-800 mb-2">
            Письмо отправлено
          </Text>
          <Text className="text-gray-500 text-center px-4">
            Проверьте почту и перейдите по ссылке для сброса пароля
          </Text>
          <Button
            title="Вернуться к входу"
            variant="outline"
            onPress={() => navigation.navigate("Login")}
            className="mt-8 w-full"
          />
        </View>
      ) : (
        <View>
          <Text className="text-gray-500 mb-6">
            Введите email, указанный при регистрации, и мы вышлем ссылку для сброса пароля.
          </Text>

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

          <Button
            title="Отправить ссылку"
            onPress={onSubmit}
            loading={loading}
          />
        </View>
      )}
    </ScreenWrapper>
  );
}
