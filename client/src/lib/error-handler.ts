/* eslint-disable @typescript-eslint/no-namespace */
import { toast } from "@/hooks/use-toast";
import { logger } from "./logger";

/**
 * API Error Types
 * These should match the error codes from the backend
 */
export enum ApiErrorCode {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  // Authentication errors
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",

  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",

  // Business logic errors
  BOOKING_CONFLICT = "BOOKING_CONFLICT",
  SLOT_UNAVAILABLE = "SLOT_UNAVAILABLE",
  SALON_NOT_FOUND = "SALON_NOT_FOUND",
  SERVICE_NOT_FOUND = "SERVICE_NOT_FOUND",
  MASTER_NOT_FOUND = "MASTER_NOT_FOUND",
  BOOKING_NOT_FOUND = "BOOKING_NOT_FOUND",

  // Payment errors
  PAYMENT_FAILED = "PAYMENT_FAILED",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",

  // Rate limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Server errors
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",

  // Network errors
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",

  // Unknown
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * API Error Response Structure
 */
export interface ApiError {
  code: ApiErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
  timestamp?: string;
  path?: string;
}

/**
 * User-friendly error messages (Russian)
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication
  [ApiErrorCode.UNAUTHORIZED]: "Пожалуйста, войдите в систему",
  [ApiErrorCode.FORBIDDEN]: "У вас нет доступа к этому ресурсу",
  [ApiErrorCode.TOKEN_EXPIRED]: "Ваша сессия истекла. Пожалуйста, войдите снова",

  // Validation
  [ApiErrorCode.VALIDATION_ERROR]: "Проверьте правильность введённых данных",
  [ApiErrorCode.INVALID_INPUT]: "Некорректные данные",

  // Business logic
  [ApiErrorCode.BOOKING_CONFLICT]: "Это время уже занято. Выберите другое время",
  [ApiErrorCode.SLOT_UNAVAILABLE]: "Выбранное время недоступно",
  [ApiErrorCode.SALON_NOT_FOUND]: "Салон не найден",
  [ApiErrorCode.SERVICE_NOT_FOUND]: "Услуга не найдена",
  [ApiErrorCode.MASTER_NOT_FOUND]: "Мастер не найден",
  [ApiErrorCode.BOOKING_NOT_FOUND]: "Бронирование не найдено",

  // Payment
  [ApiErrorCode.PAYMENT_FAILED]: "Ошибка оплаты. Попробуйте снова",
  [ApiErrorCode.INSUFFICIENT_FUNDS]: "Недостаточно средств",

  // Rate limiting
  [ApiErrorCode.RATE_LIMIT_EXCEEDED]: "Слишком много запросов. Попробуйте через несколько минут",

  // Server errors
  [ApiErrorCode.INTERNAL_SERVER_ERROR]: "Внутренняя ошибка сервера. Мы работаем над исправлением",
  [ApiErrorCode.SERVICE_UNAVAILABLE]: "Сервис временно недоступен. Попробуйте позже",

  // Network errors
  [ApiErrorCode.NETWORK_ERROR]: "Ошибка сети. Проверьте подключение к интернету",
  [ApiErrorCode.TIMEOUT]: "Превышено время ожидания. Попробуйте снова",

  // Default
  [ApiErrorCode.UNKNOWN_ERROR]: "Произошла неизвестная ошибка",
};

/**
 * Parse error from various sources
 */
export function parseApiError(error: unknown): ApiError {
  const err = error as Record<string, unknown>;

  // If it's already an ApiError
  if (err?.code && err?.message) {
    return error as ApiError;
  }

  // If it's a fetch Response error
  if (err?.response) {
    const resp = err.response as { status: number; data?: Record<string, unknown> };
    const status = resp.status;
    const data = resp.data || {};

    return {
      code: (data.code as string) || getErrorCodeFromStatus(status),
      message:
        (data.message as string) ||
        (data.error as string) ||
        ERROR_MESSAGES[getErrorCodeFromStatus(status)],
      details: data.details as Record<string, unknown> | undefined,
    };
  }

  // If it's a standard Error object
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return {
        code: ApiErrorCode.NETWORK_ERROR,
        message: ERROR_MESSAGES[ApiErrorCode.NETWORK_ERROR],
      };
    }

    // Timeout errors
    if (error.message.includes("timeout")) {
      return {
        code: ApiErrorCode.TIMEOUT,
        message: ERROR_MESSAGES[ApiErrorCode.TIMEOUT],
      };
    }

