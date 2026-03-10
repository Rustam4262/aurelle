# Login Access Notes

This file must not contain real credentials, passwords, or private connection details.

## How to access Owner Dashboard

1. Open `https://aurelle.uz/auth`.
2. Use credentials from your secure secret manager.
3. After login, open `https://aurelle.uz/owner`.

## Password reset

Use the standard password reset flow from the auth page.
Do not store static passwords in the repository.

## Security rules

- Never commit real passwords.
- Never commit SSH or DB secrets.
- Share access only via approved secret storage.

Last updated: 2026-03-09
Status: sanitized
