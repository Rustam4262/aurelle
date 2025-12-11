/**
 * Yandex Maps API v3 Loader
 *
 * Загружает Yandex Maps API асинхронно и возвращает Promise<typeof ymaps3>
 * Использует Singleton паттерн для предотвращения множественных загрузок
 */

// Singleton promise для хранения состояния загрузки
let ymapsPromise: Promise<any> | null = null

/**
 * Загружает Yandex Maps API v3
 * @returns Promise с объектом ymaps3
 * @throws Error если не удалось загрузить API
 */
export async function loadYandexMaps(): Promise<any> {
  // Если уже загружается или загружен, возвращаем существующий promise
  if (ymapsPromise) {
    return ymapsPromise
  }

  // Проверяем, может API уже загружен глобально
  if ((window as any).ymaps3) {
    ymapsPromise = Promise.resolve((window as any).ymaps3)
    return ymapsPromise
  }

  // Создаем новый promise для загрузки
  ymapsPromise = new Promise((resolve, reject) => {
    // Получаем API ключ из переменных окружения
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY

    if (!apiKey) {
      const errorMsg = 'Yandex Maps API key не найден. Установите VITE_YANDEX_MAPS_API_KEY в .env файле и перезапустите сервер разработки.'
      console.error('❌', errorMsg)
      console.error('🔍 Доступные переменные окружения:', import.meta.env)
      reject(new Error(errorMsg))
      return
    }

    console.log('🔑 Yandex Maps API ключ найден, начинаю загрузку...')
    console.log('📍 URL загрузки: https://api-maps.yandex.ru/v3/?apikey=***&lang=ru_RU')

    // Создаем script элемент для загрузки API
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${apiKey}&lang=ru_RU`
    script.async = true
    script.defer = true

    // Обработчик успешной загрузки
    script.onload = () => {
      // Yandex Maps v3 требует инициализации через ready()
      if ((window as any).ymaps3?.ready) {
        (window as any).ymaps3.ready.then(() => {
          console.log('✅ Yandex Maps API v3 успешно загружен')
          resolve((window as any).ymaps3)
        }).catch((error: Error) => {
          console.error('❌ Ошибка инициализации Yandex Maps:', error)
          reject(error)
        })
      } else {
        console.warn('⚠️ ymaps3.ready не найден, возвращаем ymaps3 напрямую')
        resolve((window as any).ymaps3)
      }
    }

    // Обработчик ошибки загрузки
    script.onerror = (error) => {
      console.error('❌ Не удалось загрузить Yandex Maps API:', error)
      ymapsPromise = null // Сброс для повторной попытки
      reject(new Error('Не удалось загрузить Yandex Maps API. Проверьте подключение к интернету и API ключ.'))
    }

    // Добавляем script в head
    document.head.appendChild(script)
  })

  return ymapsPromise
}

/**
 * Проверяет, загружен ли Yandex Maps API
 * @returns true если API загружен
 */
export function isYandexMapsLoaded(): boolean {
  return !!(window as any).ymaps3
}

/**
 * Сбрасывает состояние загрузчика (для тестирования)
 * В production использовать не рекомендуется
 */
export function resetYandexMapsLoader(): void {
  ymapsPromise = null
}
