/**
 * Утилиты для валидации форм
 */

// Regex для валидации телефона (Узбекистан: +998XXXXXXXXX)
export const PHONE_REGEX = /^\+998\d{9}$/

// Regex для валидации email
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Валидация номера телефона (формат Узбекистана)
 * @param phone - номер телефона
 * @returns true если валидный
 */
export function validatePhone(phone: string): boolean {
  return PHONE_REGEX.test(phone)
}

/**
 * Валидация email
 * @param email - email адрес
 * @returns true если валидный
 */
export function validateEmail(email: string): boolean {
  if (!email) return true // Email опциональный
  return EMAIL_REGEX.test(email)
}

/**
 * Форматирование номера телефона при вводе
 * Автоматически добавляет +998 если пользователь начинает вводить номер
 * @param value - введённое значение
 * @returns отформатированное значение
 */
export function formatPhoneInput(value: string): string {
  // Удаляем все символы кроме цифр и +
  let cleaned = value.replace(/[^\d+]/g, '')

  // Если начинается с 998, добавляем +
  if (cleaned.startsWith('998')) {
    cleaned = '+' + cleaned
  }

  // Если начинается с 8 или 9 (без +998), добавляем +998
  if (/^[89]/.test(cleaned)) {
    cleaned = '+998' + cleaned
  }

  // Если пустая строка или только +, возвращаем +998
  if (cleaned === '' || cleaned === '+') {
    return '+998'
  }

  // Ограничиваем длину: +998 (4) + 9 цифр = 13 символов
  if (cleaned.length > 13) {
    cleaned = cleaned.substring(0, 13)
  }

  return cleaned
}

/**
 * Получить сообщение об ошибке для телефона
 * @param phone - номер телефона
 * @returns сообщение об ошибке или null
 */
export function getPhoneError(phone: string): string | null {
  if (!phone) {
    return 'Введите номер телефона'
  }

  if (!phone.startsWith('+998')) {
    return 'Номер должен начинаться с +998'
  }

  if (phone.length !== 13) {
    return 'Номер должен содержать 9 цифр после +998'
  }

  if (!validatePhone(phone)) {
    return 'Неверный формат номера телефона'
  }

  return null
}

/**
 * Получить сообщение об ошибке для email
 * @param email - email адрес
 * @returns сообщение об ошибке или null
 */
export function getEmailError(email: string): string | null {
  if (!email) {
    return null // Email опциональный
  }

  if (!validateEmail(email)) {
    return 'Неверный формат email'
  }

  return null
}

/**
 * Валидация пароля
 * @param password - пароль
 * @returns сообщение об ошибке или null
 */
export function getPasswordError(password: string): string | null {
  if (!password) {
    return 'Введите пароль'
  }

  if (password.length < 6) {
    return 'Пароль должен содержать минимум 6 символов'
  }

  return null
}
