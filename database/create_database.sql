-- Run ONCE as the MySQL administrator (root) to create the AstroKids database and a dedicated user.
--   mysql -u root -p < database/create_database.sql
-- IMPORTANT: change the password below BEFORE running, and use the same one in backend/.env (DATABASE_URL).

CREATE DATABASE IF NOT EXISTS astrokids CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'astrokids'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON astrokids.* TO 'astrokids'@'localhost';
FLUSH PRIVILEGES;
