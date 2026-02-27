/**
 * Form Validation Utilities
 * Provides validation functions for forms
 */

export interface ValidationRule {
  required?: boolean | string;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: (value: unknown) => boolean | string;
}

export interface ValidationErrors {
  [key: string]: string;
}

/**
 * Email validation
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function getEmailError(email: string): string | null {
  if (!email) {
    return "Email обязателен";
  }
  if (!validateEmail(email)) {
    return "Введите корректный email адрес";
  }
  return null;
}

/**
 * Phone validation (Uzbekistan format)
 * Format: +998 XX XXX XX XX or 998XXXXXXXXX or XXXXXXXXX
 */
export function validatePhone(phone: string): boolean {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Check if it's a valid UZ phone number
  // Should be 12 digits with 998 prefix, or 9 digits without prefix
  if (cleaned.length === 12 && cleaned.startsWith("998")) {
    return true;
  }
  if (cleaned.length === 9) {
    return true;
  }

  return false;
}

export function getPhoneError(phone: string): string | null {
  if (!phone) {
    return "Телефон обязателен";
  }
  if (!validatePhone(phone)) {
    return "Введите корректный номер телефона (формат: +998 XX XXX XX XX)";
  }
  return null;
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  // If starts with 998, format as: +998 XX XXX XX XX
  if (cleaned.startsWith("998") && cleaned.length === 12) {
    return `+998 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(
      8,
      10,
    )} ${cleaned.slice(10)}`;
  }

  // If 9 digits, format as: XX XXX XX XX
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(
      5,
      7,
    )} ${cleaned.slice(7)}`;
  }

  return phone;
}

/**
 * Password validation
 */
export function validatePassword(password: string): boolean {
  // At least 8 characters
  return password.length >= 8;
}

export function getPasswordError(password: string): string | null {
  if (!password) {
    return "Пароль обязателен";
  }
  if (password.length < 8) {
    return "Пароль должен содержать минимум 8 символов";
  }
  // Optional: add more rules
  // if (!/[A-Z]/.test(password)) {
  //   return "Пароль должен содержать минимум одну заглавную букву";
  // }
  // if (!/[0-9]/.test(password)) {
  //   return "Пароль должен содержать минимум одну цифру";
  // }
  return null;
}

/**
 * Required field validation
 */
export function validateRequired(value: unknown, fieldName?: string): string | null {
  if (!value || (typeof value === "string" && value.trim() === "")) {
    return `${fieldName || "Это поле"} обязательно для заполнения`;
  }
  return null;
}

/**
 * Min length validation
 */
export function validateMinLength(
  value: string,
  minLength: number,
  fieldName?: string,
): string | null {
  if (value && value.length < minLength) {
    return `${fieldName || "Это поле"} должно содержать минимум ${minLength} символов`;
  }
  return null;
}

/**
 * Max length validation
 */
export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName?: string,
): string | null {
  if (value && value.length > maxLength) {
    return `${fieldName || "Это поле"} должно содержать максимум ${maxLength} символов`;
  }
  return null;
}

/**
 * Number range validation
 */
export function validateNumberRange(
  value: number,
  min?: number,
  max?: number,
  fieldName?: string,
): string | null {
  if (min !== undefined && value < min) {
    return `${fieldName || "Значение"} должно быть не меньше ${min}`;
  }
  if (max !== undefined && value > max) {
    return `${fieldName || "Значение"} должно быть не больше ${max}`;
  }
  return null;
}

/**
 * Date validation
 */
export function validateDate(date: string | Date): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
}

export function validateFutureDate(date: string | Date): string | null {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dateObj < today) {
    return "Выберите дату не ранее сегодняшнего дня";
  }
  return null;
}

/**
 * Time validation (HH:MM format)
 */
export function validateTime(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

export function getTimeError(time: string): string | null {
  if (!time) {
    return "Время обязательно";
  }
  if (!validateTime(time)) {
    return "Введите корректное время (формат: ЧЧ:ММ)";
  }
  return null;
}

/**
 * URL validation
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Comprehensive form validator
 */
export class FormValidator {
  private errors: ValidationErrors = {};

  /**
   * Validate a field with rules
   */
  validateField(fieldName: string, value: unknown, rules: ValidationRule): string | null {
    // Required validation
    if (rules.required) {
      const message = typeof rules.required === "string" ? rules.required : undefined;
      const error = validateRequired(value, message || fieldName);
      if (error) {
        this.errors[fieldName] = error;
        return error;
      }
    }

    // Skip other validations if field is empty and not required
    if (!value) {
      delete this.errors[fieldName];
      return null;
    }

    // Min length validation
    if (rules.minLength && typeof value === "string") {
      const error = validateMinLength(
        value,
        rules.minLength.value,
        rules.minLength.message || fieldName,
      );
      if (error) {
        this.errors[fieldName] = rules.minLength.message || error;
        return this.errors[fieldName];
      }
    }

    // Max length validation
    if (rules.maxLength && typeof value === "string") {
      const error = validateMaxLength(
        value,
        rules.maxLength.value,
        rules.maxLength.message || fieldName,
      );
      if (error) {
        this.errors[fieldName] = rules.maxLength.message || error;
        return this.errors[fieldName];
      }
    }

    // Pattern validation
    if (rules.pattern && typeof value === "string") {
      if (!rules.pattern.value.test(value)) {
        this.errors[fieldName] = rules.pattern.message;
        return this.errors[fieldName];
      }
    }

    // Custom validation
    if (rules.validate) {
      const result = rules.validate(value);
      if (typeof result === "string") {
        this.errors[fieldName] = result;
        return result;
      }
      if (result === false) {
        this.errors[fieldName] = `Некорректное значение для ${fieldName}`;
        return this.errors[fieldName];
      }
    }

    // No errors
    delete this.errors[fieldName];
    return null;
  }

  /**
   * Validate multiple fields
   */
  validateFields(fields: Record<string, { value: unknown; rules: ValidationRule }>) {
    this.errors = {};

    for (const [fieldName, field] of Object.entries(fields)) {
      this.validateField(fieldName, field.value, field.rules);
    }

    return this.errors;
  }

  /**
   * Get all errors
   */
  getErrors(): ValidationErrors {
    return this.errors;
  }

  /**
   * Check if form is valid
   */
  isValid(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors = {};
  }

  /**
   * Clear specific field error
   */
  clearFieldError(fieldName: string) {
    delete this.errors[fieldName];
  }
}

/**
 * Common validation rules presets
 */
export const ValidationRules = {
  email: {
    required: true,
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Введите корректный email адрес",
    },
  },

  phone: {
    required: true,
    validate: (value: string) => {
      if (!validatePhone(value)) {
        return "Введите корректный номер телефона";
      }
      return true;
    },
  },

  password: {
    required: true,
    minLength: {
      value: 8,
      message: "Пароль должен содержать минимум 8 символов",
    },
  },

  required: {
    required: true,
  },

  salonName: {
    required: true,
    minLength: {
      value: 3,
      message: "Название салона должно содержать минимум 3 символа",
    },
    maxLength: {
      value: 100,
      message: "Название салона должно содержать максимум 100 символов",
    },
  },

  serviceName: {
    required: true,
    minLength: {
      value: 3,
      message: "Название услуги должно содержать минимум 3 символа",
    },
    maxLength: {
      value: 100,
      message: "Название услуги должно содержать максимум 100 символов",
    },
  },

  description: {
    maxLength: {
      value: 500,
      message: "Описание должно содержать максимум 500 символов",
    },
  },

  reviewComment: {
    required: true,
    minLength: {
      value: 10,
      message: "Отзыв должен содержать минимум 10 символов",
    },
    maxLength: {
      value: 1000,
      message: "Отзыв должен содержать максимум 1000 символов",
    },
  },

  price: {
    required: true,
    validate: (value: unknown) => {
      const num = Number(value);
      if (isNaN(num) || num <= 0) {
        return "Цена должна быть положительным числом";
      }
      return true;
    },
  },

  duration: {
    required: true,
    validate: (value: unknown) => {
      const num = Number(value);
      if (isNaN(num) || num <= 0) {
        return "Длительность должна быть положительным числом";
      }
      if (num > 480) {
        // 8 hours max
        return "Длительность не может превышать 480 минут (8 часов)";
      }
      return true;
    },
  },
};
