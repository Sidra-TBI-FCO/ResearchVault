-- Link users to their scientist/staff profile.
-- scientist_id is null for users who haven't completed registration yet.

ALTER TABLE users ADD COLUMN IF NOT EXISTS scientist_id INTEGER REFERENCES scientists(id);

-- Back-fill: link existing users to scientists by matching email
UPDATE users u
  SET scientist_id = s.id
  FROM scientists s
  WHERE s.email = u.email
    AND u.scientist_id IS NULL;
