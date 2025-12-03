"""
Yandex Geocoder Service

Сервис для геокодирования и обратного геокодирования через Yandex Geocoder API.
Документация: https://yandex.ru/dev/maps/geocoder/
"""

import httpx
from typing import Optional, Tuple, Dict, Any
from app.core.config import settings


async def geocode_address(address: str) -> Optional[Tuple[float, float]]:
    """
    Геокодирование: адрес → координаты

    Args:
        address: Адрес для геокодирования (например, "Ташкент, улица Амира Темура 1")

    Returns:
        Tuple[latitude, longitude] или None если адрес не найден

    Example:
        >>> coords = await geocode_address("Ташкент, улица Амира Темура 1")
        >>> print(coords)  # (41.311151, 69.279737)
    """
    if not address or not address.strip():
        return None

    api_key = settings.YANDEX_MAPS_API_KEY
    url = "https://geocode-maps.yandex.ru/1.x/"

    params = {
        "apikey": api_key,
        "geocode": address,
        "format": "json",
        "results": 1  # Возвращаем только первый результат
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()

            data = response.json()

            # Проверяем наличие результатов
            feature_members = data.get("response", {}).get("GeoObjectCollection", {}).get("featureMember", [])

            if not feature_members:
                print(f"⚠️ Адрес не найден: {address}")
                return None

            # Получаем координаты из первого результата
            geo_object = feature_members[0].get("GeoObject", {})
            point = geo_object.get("Point", {})
            pos = point.get("pos", "")

            if not pos:
                print(f"⚠️ Координаты не найдены для адреса: {address}")
                return None

            # Формат: "longitude latitude"
            lon_str, lat_str = pos.split()
            latitude = float(lat_str)
            longitude = float(lon_str)

            print(f"✅ Геокодирование успешно: {address} → ({latitude}, {longitude})")
            return (latitude, longitude)

    except httpx.HTTPStatusError as e:
        print(f"❌ HTTP ошибка при геокодировании: {e.response.status_code} - {e.response.text}")
        return None
    except httpx.RequestError as e:
        print(f"❌ Ошибка запроса при геокодировании: {e}")
        return None
    except (ValueError, IndexError, KeyError) as e:
        print(f"❌ Ошибка парсинга ответа геокодера: {e}")
        return None
    except Exception as e:
        print(f"❌ Неожиданная ошибка при геокодировании: {e}")
        return None


async def reverse_geocode(latitude: float, longitude: float) -> Optional[str]:
    """
    Обратное геокодирование: координаты → адрес

    Args:
        latitude: Широта (-90 до 90)
        longitude: Долгота (-180 до 180)

    Returns:
        Строка с адресом или None если адрес не найден

    Example:
        >>> address = await reverse_geocode(41.311151, 69.279737)
        >>> print(address)  # "Узбекистан, Ташкент, улица Амира Темура, 1"
    """
    # Валидация координат
    if not (-90 <= latitude <= 90):
        print(f"❌ Неверная широта: {latitude} (должна быть от -90 до 90)")
        return None

    if not (-180 <= longitude <= 180):
        print(f"❌ Неверная долгота: {longitude} (должна быть от -180 до 180)")
        return None

    api_key = settings.YANDEX_MAPS_API_KEY
    url = "https://geocode-maps.yandex.ru/1.x/"

    params = {
        "apikey": api_key,
        "geocode": f"{longitude},{latitude}",  # Формат: longitude,latitude
        "format": "json",
        "results": 1,
        "kind": "house"  # Приоритет: дома/здания
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()

            data = response.json()

            # Проверяем наличие результатов
            feature_members = data.get("response", {}).get("GeoObjectCollection", {}).get("featureMember", [])

            if not feature_members:
                print(f"⚠️ Адрес не найден для координат: ({latitude}, {longitude})")
                return None

            # Получаем адрес из первого результата
            geo_object = feature_members[0].get("GeoObject", {})
            metadata = geo_object.get("metaDataProperty", {}).get("GeocoderMetaData", {})
            address = metadata.get("text", "")

            if not address:
                print(f"⚠️ Адрес не найден для координат: ({latitude}, {longitude})")
                return None

            print(f"✅ Обратное геокодирование успешно: ({latitude}, {longitude}) → {address}")
            return address

    except httpx.HTTPStatusError as e:
        print(f"❌ HTTP ошибка при обратном геокодировании: {e.response.status_code} - {e.response.text}")
        return None
    except httpx.RequestError as e:
        print(f"❌ Ошибка запроса при обратном геокодировании: {e}")
        return None
    except (KeyError, IndexError) as e:
        print(f"❌ Ошибка парсинга ответа обратного геокодера: {e}")
        return None
    except Exception as e:
        print(f"❌ Неожиданная ошибка при обратном геокодировании: {e}")
        return None


async def get_geocode_details(address: str) -> Optional[Dict[str, Any]]:
    """
    Получить детальную информацию о геокодировании

    Args:
        address: Адрес для геокодирования

    Returns:
        Словарь с подробной информацией или None

    Example:
        >>> details = await get_geocode_details("Ташкент, Амира Темура 1")
        >>> print(details["formatted_address"])
        >>> print(details["coordinates"])
        >>> print(details["country"])
    """
    if not address or not address.strip():
        return None

    api_key = settings.YANDEX_MAPS_API_KEY
    url = "https://geocode-maps.yandex.ru/1.x/"

    params = {
        "apikey": api_key,
        "geocode": address,
        "format": "json",
        "results": 1
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()

            data = response.json()

            feature_members = data.get("response", {}).get("GeoObjectCollection", {}).get("featureMember", [])

            if not feature_members:
                return None

            geo_object = feature_members[0].get("GeoObject", {})
            metadata = geo_object.get("metaDataProperty", {}).get("GeocoderMetaData", {})
            point = geo_object.get("Point", {})
            pos = point.get("pos", "")

            if not pos:
                return None

            lon_str, lat_str = pos.split()
            latitude = float(lat_str)
            longitude = float(lon_str)

            # Извлекаем компоненты адреса
            address_components = metadata.get("Address", {}).get("Components", [])
            components_dict = {comp["kind"]: comp["name"] for comp in address_components}

            return {
                "formatted_address": metadata.get("text", ""),
                "coordinates": {
                    "latitude": latitude,
                    "longitude": longitude
                },
                "country": components_dict.get("country", ""),
                "province": components_dict.get("province", ""),
                "locality": components_dict.get("locality", ""),
                "street": components_dict.get("street", ""),
                "house": components_dict.get("house", ""),
                "precision": metadata.get("precision", ""),
                "kind": metadata.get("kind", "")
            }

    except Exception as e:
        print(f"❌ Ошибка получения деталей геокодирования: {e}")
        return None
