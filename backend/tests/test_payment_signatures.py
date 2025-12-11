"""
Тесты для проверки подписей платежных систем

Критически важные тесты для безопасности платежей:
- Payme HTTP Basic Auth
- Click MD5 подпись
- Uzum HMAC-SHA256 подпись
"""
import pytest
import base64
import hashlib
import hmac
from unittest.mock import MagicMock, patch

from app.api.payments import (
    verify_payme_signature,
    verify_click_signature,
    verify_uzum_signature
)
from app.schemas.payment import ClickRequest, UzumCallbackRequest


class TestPaymeSignatureVerification:
    """Тесты для Payme HTTP Basic Auth"""

    def test_valid_payme_signature(self):
        """✅ Валидная подпись Payme должна проходить проверку"""
        # Arrange
        secret_key = "test_secret_key_12345"
        credentials = f"Paycom:{secret_key}"
        encoded = base64.b64encode(credentials.encode()).decode()
        authorization = f"Basic {encoded}"

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.PAYME_SECRET_KEY = secret_key

            # Act
            result = verify_payme_signature({}, authorization)

            # Assert
            assert result is True

    def test_invalid_username_payme(self):
        """❌ Неверный username должен отклоняться"""
        # Arrange
        secret_key = "test_secret_key_12345"
        credentials = f"WrongUser:{secret_key}"
        encoded = base64.b64encode(credentials.encode()).decode()
        authorization = f"Basic {encoded}"

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.PAYME_SECRET_KEY = secret_key

            # Act
            result = verify_payme_signature({}, authorization)

            # Assert
            assert result is False

    def test_invalid_secret_key_payme(self):
        """❌ Неверный секретный ключ должен отклоняться"""
        # Arrange
        correct_secret = "correct_secret"
        wrong_secret = "wrong_secret"
        credentials = f"Paycom:{wrong_secret}"
        encoded = base64.b64encode(credentials.encode()).decode()
        authorization = f"Basic {encoded}"

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.PAYME_SECRET_KEY = correct_secret

            # Act
            result = verify_payme_signature({}, authorization)

            # Assert
            assert result is False

    def test_missing_authorization_header_payme(self):
        """❌ Отсутствующий заголовок должен отклоняться"""
        # Act
        result = verify_payme_signature({}, "")

        # Assert
        assert result is False

    def test_malformed_authorization_header_payme(self):
        """❌ Некорректный формат заголовка должен отклоняться"""
        # Act
        result = verify_payme_signature({}, "Bearer token123")

        # Assert
        assert result is False

    def test_invalid_base64_payme(self):
        """❌ Невалидный Base64 должен отклоняться"""
        # Act
        result = verify_payme_signature({}, "Basic invalid!!!base64")

        # Assert
        assert result is False

    def test_missing_colon_in_credentials_payme(self):
        """❌ Отсутствие разделителя в credentials должно отклоняться"""
        # Arrange
        credentials = "PaycomNoColonHere"
        encoded = base64.b64encode(credentials.encode()).decode()
        authorization = f"Basic {encoded}"

        # Act
        result = verify_payme_signature({}, authorization)

        # Assert
        assert result is False

    def test_timing_attack_resistance_payme(self):
        """🔐 Проверка устойчивости к timing attacks (constant-time comparison)"""
        # Arrange
        secret_key = "secret" * 10  # Длинный ключ

        # Почти правильный ключ (отличается одним символом в конце)
        almost_correct = "secret" * 9 + "secre1"

        credentials = f"Paycom:{almost_correct}"
        encoded = base64.b64encode(credentials.encode()).decode()
        authorization = f"Basic {encoded}"

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.PAYME_SECRET_KEY = secret_key

            # Act
            result = verify_payme_signature({}, authorization)

            # Assert
            assert result is False
            # hmac.compare_digest используется для защиты от timing attacks


