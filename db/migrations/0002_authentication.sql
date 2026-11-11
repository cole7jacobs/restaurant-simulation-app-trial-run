-- Preserve the core tables and enforce the canonical email identity.
CREATE UNIQUE INDEX User_Email_CaseInsensitive ON User (Email COLLATE NOCASE);

CREATE TABLE AuthSession (
  TokenHash TEXT PRIMARY KEY,
  UserID INTEGER NOT NULL REFERENCES User(UserID) ON DELETE CASCADE,
  ExpiresAt INTEGER NOT NULL
) STRICT;
CREATE INDEX AuthSession_UserID ON AuthSession (UserID);
CREATE INDEX AuthSession_ExpiresAt ON AuthSession (ExpiresAt);

CREATE TABLE LoginRateLimit (
  ClientHash TEXT PRIMARY KEY,
  ExpiresAt INTEGER NOT NULL,
  Attempts INTEGER NOT NULL
) STRICT;
CREATE INDEX LoginRateLimit_ExpiresAt ON LoginRateLimit (ExpiresAt);
