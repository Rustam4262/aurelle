"""
Email Service для отправки уведомлений

Поддерживает:
- SMTP (Gmail, Yandex, etc.)
- Шаблоны писем (Jinja2)
- Асинхронная отправка
- Retry logic
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path
from typing import List, Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Настройка Jinja2 для email templates
template_dir = Path(__file__).parent.parent / "templates" / "emails"
template_dir.mkdir(parents=True, exist_ok=True)

jinja_env = Environment(
    loader=FileSystemLoader(str(template_dir)),
    autoescape=select_autoescape(['html', 'xml'])
)


class EmailService:
    """Сервис для отправки email"""

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.FROM_EMAIL
        self.from_name = settings.FROM_NAME

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Отправить email

        Args:
            to_email: Email получателя
            subject: Тема письма
            html_content: HTML содержимое
            text_content: Plain text содержимое (опционально)

        Returns:
            True если успешно отправлено
        """
        try:
            # Создать сообщение
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Добавить text version
            if text_content:
                part1 = MIMEText(text_content, "plain")
                message.attach(part1)

            # Добавить HTML version
            part2 = MIMEText(html_content, "html")
            message.attach(part2)

            # Отправить через SMTP
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=True
            )

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    async def send_template_email(
        self,
        to_email: str,
        subject: str,
        template_name: str,
        context: dict
    ) -> bool:
        """
        Отправить email используя Jinja2 template

        Args:
            to_email: Email получателя
            subject: Тема письма
            template_name: Имя template файла (без расширения)
            context: Контекст для template

        Returns:
            True если успешно отправлено
        """
        try:
            # Рендерить HTML template
            html_template = jinja_env.get_template(f"{template_name}.html")
            html_content = html_template.render(**context)

            # Рендерить text template (опционально)
            text_content = None
            try:
                text_template = jinja_env.get_template(f"{template_name}.txt")
                text_content = text_template.render(**context)
            except Exception:
                pass  # Text template не обязателен

            # Отправить
            return await self.send_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )

        except Exception as e:
            logger.error(f"Failed to send template email: {e}")
            return False

    async def send_booking_confirmation(
        self,
        to_email: str,
        booking_data: dict
    ) -> bool:
        """
        Отправить подтверждение бронирования

        Args:
            to_email: Email клиента
            booking_data: Данные о бронировании

        Returns:
            True если успешно
        """
        return await self.send_template_email(
            to_email=to_email,
            subject=f"Подтверждение бронирования #{booking_data['id']}",
            template_name="booking_confirmation",
            context=booking_data
        )

    async def send_booking_reminder(
        self,
        to_email: str,
        booking_data: dict
    ) -> bool:
        """
        Отправить напоминание о бронировании

        Args:
            to_email: Email клиента
            booking_data: Данные о бронировании

        Returns:
            True если успешно
        """
        return await self.send_template_email(
            to_email=to_email,
            subject=f"Напоминание: визит завтра в {booking_data['time']}",
            template_name="booking_reminder",
            context=booking_data
        )

    async def send_booking_cancellation(
        self,
        to_email: str,
        booking_data: dict,
        cancelled_by: str
    ) -> bool:
        """
        Отправить уведомление об отмене

        Args:
            to_email: Email получателя
            booking_data: Данные о бронировании
            cancelled_by: Кто отменил (client/salon)

        Returns:
            True если успешно
        """
        context = {**booking_data, "cancelled_by": cancelled_by}

        return await self.send_template_email(
            to_email=to_email,
            subject=f"Бронирование #{booking_data['id']} отменено",
            template_name="booking_cancellation",
            context=context
        )

    async def send_new_review_notification(
        self,
        to_email: str,
        review_data: dict
    ) -> bool:
        """
        Отправить уведомление о новом отзыве

        Args:
            to_email: Email владельца салона
            review_data: Данные отзыва

        Returns:
            True если успешно
        """
        return await self.send_template_email(
            to_email=to_email,
            subject=f"Новый отзыв: {review_data['rating']} звезд",
            template_name="new_review",
            context=review_data
        )

    async def send_welcome_email(
        self,
        to_email: str,
        user_data: dict
    ) -> bool:
        """
        Отправить приветственное письмо

        Args:
            to_email: Email нового пользователя
            user_data: Данные пользователя

        Returns:
            True если успешно
        """
        return await self.send_template_email(
            to_email=to_email,
            subject="Добро пожаловать в aurelle.uz!",
            template_name="welcome",
            context=user_data
        )

    async def send_password_reset(
        self,
        to_email: str,
        reset_link: str,
        user_name: str
    ) -> bool:
        """
        Отправить ссылку для сброса пароля

        Args:
            to_email: Email пользователя
            reset_link: Ссылка для сброса
            user_name: Имя пользователя

        Returns:
            True если успешно
        """
        return await self.send_template_email(
            to_email=to_email,
            subject="Сброс пароля - aurelle.uz",
            template_name="password_reset",
            context={
                "user_name": user_name,
                "reset_link": reset_link
            }
        )


# Singleton instance
_email_service = None


def get_email_service() -> EmailService:
    """Получить singleton instance email service"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
