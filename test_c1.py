#!/usr/bin/env python3
"""Test C1 - Role Change Endpoint"""
import requests
import json

BASE_URL = 'http://188.225.83.33'

# 1. Login as admin
print("1. Logging in as admin...")
login_resp = requests.post(f'{BASE_URL}/api/auth/login', json={
    'phone': '+998901234567',
    'password': 'Admin2025'
})
admin_token = login_resp.json()['access_token']
headers = {'Authorization': f'Bearer {admin_token}'}
print(f"✓ Logged in, token obtained")

# 2. Test C1: Change user 15 role to salon_owner
print("\n2. Testing C1: Changing user 15 role to salon_owner...")
role_change_resp = requests.patch(
    f'{BASE_URL}/api/admin/users/15/role',
    headers=headers,
    json={'role': 'salon_owner'}
)
print(f"Status: {role_change_resp.status_code}")
print(f"Response:\n{json.dumps(role_change_resp.json(), indent=2, ensure_ascii=False)}")

# 3. Verify by getting user details
print("\n3. Verifying user role via GET /api/admin/users...")
users_resp = requests.get(
    f'{BASE_URL}/api/admin/users?query=+998901111111',
    headers=headers
)
users_data = users_resp.json()
if users_data['items']:
    user = users_data['items'][0]
    print(f"User ID {user['id']}: role={user['role']}, name={user['name']}")
else:
    print("User not found in search")

# 4. Test last admin protection
print("\n4. Testing last admin protection...")
admin_user_resp = requests.get(f'{BASE_URL}/api/admin/users?role=admin', headers=headers)
admin_users = admin_user_resp.json()['items']
print(f"Total active admins: {len(admin_users)}")

if len(admin_users) == 1:
    admin_id = admin_users[0]['id']
    print(f"Attempting to change admin {admin_id} role to client (should fail)...")
    protect_resp = requests.patch(
        f'{BASE_URL}/api/admin/users/{admin_id}/role',
        headers=headers,
        json={'role': 'client'}
    )
    print(f"Status: {protect_resp.status_code}")
    print(f"Response: {json.dumps(protect_resp.json(), indent=2, ensure_ascii=False)}")
else:
    print("Skipping protection test - multiple admins present")

print("\n✅ C1 Role Change Testing Complete")
