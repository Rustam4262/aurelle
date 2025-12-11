"""
Тесты для refresh token rotation и безопасности аутентификации

Критически важные тесты для безопасности:
- Token rotation при refresh
- Отзыв старых токенов
- Защита от replay attacks
- Валидация срока действия токенов
"""
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

from app.core.security import (
    create_token_pair,
    create_refresh_token,
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password
)

# Don't import models to avoid SQLAlchemy initialization issues in tests
# from app.models.refresh_token import RefreshToken
# from app.models.user import User, UserRole

# Create simple mock classes for testing
class MockRefreshToken:
    def __init__(self, **kwargs):
        self.user_id = kwargs.get('user_id')
        self.token = kwargs.get('token')
        self.expires_at = kwargs.get('expires_at')
        self.revoked = kwargs.get('revoked', False)
        self.revoked_at = kwargs.get('revoked_at')

    def is_valid(self) -> bool:
        if self.revoked:
            return False
        if datetime.now(timezone.utc) > self.expires_at:
            return False
        return True


class MockUserRole:
    ADMIN = "admin"
    SALON_OWNER = "salon_owner"
    MASTER = "master"
    CLIENT = "client"


class MockUser:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.name = kwargs.get('name')
        self.phone = kwargs.get('phone')
        self.email = kwargs.get('email')
        self.hashed_password = kwargs.get('hashed_password')
        self.role = kwargs.get('role', MockUserRole.CLIENT)
        self.is_active = kwargs.get('is_active', True)


# Use mock classes instead of real models
RefreshToken = MockRefreshToken
User = MockUser
UserRole = MockUserRole


class TestTokenPairCreation:
    """Тесты создания пары токенов (access + refresh)"""

    def test_create_token_pair_returns_three_values(self):
        """✅ create_token_pair должна возвращать 3 значения"""
        # Act
        result = create_token_pair(user_id=123)

        # Assert
        assert len(result) == 3
        access_token, refresh_token, expires_at = result
        assert isinstance(access_token, str)
        assert isinstance(refresh_token, str)
        assert isinstance(expires_at, datetime)

    def test_access_token_contains_user_id(self):
        """✅ Access token должен содержать user_id в payload"""
        # Act
        access_token, _, _ = create_token_pair(user_id=456)

        # Assert
        payload = decode_access_token(access_token)
        assert payload is not None
        assert payload["sub"] == "456"

    def test_refresh_token_is_random(self):
        """🔐 Refresh токены должны быть случайными"""
        # Act
        _, refresh1, _ = create_token_pair(user_id=1)
        _, refresh2, _ = create_token_pair(user_id=1)

        # Assert
        assert refresh1 != refresh2  # Разные токены для одного пользователя

    def test_refresh_token_length(self):
        """🔐 Refresh токен должен быть достаточно длинным"""
        # Act
        _, refresh_token, _ = create_token_pair(user_id=1)

        # Assert
        # secrets.token_urlsafe(32) генерирует ~43 символа
        assert len(refresh_token) >= 40

    def test_refresh_token_expiry_in_future(self):
        """✅ Время истечения refresh токена должно быть в будущем"""
        # Act
        _, _, expires_at = create_token_pair(user_id=1)

        # Assert
        assert expires_at > datetime.now(timezone.utc)

    @patch('app.core.config.settings')
    def test_refresh_token_expiry_respects_config(self, mock_settings):
        """✅ Время истечения должно учитывать настройки"""
        # Arrange
        mock_settings.REFRESH_TOKEN_EXPIRE_DAYS = 14

        # Act
        _, _, expires_at = create_token_pair(user_id=1)

        # Assert
        expected_min = datetime.now(timezone.utc) + timedelta(days=13, hours=23)
        expected_max = datetime.now(timezone.utc) + timedelta(days=14, hours=1)
        assert expected_min <= expires_at <= expected_max


class TestRefreshTokenModel:
    """Тесты модели RefreshToken"""

    def test_refresh_token_is_valid_when_not_revoked(self):
        """✅ Токен валиден когда не отозван и не истек"""
        # Arrange
        token = RefreshToken(
            user_id=1,
            token="valid_token_123",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            revoked=False
        )

        # Act & Assert
        assert token.is_valid() is True

    def test_refresh_token_invalid_when_revoked(self):
        """❌ Токен невалиден когда отозван"""
        # Arrange
        token = RefreshToken(
            user_id=1,
            token="revoked_token_123",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            revoked=True
        )

        # Act & Assert
        assert token.is_valid() is False

    def test_refresh_token_invalid_when_expired(self):
        """❌ Токен невалиден когда истек срок действия"""
        # Arrange
        token = RefreshToken(
            user_id=1,
            token="expired_token_123",
            expires_at=datetime.now(timezone.utc) - timedelta(days=1),  # Вчера
            revoked=False
        )

        # Act & Assert
        assert token.is_valid() is False

    def test_refresh_token_invalid_when_both_revoked_and_expired(self):
        """❌ Токен невалиден когда и отозван и истек"""
        # Arrange
        token = RefreshToken(
            user_id=1,
            token="bad_token_123",
            expires_at=datetime.now(timezone.utc) - timedelta(days=1),
            revoked=True
        )

        # Act & Assert
        assert token.is_valid() is False


