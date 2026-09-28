INSERT INTO owner_permissions (owner_id, permission, granted_by)
SELECT DISTINCT
  s.owner_id,
  perms.permission,
  'system'
FROM salons AS s
CROSS JOIN (
  VALUES
    ('owner.read_dashboard'),
    ('owner.read_bookings'),
    ('owner.manage_bookings'),
    ('owner.read_services'),
    ('owner.manage_services'),
    ('owner.read_masters'),
    ('owner.manage_masters'),
    ('owner.read_salons'),
    ('owner.manage_salons'),
    ('owner.read_calendar'),
    ('owner.manage_calendar'),
    ('owner.read_analytics')
) AS perms(permission)
WHERE s.owner_id IS NOT NULL
ON CONFLICT (owner_id, permission) DO NOTHING;
