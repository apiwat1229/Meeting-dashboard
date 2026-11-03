CREATE TYPE activity_category AS ENUM ('CSR', 'GA', 'SUPPORT', 'GENERAL');

ALTER TABLE activities
  ADD COLUMN category activity_category NOT NULL DEFAULT 'GENERAL';