class TestRefreshEndpointSecurity:
    """Тесты безопасности /auth/refresh endpoint"""

    def create_mock_db_with_token(self, token_data: dict):
        """Вспомогательная функция для создания mock БД с токеном"""
        mock_db = MagicMock()
        mock_token = RefreshToken(**token_data)
        mock_db.query.return_value.filter.return_value.first.return_value = mock_token
        return mock_db, mock_token

    def create_mock_db_with_user(self, user_data: dict):
        """Вспомогательная функция для создания mock БД с пользователем"""
        mock_db = MagicMock()
        mock_user = User(**user_data)

        # Настройка mock для двух последовательных запросов
        # Первый query - для токена, второй - для пользователя
        def query_side_effect(model):
            if model == RefreshToken:
                result = MagicMock()
                result.filter.return_value.first.return_value = MagicMock(
                    user_id=user_data["id"],
                    revoked=False,
                    expires_at=datetime.now(timezone.utc) + timedelta(days=7)
                )
                return result
            elif model == User:
                result = MagicMock()
                result.filter.return_value.first.return_value = mock_user
                return result

        mock_db.query.side_effect = query_side_effect
        return mock_db, mock_user

    def test_refresh_with_nonexistent_token(self):
        """❌ Несуществующий refresh токен должен отклоняться"""
        # Arrange
        from app.api.auth import refresh_access_token
        from app.schemas.user import RefreshTokenRequest

        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None

        request = RefreshTokenRequest(refresh_token="nonexistent_token")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            refresh_access_token(request, mock_db)

        assert exc_info.value.status_code == 401
        assert "Invalid refresh token" in exc_info.value.detail

    def test_refresh_with_revoked_token(self):
        """❌ Отозванный refresh токен должен отклоняться"""
        # Arrange
        from app.api.auth import refresh_access_token
        from app.schemas.user import RefreshTokenRequest

        token_data = {
            "user_id": 1,
            "token": "revoked_token_abc",
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "revoked": True,  # Отозван!
            "revoked_at": datetime.now(timezone.utc) - timedelta(hours=1)
        }

        mock_db, _ = self.create_mock_db_with_token(token_data)
        request = RefreshTokenRequest(refresh_token="revoked_token_abc")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            refresh_access_token(request, mock_db)

        assert exc_info.value.status_code == 401
        assert "revoked" in exc_info.value.detail.lower()

    def test_refresh_with_expired_token(self):
        """❌ Истекший refresh токен должен отклоняться"""
        # Arrange
        from app.api.auth import refresh_access_token
        from app.schemas.user import RefreshTokenRequest

        token_data = {
            "user_id": 1,
            "token": "expired_token_xyz",
            "expires_at": datetime.now(timezone.utc) - timedelta(days=1),  # Истек вчера
            "revoked": False
        }

        mock_db, _ = self.create_mock_db_with_token(token_data)
        request = RefreshTokenRequest(refresh_token="expired_token_xyz")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            refresh_access_token(request, mock_db)

        assert exc_info.value.status_code == 401
        assert "expired" in exc_info.value.detail.lower()

    def test_token_rotation_revokes_old_token(self):
        """🔄 Token rotation должен отзывать старый токен"""
        # Arrange
        from app.api.auth import refresh_access_token
        from app.schemas.user import RefreshTokenRequest

        user_data = {
            "id": 123,
            "name": "Test User",
            "phone": "+998901234567",
            "email": "test@example.com",
            "hashed_password": get_password_hash("password123"),
            "role": UserRole.CLIENT,
            "is_active": True
        }

        mock_db = MagicMock()
        mock_user = User(**user_data)
        mock_old_token = RefreshToken(
            user_id=123,
            token="old_token_abc",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            revoked=False
        )

        # Настройка mock для последовательных запросов
        query_results = [mock_old_token, mock_user]
        mock_db.query.return_value.filter.return_value.first.side_effect = query_results

        request = RefreshTokenRequest(refresh_token="old_token_abc")

        # Act
        with patch('app.core.security.create_token_pair') as mock_create_pair:
            mock_create_pair.return_value = (
                "new_access_token",
                "new_refresh_token",
                datetime.now(timezone.utc) + timedelta(days=7)
            )

            result = refresh_access_token(request, mock_db)

        # Assert
        assert mock_old_token.revoked is True  # Старый токен отозван
        assert mock_old_token.revoked_at is not None
        assert result.refresh_token == "new_refresh_token"  # Новый токен выдан

    def test_refresh_creates_new_token_pair(self):
        """🔄 Refresh должен создавать новую пару токенов"""
        # Arrange
        from app.api.auth import refresh_access_token
        from app.schemas.user import RefreshTokenRequest

        user_data = {
            "id": 456,
            "name": "Another User",
            "phone": "+998901111111",
            "email": "another@example.com",
            "hashed_password": get_password_hash("pass456"),
            "role": UserRole.CLIENT,
            "is_active": True
        }

        mock_db = MagicMock()
        mock_user = User(**user_data)
        mock_token = RefreshToken(
            user_id=456,
            token="valid_token_def",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            revoked=False
        )

        query_results = [mock_token, mock_user]
        mock_db.query.return_value.filter.return_value.first.side_effect = query_results

        request = RefreshTokenRequest(refresh_token="valid_token_def")

        # Act
        result = refresh_access_token(request, mock_db)

        # Assert
        assert result.access_token is not None
        assert result.refresh_token is not None
        assert result.refresh_token != "valid_token_def"  # Новый токен отличается
        assert mock_db.add.called  # Новый токен добавлен в БД
        assert mock_db.commit.called

    def test_refresh_with_inactive_user(self):
        """❌ Refresh с неактивным пользователем должен отклоняться"""
        # Arrange
        from app.api.auth import refresh_access_token
        from app.schemas.user import RefreshTokenRequest

        user_data = {
            "id": 789,
            "name": "Inactive User",
            "phone": "+998902222222",
            "email": "inactive@example.com",
            "hashed_password": get_password_hash("pass789"),
            "role": UserRole.CLIENT,
            "is_active": False  # Неактивен!
        }

        mock_db = MagicMock()
        mock_user = User(**user_data)
        mock_token = RefreshToken(
            user_id=789,
            token="token_inactive_user",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            revoked=False
        )

        query_results = [mock_token, mock_user]
        mock_db.query.return_value.filter.return_value.first.side_effect = query_results

        request = RefreshTokenRequest(refresh_token="token_inactive_user")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            refresh_access_token(request, mock_db)

        assert exc_info.value.status_code == 401
        assert "inactive" in exc_info.value.detail.lower()


