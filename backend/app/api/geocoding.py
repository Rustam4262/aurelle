"""
Geocoding API Endpoints

API для геокодирования адресов через Yandex Geocoder
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from app.services.yandex_geocoder import geocode_address, reverse_geocode, get_geocode_details


router = APIRouter()


class GeocodeResponse(BaseModel):
    """Ответ геокодирования"""
    latitude: float = Field(..., description="Широта")
    longitude: float = Field(..., description="Долгота")
    formatted_address: Optional[str] = Field(None, description="Форматированный адрес")


class ReverseGeocodeResponse(BaseModel):
    """Ответ обратного геокодирования"""
    address: str = Field(..., description="Адрес")
    latitude: float = Field(..., description="Широта")
    longitude: float = Field(..., description="Долгота")


class GeocodeDetailsResponse(BaseModel):
    """Детальный ответ геокодирования"""
    formatted_address: str
    coordinates: Dict[str, float]
    country: str
    province: str
    locality: str
    street: str
    house: str
    precision: str
    kind: str


@router.get("/geocode", response_model=GeocodeResponse)
async def geocode(
    address: str = Query(..., description="Адрес для геокодирования", min_length=3)
):
    """
    Преобразовать адрес в координаты

    **Пример:**
    ```
    GET /api/geocoding/geocode?address=Ташкент, улица Амира Темура 1
    ```

    **Ответ:**
    ```json
    {
      "latitude": 41.311151,
      "longitude": 69.279737,
      "formatted_address": "Узбекистан, Ташкент, улица Амира Темура, 1"
    }
    ```
    """
    coords = await geocode_address(address)

    if not coords:
        raise HTTPException(
            status_code=404,
            detail=f"Адрес не найден: {address}"
        )

    # Получаем обратно адрес для форматирования
    formatted_address = await reverse_geocode(coords[0], coords[1])

    return GeocodeResponse(
        latitude=coords[0],
        longitude=coords[1],
        formatted_address=formatted_address
    )


@router.get("/reverse-geocode", response_model=ReverseGeocodeResponse)
async def reverse_geocode_endpoint(
    lat: float = Query(..., description="Широта", ge=-90, le=90),
    lon: float = Query(..., description="Долгота", ge=-180, le=180)
):
    """
    Преобразовать координаты в адрес

    **Пример:**
    ```
    GET /api/geocoding/reverse-geocode?lat=41.311151&lon=69.279737
    ```

    **Ответ:**
    ```json
    {
      "address": "Узбекистан, Ташкент, улица Амира Темура, 1",
      "latitude": 41.311151,
      "longitude": 69.279737
    }
    ```
    """
    address = await reverse_geocode(lat, lon)

    if not address:
        raise HTTPException(
            status_code=404,
            detail=f"Адрес не найден для координат: ({lat}, {lon})"
        )

    return ReverseGeocodeResponse(
        address=address,
        latitude=lat,
        longitude=lon
    )


@router.get("/details", response_model=GeocodeDetailsResponse)
async def geocode_details(
    address: str = Query(..., description="Адрес для детального геокодирования", min_length=3)
):
    """
    Получить детальную информацию о геокодировании

    **Пример:**
    ```
    GET /api/geocoding/details?address=Ташкент, Амира Темура 1
    ```

    **Ответ:**
    ```json
    {
      "formatted_address": "Узбекистан, Ташкент, улица Амира Темура, 1",
      "coordinates": {
        "latitude": 41.311151,
        "longitude": 69.279737
      },
      "country": "Узбекистан",
      "province": "Ташкент",
      "locality": "Ташкент",
      "street": "улица Амира Темура",
      "house": "1",
      "precision": "exact",
      "kind": "house"
    }
    ```
    """
    details = await get_geocode_details(address)

    if not details:
        raise HTTPException(
            status_code=404,
            detail=f"Не удалось получить детали для адреса: {address}"
        )

    return GeocodeDetailsResponse(**details)