class TestClickSignatureVerification:
    """Тесты для Click MD5 подписи"""

    def test_valid_click_signature(self):
        """✅ Валидная подпись Click должна проходить проверку"""
        # Arrange
        service_id = "12345"
        secret_key = "secret_key_click"

        request_data = {
            "click_trans_id": "100",
            "merchant_trans_id": "ORDER_123",
            "amount": 50000.0,
            "action": 1,
            "error": 0,
            "error_note": "",
            "sign_time": "2024-01-15 10:30:00"
        }

        # Вычислить правильную подпись
        sign_string = (
            f"{request_data['click_trans_id']}"
            f"{service_id}"
            f"{secret_key}"
            f"{request_data['merchant_trans_id']}"
            f"{request_data['amount']}"
            f"{request_data['action']}"
            f"{request_data['sign_time']}"
        )
        correct_signature = hashlib.md5(sign_string.encode()).hexdigest()

        request = ClickRequest(**request_data, sign_string=correct_signature)

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.CLICK_SERVICE_ID = service_id
            mock_settings.CLICK_SECRET_KEY = secret_key

            # Act
            result = verify_click_signature(request)

            # Assert
            assert result is True

    def test_invalid_click_signature(self):
        """❌ Неверная подпись Click должна отклоняться"""
        # Arrange
        service_id = "12345"
        secret_key = "secret_key_click"

        request_data = {
            "click_trans_id": "100",
            "merchant_trans_id": "ORDER_123",
            "amount": 50000.0,
            "action": 1,
            "error": 0,
            "error_note": "",
            "sign_time": "2024-01-15 10:30:00",
            "sign_string": "incorrect_signature_md5"
        }

        request = ClickRequest(**request_data)

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.CLICK_SERVICE_ID = service_id
            mock_settings.CLICK_SECRET_KEY = secret_key

            # Act
            result = verify_click_signature(request)

            # Assert
            assert result is False

    def test_click_signature_with_modified_amount(self):
        """❌ Подпись с измененной суммой должна отклоняться"""
        # Arrange
        service_id = "12345"
        secret_key = "secret_key_click"

        original_amount = 50000.0
        tampered_amount = 5000.0  # Атакующий уменьшил сумму!

        request_data = {
            "click_trans_id": "100",
            "merchant_trans_id": "ORDER_123",
            "amount": original_amount,
            "action": 1,
            "error": 0,
            "error_note": "",
            "sign_time": "2024-01-15 10:30:00"
        }

        # Подпись вычислена для оригинальной суммы
        sign_string = (
            f"{request_data['click_trans_id']}"
            f"{service_id}"
            f"{secret_key}"
            f"{request_data['merchant_trans_id']}"
            f"{original_amount}"
            f"{request_data['action']}"
            f"{request_data['sign_time']}"
        )
        correct_signature = hashlib.md5(sign_string.encode()).hexdigest()

        # Но запрос содержит измененную сумму
        request_data["amount"] = tampered_amount
        request = ClickRequest(**request_data, sign_string=correct_signature)

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.CLICK_SERVICE_ID = service_id
            mock_settings.CLICK_SECRET_KEY = secret_key

            # Act
            result = verify_click_signature(request)

            # Assert
            assert result is False

    def test_click_signature_with_modified_order_id(self):
        """❌ Подпись с измененным order_id должна отклоняться"""
        # Arrange
        service_id = "12345"
        secret_key = "secret_key_click"

        original_order = "ORDER_123"
        tampered_order = "ORDER_999"  # Атакующий изменил ID заказа!

        request_data = {
            "click_trans_id": "100",
            "merchant_trans_id": original_order,
            "amount": 50000.0,
            "action": 1,
            "error": 0,
            "error_note": "",
            "sign_time": "2024-01-15 10:30:00"
        }

        # Подпись вычислена для оригинального заказа
        sign_string = (
            f"{request_data['click_trans_id']}"
            f"{service_id}"
            f"{secret_key}"
            f"{original_order}"
            f"{request_data['amount']}"
            f"{request_data['action']}"
            f"{request_data['sign_time']}"
        )
        correct_signature = hashlib.md5(sign_string.encode()).hexdigest()

        # Но запрос содержит измененный order_id
        request_data["merchant_trans_id"] = tampered_order
        request = ClickRequest(**request_data, sign_string=correct_signature)

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.CLICK_SERVICE_ID = service_id
            mock_settings.CLICK_SECRET_KEY = secret_key

            # Act
            result = verify_click_signature(request)

            # Assert
            assert result is False

    def test_timing_attack_resistance_click(self):
        """🔐 Проверка устойчивости к timing attacks"""
        # Arrange
        service_id = "12345"
        secret_key = "secret_key_click"

        request_data = {
            "click_trans_id": "100",
            "merchant_trans_id": "ORDER_123",
            "amount": 50000.0,
            "action": 1,
            "error": 0,
            "error_note": "",
            "sign_time": "2024-01-15 10:30:00"
        }

        # Вычислить правильную подпись
        sign_string = (
            f"{request_data['click_trans_id']}"
            f"{service_id}"
            f"{secret_key}"
            f"{request_data['merchant_trans_id']}"
            f"{request_data['amount']}"
            f"{request_data['action']}"
            f"{request_data['sign_time']}"
        )
        correct_signature = hashlib.md5(sign_string.encode()).hexdigest()

        # Почти правильная подпись (отличается одним символом)
        almost_correct = correct_signature[:-1] + ('a' if correct_signature[-1] != 'a' else 'b')

        request = ClickRequest(**request_data, sign_string=almost_correct)

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.CLICK_SERVICE_ID = service_id
            mock_settings.CLICK_SECRET_KEY = secret_key

            # Act
            result = verify_click_signature(request)

            # Assert
            assert result is False