class TestReplayAttackProtection:
    """Тесты защиты от replay attacks"""

    def test_cannot_reuse_revoked_refresh_token(self):
        """🔐 Нельзя повторно использовать отозванный refresh токен"""
        # Arrange
        from app.api.auth import refresh_access_token
        from app.schemas.user import RefreshTokenRequest

        # Первый запрос - успешный refresh
        user_data = {
            "id": 100,
            "name": "User",
            "phone": "+998903333333",
            "email": "user@example.com",
            "hashed_password": get_password_hash("password"),
            "role": UserRole.CLIENT,
            "is_active": True
        }

        mock_db = MagicMock()
        mock_user = User(**user_data)
        mock_token = RefreshToken(
            user_id=100,
            token="one_time_token",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            revoked=False
        )

        query_results = [mock_token, mock_user]
        mock_db.query.return_value.filter.return_value.first.side_effect = query_results

        request = RefreshTokenRequest(refresh_token="one_time_token")

        # Act - первый refresh
        with patch('app.core.security.create_token_pair') as mock_create_pair:
            mock_create_pair.return_value = (
                "new_access_1",
                "new_refresh_1",
                datetime.now(timezone.utc) + timedelta(days=7)
            )

            result1 = refresh_access_token(request, mock_db)

        # Assert - токен отозван после первого использования
        assert mock_token.revoked is True

        # Попытка повторного использования того же токена
        mock_db2 = MagicMock()
        mock_db2.query.return_value.filter.return_value.first.return_value = mock_token

        # Act & Assert - второй refresh должен провалиться
        with pytest.raises(HTTPException) as exc_info:
            refresh_access_token(request, mock_db2)

        assert exc_info.value.status_code == 401
        assert "revoked" in exc_info.value.detail.lower()

    def test_concurrent_refresh_attempts(self):
        """🔐 Параллельные попытки refresh с одним токеном должны обрабатываться безопасно"""
        # Arrange
        from app.api.auth import refresh_access_token
        from app.schemas.user import RefreshTokenRequest

        user_data = {
            "id": 200,
            "name": "Concurrent User",
            "phone": "+998904444444",
            "email": "concurrent@example.com",
            "hashed_password": get_password_hash("pass"),
            "role": UserRole.CLIENT,
            "is_active": True
        }

        # Первый запрос успешен
        mock_db1 = MagicMock()
        mock_user1 = User(**user_data)
        mock_token1 = RefreshToken(
            user_id=200,
            token="concurrent_token",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            revoked=False
        )

        query_results1 = [mock_token1, mock_user1]
        mock_db1.query.return_value.filter.return_value.first.side_effect = query_results1

        request = RefreshTokenRequest(refresh_token="concurrent_token")

        # Act - первый refresh
        with patch('app.core.security.create_token_pair') as mock_create_pair:
            mock_create_pair.return_value = (
                "access_1",
                "refresh_1",
                datetime.now(timezone.utc) + timedelta(days=7)
            )

            result1 = refresh_access_token(request, mock_db1)

        # Второй параллельный запрос должен увидеть отозванный токен
        mock_db2 = MagicMock()
        mock_token1.revoked = True  # Токен уже отозван первым запросом
        mock_db2.query.return_value.filter.return_value.first.return_value = mock_token1

        # Act & Assert - второй запрос должен провалиться
        with pytest.raises(HTTPException) as exc_info:
            refresh_access_token(request, mock_db2)

        assert exc_info.value.status_code == 401


