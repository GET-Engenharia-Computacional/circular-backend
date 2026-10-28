-- Execute as a MySQL administrator in Workbench. Replace the password placeholder
-- with the same password configured in your private .env before executing.
CREATE DATABASE IF NOT EXISTS localizaufjf CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'localizaufjf'@'localhost' IDENTIFIED BY 'SUBSTITUA_PELA_SENHA_DO_ENV';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON localizaufjf.* TO 'localizaufjf'@'localhost';
-- If the account already exists with a different password, CREATE USER IF NOT EXISTS
-- preserves that password. Use Workbench's Users and Privileges to update it.