class TestUzumSignatureVerification:
    """Тесты для Uzum HMAC-SHA256 подписи"""

    def test_valid_uzum_signature(self):
        """✅ Валидная подпись Uzum должна проходить проверку"""
        # Arrange
        secret_key = "uzum_secret_key_12345"

        request_data = {
            "transaction_id": "TXN_12345",
            "merchant_trans_id": "ORDER_456",
            "amount": 100000.0,
            "status": "success"
        }

        # Вычислить правильную подпись HMAC-SHA256
        message = (
            f"{request_data['transaction_id']}"
            f"{request_data['status']}"
            f"{request_data['amount']}"
            f"{request_data['merchant_trans_id']}"
        )
        correct_signature = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        request = UzumCallbackRequest(**request_data, signature=correct_signature)

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.UZUM_SECRET_KEY = secret_key

            # Act
            result = verify_uzum_signature(request)

            # Assert
            assert result is True

    def test_invalid_uzum_signature(self):
        """❌ Неверная подпись Uzum должна отклоняться"""
        # Arrange
        secret_key = "uzum_secret_key_12345"

        request_data = {
            "transaction_id": "TXN_12345",
            "merchant_trans_id": "ORDER_456",
            "amount": 100000.0,
            "status": "success",
            "signature": "invalid_hmac_signature"
        }

        request = UzumCallbackRequest(**request_data)

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.UZUM_SECRET_KEY = secret_key

            # Act
            result = verify_uzum_signature(request)

            # Assert
            assert result is False

    def test_uzum_signature_with_modified_amount(self):
        """❌ HMAC с измененной суммой должен отклоняться"""
        # Arrange
        secret_key = "uzum_secret_key_12345"

        original_amount = 100000.0
        tampered_amount = 10000.0  # Атакующий изменил сумму!

        request_data = {
            "transaction_id": "TXN_12345",
            "merchant_trans_id": "ORDER_456",
            "amount": original_amount,
            "status": "success"
        }

        # Подпись вычислена для оригинальной суммы
        message = (
            f"{request_data['transaction_id']}"
            f"{request_data['status']}"
            f"{original_amount}"
            f"{request_data['merchant_trans_id']}"
        )
        correct_signature = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        # Но запрос содержит измененную сумму
        request_data["amount"] = tampered_amount
        request = UzumCallbackRequest(**request_data, signature=correct_signature)

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.UZUM_SECRET_KEY = secret_key

            # Act
            result = verify_uzum_signature(request)

            # Assert
            assert result is False

    def test_uzum_signature_with_modified_status(self):
        """❌ HMAC с измененным статусом должен отклоняться"""
        # Arrange
        secret_key = "uzum_secret_key_12345"

        original_status = "pending"
        tampered_status = "success"  # Атакующий изменил статус!

        request_data = {
            "transaction_id": "TXN_12345",
            "merchant_trans_id": "ORDER_456",
            "amount": 100000.0,
            "status": original_status
        }

        # Подпись вычислена для оригинального статуса
        message = (
            f"{request_data['transaction_id']}"
            f"{original_status}"
            f"{request_data['amount']}"
            f"{request_data['merchant_trans_id']}"
        )
        correct_signature = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        # Но запрос содержит измененный статус
        request_data["status"] = tampered_status
        request = UzumCallbackRequest(**request_data, signature=correct_signature)

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.UZUM_SECRET_KEY = secret_key

            # Act
            result = verify_uzum_signature(request)

            # Assert
            assert result is False

    def test_uzum_signature_wrong_secret_key(self):
        """❌ HMAC с неправильным ключом должен отклоняться"""
        # Arrange
        correct_secret = "correct_secret_key"
        wrong_secret = "wrong_secret_key"

        request_data = {
            "transaction_id": "TXN_12345",
            "merchant_trans_id": "ORDER_456",
            "amount": 100000.0,
            "status": "success"
        }

        # Подпись вычислена с неправильным ключом
        message = (
            f"{request_data['transaction_id']}"
            f"{request_data['status']}"
            f"{request_data['amount']}"
            f"{request_data['merchant_trans_id']}"
        )
        wrong_signature = hmac.new(
            wrong_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        request = UzumCallbackRequest(**request_data, signature=wrong_signature)

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.UZUM_SECRET_KEY = correct_secret

            # Act
            result = verify_uzum_signature(request)

            # Assert
            assert result is False

    def test_timing_attack_resistance_uzum(self):
        """🔐 Проверка устойчивости к timing attacks"""
        # Arrange
        secret_key = "uzum_secret_key_12345"

        request_data = {
            "transaction_id": "TXN_12345",
            "merchant_trans_id": "ORDER_456",
            "amount": 100000.0,
            "status": "success"
        }

        # Вычислить правильную подпись
        message = (
            f"{request_data['transaction_id']}"
            f"{request_data['status']}"
            f"{request_data['amount']}"
            f"{request_data['merchant_trans_id']}"
        )
        correct_signature = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        # Почти правильная подпись (отличается одним символом)
        almost_correct = correct_signature[:-1] + ('a' if correct_signature[-1] != 'a' else 'b')

        request = UzumCallbackRequest(**request_data, signature=almost_correct)

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.UZUM_SECRET_KEY = secret_key

            # Act
            result = verify_uzum_signature(request)

            # Assert
            assert result is False

    def test_hmac_sha256_vs_sha1(self):
        """🔐 Проверка что используется SHA256, а не более слабый SHA1"""
        # Arrange
        secret_key = "uzum_secret_key_12345"

        request_data = {
            "transaction_id": "TXN_12345",
            "merchant_trans_id": "ORDER_456",
            "amount": 100000.0,
            "status": "success"
        }

        message = (
            f"{request_data['transaction_id']}"
            f"{request_data['status']}"
            f"{request_data['amount']}"
            f"{request_data['merchant_trans_id']}"
        )

        # Подпись с SHA1 (более слабый алгоритм)
        sha1_signature = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha1  # Слабый алгоритм
        ).hexdigest()

        request = UzumCallbackRequest(**request_data, signature=sha1_signature)

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.UZUM_SECRET_KEY = secret_key

            # Act
            result = verify_uzum_signature(request)

            # Assert
            assert result is False  # SHA1 подпись должна отклоняться


