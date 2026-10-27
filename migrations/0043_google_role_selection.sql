ALTER TABLE users ADD COLUMN IF NOT EXISTS role_selection_required boolean NOT NULL DEFAULT false;
-- Recover Google registrations that received the old automatic client default.
UPDATE users u SET role_selection_required = true
FROM user_profiles p
WHERE p.user_id = u.id AND u.provider = 'google' AND p.role = 'client'
  AND p.is_profile_complete IS NOT TRUE
  AND NOT EXISTS (SELECT 1 FROM masters m WHERE m.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM salons s WHERE s.owner_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM admin_users a WHERE a.user_id = u.id);
