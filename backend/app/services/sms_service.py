"""
SMS Service для отправки SMS уведомлений

Поддержка провайдеров:
- SMS.ru (для России/СНГ)
- Twilio (международный)
- Eskiz.uz (для Узбекистана) - рекомендуется
"""
import httpx
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class SMSService:
    """Сервис для отправки SMS"""

    def __init__(self):
        self.provider = settings.SMS_PROVIDER  # "eskiz", "smsru", "twilio"
        self.api_key = settings.SMS_API_KEY
        self.api_url = settings.SMS_API_URL
        self.sender_name = settings.SMS_SENDER_NAME

    async def send_sms(self, phone: str, message: str) -> bool:
        """
        Отправить SMS

        Args:
            phone: Номер телефона (+998901234567)
            message: Текст сообщения

        Returns:
            True если успешно отправлено
        """
        try:
            if self.provider == "eskiz":
                return await self._send_eskiz(phone, message)
            elif self.provider == "smsru":
                return await self._send_smsru(phone, message)
            elif self.provider == "twilio":
                return await self._send_twilio(phone, message)
            else:
                logger.warning(f"Unknown SMS provider: {self.provider}")
                return False

        except Exception as e:
            logger.error(f"Failed to send SMS to {phone}: {e}")
            return False

    async def _send_eskiz(self, phone: str, message: str) -> bool:
        """Отправка через Eskiz.uz"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/message/sms/send",
                    data={
                        "mobile_phone": phone,
                        "message": message,
                        "from": self.sender_name,
                    },
                    headers={
                        "Authorization": f"Bearer {self.api_key}"
                    }
                )

                if response.status_code == 200:
                    logger.info(f"SMS sent successfully to {phone} via Eskiz")
                    return True
                else:
                    logger.error(f"Eskiz API error: {response.text}")
                    return False

        except Exception as e:
            logger.error(f"Eskiz SMS error: {e}")
            return False

    async def _send_smsru(self, phone: str, message: str) -> bool:
        """Отправка через SMS.ru"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://sms.ru/sms/send",
                    data={
                        "api_id": self.api_key,
                        "to": phone,
                        "msg": message,
                        "json": 1
                    }
                )

                data = response.json()
                if data.get("status") == "OK":
                    logger.info(f"SMS sent successfully to {phone} via SMS.ru")
                    return True
                else:
                    logger.error(f"SMS.ru API error: {data}")
                    return False

        except Exception as e:
            logger.error(f"SMS.ru error: {e}")
            return False

    async def _send_twilio(self, phone: str, message: str) -> bool:
        """Отправка через Twilio"""
        try:
            from twilio.rest import Client

            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

            message = client.messages.create(
                body=message,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone
            )

            logger.info(f"SMS sent successfully to {phone} via Twilio")
            return True

        except Exception as e:
            logger.error(f"Twilio error: {e}")
            return False

    async def send_booking_confirmation_sms(
        self,
        phone: str,
        booking_data: dict
    ) -> bool:
        """Отправить SMS подтверждение бронирования"""
        message = (
            f"Бронирование #{booking_data['id']} подтверждено!\n"
            f"Дата: {booking_data['date']}\n"
            f"Время: {booking_data['time']}\n"
            f"Салон: {booking_data['salon_name']}\n"
            f"aurelle.uz"
        )
        return await self.send_sms(phone, message)

    async def send_booking_reminder_sms(
        self,
        phone: str,
        booking_data: dict
    ) -> bool:
        """Отправить SMS напоминание"""
        message = (
            f"Напоминание: завтра визит в {booking_data['time']}\n"
            f"Салон: {booking_data['salon_name']}\n"
            f"Адрес: {booking_data['salon_address']}\n"
            f"Тел: {booking_data['salon_phone']}"
        )
        return await self.send_sms(phone, message)

    async def send_verification_code(self, phone: str, code: str) -> bool:
        """Отправить код верификации"""
        message = f"Ваш код подтверждения: {code}\naurelle.uz"
        return await self.send_sms(phone, message)


# Singleton
_sms_service = None


def get_sms_service() -> SMSService:
    """Получить singleton instance SMS service"""
    global _sms_service
    if _sms_service is None:
        _sms_service = SMSService()
    return _sms_service
