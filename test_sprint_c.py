#!/usr/bin/env python3
"""
Sprint C - Complete Test Suite
Tests C1 (role change) and C2 (password reset)
"""
import requests
import json
from typing import Optional

BASE_URL = 'http://188.225.83.33'

def print_section(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def get_admin_token() -> str:
    """Login as admin and get access token"""
    print("🔑 Logging in as admin...")
    resp = requests.post(f'{BASE_URL}/api/auth/login', json={
        'phone': '+998901234567',
        'password': 'Admin2025'
    })
    if resp.status_code != 200:
        print(f"❌ Login failed: {resp.status_code}")
        print(resp.text)
        return None

    token = resp.json()['access_token']
    print(f"✅ Admin logged in successfully")
    return token

def test_c1_role_change(token: str, user_id: int):
    """Test C1: User Role Change"""
    print_section("C1: USER ROLE CHANGE")

    headers = {'Authorization': f'Bearer {token}'}

    # 1. Get current user info
    print(f"1. Getting current role for user {user_id}...")
    users_resp = requests.get(f'{BASE_URL}/api/admin/users', headers=headers)
    user = next((u for u in users_resp.json()['items'] if u['id'] == user_id), None)

    if not user:
        print(f"❌ User {user_id} not found")
        return

    current_role = user['role']
    print(f"   Current role: {current_role}")

    # 2. Change role to salon_owner
    new_role = 'salon_owner' if current_role != 'salon_owner' else 'client'
    print(f"\n2. Changing role to '{new_role}'...")

    change_resp = requests.patch(
        f'{BASE_URL}/api/admin/users/{user_id}/role',
        headers=headers,
        json={'role': new_role}
    )

    print(f"   Status: {change_resp.status_code}")
    if change_resp.status_code == 200:
        data = change_resp.json()
        print(f"   ✅ SUCCESS: {data['message']}")
        print(f"   Old role: {data['old_role']}")
        print(f"   New role: {data['new_role']}")
    else:
        print(f"   ❌ FAILED: {change_resp.text}")

    # 3. Verify role changed
    print(f"\n3. Verifying role change...")
    verify_resp = requests.get(f'{BASE_URL}/api/admin/users', headers=headers)
    user = next((u for u in verify_resp.json()['items'] if u['id'] == user_id), None)

    if user and user['role'] == new_role:
        print(f"   ✅ Role verified: {user['role']}")
    else:
        print(f"   ❌ Role verification failed")

def test_c1_last_admin_protection(token: str):
    """Test C1: Last Admin Protection"""
    print_section("C1: LAST ADMIN PROTECTION TEST")

    headers = {'Authorization': f'Bearer {token}'}

    # 1. Get all admins
    print("1. Finding all admin users...")
    admins_resp = requests.get(
        f'{BASE_URL}/api/admin/users?role=admin',
        headers=headers
    )
    admins = admins_resp.json()['items']
    print(f"   Found {len(admins)} admin(s)")

    if len(admins) == 0:
        print("   ❌ No admins found - cannot test")
        return

    if len(admins) > 1:
        print("   ⚠️  Multiple admins exist - protection test may not trigger")
        print("   (Protection only triggers when removing last admin)")

    # 2. Try to change first admin's role
    admin_id = admins[0]['id']
    admin_name = admins[0]['name']

    print(f"\n2. Attempting to change admin {admin_id} ({admin_name}) to 'client'...")

    protect_resp = requests.patch(
        f'{BASE_URL}/api/admin/users/{admin_id}/role',
        headers=headers,
        json={'role': 'client'}
    )

    print(f"   Status: {protect_resp.status_code}")

    if protect_resp.status_code == 409:
        print(f"   ✅ PROTECTION WORKING: {protect_resp.json()['detail']}")
    elif protect_resp.status_code == 200:
        print(f"   ⚠️  Role changed (multiple admins exist, protection didn't trigger)")
        # Restore role
        requests.patch(
            f'{BASE_URL}/api/admin/users/{admin_id}/role',
            headers=headers,
            json={'role': 'admin'}
        )
        print(f"   (Role restored to admin)")
    else:
        print(f"   ❌ Unexpected response: {protect_resp.text}")

def test_c2_password_reset(token: str, user_id: int):
    """Test C2: Password Reset"""
    print_section("C2: PASSWORD RESET")

    headers = {'Authorization': f'Bearer {token}'}

    # 1. Get user info
    print(f"1. Getting user info for user {user_id}...")
    users_resp = requests.get(f'{BASE_URL}/api/admin/users', headers=headers)
    user = next((u for u in users_resp.json()['items'] if u['id'] == user_id), None)

    if not user:
        print(f"❌ User {user_id} not found")
        return

    user_phone = user['phone']
    user_name = user['name']
    print(f"   User: {user_name} ({user_phone})")

    # 2. Reset password
    print(f"\n2. Resetting password...")

    reset_resp = requests.post(
        f'{BASE_URL}/api/admin/users/{user_id}/reset-password',
        headers=headers
    )

    print(f"   Status: {reset_resp.status_code}")

    if reset_resp.status_code == 200:
        data = reset_resp.json()
        temp_password = data['temporary_password']
        print(f"   ✅ SUCCESS: {data['message']}")
        print(f"   Temporary password: {temp_password}")

        # 3. Test login with new password
        print(f"\n3. Testing login with temporary password...")

        login_resp = requests.post(f'{BASE_URL}/api/auth/login', json={
            'phone': user_phone,
            'password': temp_password
        })

        if login_resp.status_code == 200:
            print(f"   ✅ Login successful with temporary password")
        else:
            print(f"   ❌ Login failed: {login_resp.text}")
    else:
        print(f"   ❌ FAILED: {reset_resp.text}")

def main():
    print("\n" + "="*60)
    print("  SPRINT C - COMPLETE TEST SUITE")
    print("  Testing C1 (Role Change) + C2 (Password Reset)")
    print("="*60)

    # Get admin token
    token = get_admin_token()
    if not token:
        print("❌ Cannot proceed without admin token")
        return

    # Test user ID (user 15 from previous tests)
    test_user_id = 15

    try:
        # Test C1 - Role Change
        test_c1_role_change(token, test_user_id)

        # Test C1 - Last Admin Protection
        test_c1_last_admin_protection(token)

        # Test C2 - Password Reset
        test_c2_password_reset(token, test_user_id)

        print_section("SUMMARY")
        print("✅ All tests completed")
        print("\nCheck above for individual test results:")
        print("  - C1: Role Change")
        print("  - C1: Last Admin Protection")
        print("  - C2: Password Reset")

    except Exception as e:
        print(f"\n❌ Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
