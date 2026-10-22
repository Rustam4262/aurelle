-- The contact form and newsletter signup validated input and returned
-- {success:true} without ever saving or sending anything. Give them real
-- storage so submissions aren't silently dropped.
--
-- Rollback: DROP TABLE IF EXISTS contact_submissions; DROP TABLE IF EXISTS newsletter_subscribers;

CREATE TABLE IF NOT EXISTS contact_submissions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  email varchar(255) NOT NULL,
  phone varchar(20),
  service varchar(200),
  message text,
  email_sent boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL UNIQUE,
  created_at timestamp DEFAULT now()
);