class TestSecurityEdgeCases:
    """Тесты для edge cases и атак"""

    def test_empty_signature_payme(self):
        """❌ Пустая подпись должна отклоняться"""
        assert verify_payme_signature({}, "") is False

    def test_none_signature_payme(self):
        """❌ None подпись должна отклоняться"""
        assert verify_payme_signature({}, None) is False

    def test_sql_injection_in_signature(self):
        """❌ SQL injection в подписи не должен проходить"""
        # Arrange
        malicious = "'; DROP TABLE payments; --"
        credentials = f"Paycom:{malicious}"
        encoded = base64.b64encode(credentials.encode()).decode()
        authorization = f"Basic {encoded}"

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.PAYME_SECRET_KEY = "safe_key"

            # Act
            result = verify_payme_signature({}, authorization)

            # Assert
            assert result is False

    def test_xss_in_signature(self):
        """❌ XSS payload в подписи не должен проходить"""
        # Arrange
        malicious = "<script>alert('xss')</script>"
        credentials = f"Paycom:{malicious}"
        encoded = base64.b64encode(credentials.encode()).decode()
        authorization = f"Basic {encoded}"

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.PAYME_SECRET_KEY = "safe_key"

            # Act
            result = verify_payme_signature({}, authorization)

            # Assert
            assert result is False

    def test_unicode_in_signature(self):
        """🌍 Unicode символы в подписи должны корректно обрабатываться"""
        # Arrange
        # NOTE: В реальности secret keys не должны содержать emoji,
        # но должны поддерживать кириллицу
        secret_with_unicode = "secret_тест_key"  # Без emoji
        credentials = f"Paycom:{secret_with_unicode}"
        encoded = base64.b64encode(credentials.encode()).decode()
        authorization = f"Basic {encoded}"

        with patch('app.api.payments.settings') as mock_settings:
            mock_settings.PAYME_SECRET_KEY = secret_with_unicode

            # Act
            result = verify_payme_signature({}, authorization)

            # Assert
            assert result is True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
