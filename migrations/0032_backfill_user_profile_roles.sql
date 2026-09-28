UPDATE user_profiles AS p
SET
  role = CASE
    WHEN EXISTS (
      SELECT 1
      FROM admin_users AS a
      WHERE a.user_id = p.user_id
        AND a.is_active = true
    ) THEN 'admin'
    WHEN EXISTS (
      SELECT 1
      FROM salons AS s
      WHERE s.owner_id = p.user_id
    ) THEN 'owner'
    WHEN EXISTS (
      SELECT 1
      FROM masters AS m
      WHERE m.user_id = p.user_id
        AND COALESCE(m.is_solo_master, false) = true
    ) THEN 'solo_master'
    WHEN EXISTS (
      SELECT 1
      FROM masters AS m
      WHERE m.user_id = p.user_id
    ) THEN 'master'
    ELSE p.role
  END,
  updated_at = NOW()
WHERE p.role IS DISTINCT FROM CASE
  WHEN EXISTS (
    SELECT 1
    FROM admin_users AS a
    WHERE a.user_id = p.user_id
      AND a.is_active = true
  ) THEN 'admin'
  WHEN EXISTS (
    SELECT 1
    FROM salons AS s
    WHERE s.owner_id = p.user_id
  ) THEN 'owner'
  WHEN EXISTS (
    SELECT 1
    FROM masters AS m
    WHERE m.user_id = p.user_id
      AND COALESCE(m.is_solo_master, false) = true
  ) THEN 'solo_master'
  WHEN EXISTS (
    SELECT 1
    FROM masters AS m
    WHERE m.user_id = p.user_id
  ) THEN 'master'
  ELSE p.role
END;