    return {
      code: ApiErrorCode.UNKNOWN_ERROR,
      message: error.message,
    };
  }

  // If it's a string
  if (typeof error === "string") {
    return {
      code: ApiErrorCode.UNKNOWN_ERROR,
      message: error,
    };
  }

  // Default unknown error
  return {
    code: ApiErrorCode.UNKNOWN_ERROR,
    message: ERROR_MESSAGES[ApiErrorCode.UNKNOWN_ERROR],
  };
}

/**
 * Get error code from HTTP status code
 */
function getErrorCodeFromStatus(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return ApiErrorCode.UNAUTHORIZED;
    case 403:
      return ApiErrorCode.FORBIDDEN;
    case 404:
      return ApiErrorCode.SALON_NOT_FOUND; // Generic not found
    case 409:
      return ApiErrorCode.BOOKING_CONFLICT;
    case 422:
      return ApiErrorCode.VALIDATION_ERROR;
    case 429:
      return ApiErrorCode.RATE_LIMIT_EXCEEDED;
    case 500:
      return ApiErrorCode.INTERNAL_SERVER_ERROR;
    case 503:
      return ApiErrorCode.SERVICE_UNAVAILABLE;
    default:
      return ApiErrorCode.UNKNOWN_ERROR;
  }
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  const apiError = parseApiError(error);
  return (
    ERROR_MESSAGES[apiError.code] || apiError.message || ERROR_MESSAGES[ApiErrorCode.UNKNOWN_ERROR]
  );
}

/**
 * Centralized API Error Handler
 * Shows toast notification with user-friendly error message
 */
export function handleApiError(error: unknown, customMessage?: string) {
  const apiError = parseApiError(error);
  const message = customMessage || ERROR_MESSAGES[apiError.code] || apiError.message;

  logger.error("API Error", error, {
    source: "apiError",
    meta: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
    },
  });

  // Show toast notification
  toast({
    variant: "destructive",
    title: "Ошибка",
    description: message,
  });

  // Handle specific error codes
  switch (apiError.code) {
    case ApiErrorCode.UNAUTHORIZED:
    case ApiErrorCode.TOKEN_EXPIRED:
      // Redirect to login after a delay
      setTimeout(() => {
        window.location.href = "/auth";
      }, 2000);
      break;

    case ApiErrorCode.RATE_LIMIT_EXCEEDED:
      // Maybe disable form for a few seconds
      break;

    default:
      // No special handling
      break;
  }

  return apiError;
}

/**
 * Handle specific error types with custom logic
 */
export const errorHandlers = {
  /**
   * Booking conflict error
   */
  bookingConflict: (error: unknown) => {
    const apiError = parseApiError(error);
    toast({
      variant: "destructive",
      title: "Время занято",
      description: "Выбранное время уже забронировано. Пожалуйста, выберите другое время.",
    });
    return apiError;
  },

  /**
   * Validation error with field details
   */
  validation: (error: unknown, fields?: Record<string, string>) => {
    const apiError = parseApiError(error);
    const fieldErrors = apiError.details?.fields || fields || {};

    // Show first field error
    const firstError = Object.values(fieldErrors)[0];
    if (firstError) {
      toast({
        variant: "destructive",
        title: "Ошибка валидации",
        description: firstError as string,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Ошибка валидации",
        description: "Проверьте правильность введённых данных",
      });
    }

    return { ...apiError, fieldErrors };
  },

  /**
   * Network error with retry option
   */
  network: (error: unknown) => {
    const apiError = parseApiError(error);
    toast({
      variant: "destructive",
      title: "Ошибка сети",
      description: "Проверьте подключение к интернету",
    });
    return apiError;
  },

  /**
   * Generic error with custom message
   */
  custom: (message: string, title?: string) => {
    toast({
      variant: "destructive",
      title: title || "Ошибка",
      description: message,
    });
  },
};

/**
 * Async error handler wrapper
 * Wraps async functions and handles errors automatically
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorMessage?: string,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleApiError(error, errorMessage);
      throw error; // Re-throw for caller to handle if needed
    }
  }) as T;
}

/**
 * Log error to external service (Sentry)
 * Integrated with unified logger
 */
export function logErrorToService(error: Error, errorInfo?: unknown) {
  logger.error("External error logged", error, {
    source: "errorService",
    meta: errorInfo as Record<string, unknown> | undefined,
  });
}