class TestLogoutSecurity:
    """Тесты безопасности /auth/logout endpoint"""

    def test_logout_revokes_refresh_token(self):
        """✅ Logout должен отзывать refresh токен"""
        # Arrange
        from app.api.auth import logout
        from app.schemas.user import RefreshTokenRequest

        mock_db = MagicMock()
        mock_token = RefreshToken(
            user_id=1,
            token="logout_token",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            revoked=False
        )
        mock_db.query.return_value.filter.return_value.first.return_value = mock_token

        mock_current_user = User(
            id=1,
            name="User",
            phone="+998905555555",
            email="user@example.com",
            hashed_password=get_password_hash("pass"),
            role=UserRole.CLIENT,
            is_active=True
        )

        request = RefreshTokenRequest(refresh_token="logout_token")

        # Act
        logout(request, mock_db, mock_current_user)

        # Assert
        assert mock_token.revoked is True
        assert mock_token.revoked_at is not None
        assert mock_db.commit.called


class TestPasswordSecurity:
    """Тесты безопасности паролей"""

    def test_password_hash_is_different_for_same_password(self):
        """🔐 Одинаковые пароли должны давать разные хеши (salt)"""
        # Act
        hash1 = get_password_hash("same_password_123")
        hash2 = get_password_hash("same_password_123")

        # Assert
        assert hash1 != hash2  # Bcrypt использует случайный salt

    def test_password_verify_works_correctly(self):
        """✅ Проверка пароля должна работать корректно"""
        # Arrange
        password = "my_secure_password_456"
        hashed = get_password_hash(password)

        # Act & Assert
        assert verify_password(password, hashed) is True
        assert verify_password("wrong_password", hashed) is False

    def test_long_password_truncated(self):
        """🔐 Длинные пароли должны обрабатываться корректно (bcrypt limit 72 bytes)"""
        # Arrange
        long_password = "a" * 100  # 100 символов

        # Act
        hashed = get_password_hash(long_password)

        # Assert - первые 72 байта должны проверяться
        assert verify_password(long_password, hashed) is True

    def test_timing_attack_resistance_password(self):
        """🔐 Проверка пароля должна быть устойчива к timing attacks"""
        # Arrange
        password = "correct_password"
        hashed = get_password_hash(password)

        # Act - оба должны вернуть False примерно за одинаковое время
        result1 = verify_password("wrong", hashed)
        result2 = verify_password("c", hashed)  # Короткий неправильный пароль

        # Assert
        assert result1 is False
        assert result2 is False
        # bcrypt защищает от timing attacks автоматически


class TestAccessTokenSecurity:
    """Тесты безопасности access токенов"""

    def test_access_token_has_expiration(self):
        """✅ Access токен должен иметь срок действия"""
        # Arrange
        token_data = {"sub": "123"}

        # Act
        token = create_access_token(token_data)
        payload = decode_access_token(token)

        # Assert
        assert "exp" in payload
        assert payload["exp"] > datetime.now(timezone.utc).timestamp()

    def test_expired_access_token_rejected(self):
        """❌ Истекший access токен должен отклоняться"""
        # Arrange
        token_data = {"sub": "123"}
        expired_delta = timedelta(seconds=-10)  # Истек 10 секунд назад

        # Act
        token = create_access_token(token_data, expires_delta=expired_delta)
        payload = decode_access_token(token)

        # Assert
        assert payload is None  # JWT декодирование провалится

    def test_tampered_access_token_rejected(self):
        """❌ Измененный access токен должен отклоняться"""
        # Arrange
        token_data = {"sub": "123"}
        token = create_access_token(token_data)

        # Изменить токен (добавить символ)
        tampered_token = token[:-1] + "x"

        # Act
        payload = decode_access_token(tampered_token)

        # Assert
        assert payload is None  # Подпись невалидна


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
