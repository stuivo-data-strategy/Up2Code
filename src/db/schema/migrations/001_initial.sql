-- ============================================================
-- Up2Code — Neon Database Schema Migration
-- Migration 001: Initial schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------
-- users
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  avatar_url  TEXT,
  github_token TEXT,
  gitlab_token TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- sessions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- repositories
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repositories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  full_name       TEXT,
  description     TEXT,
  source          TEXT NOT NULL DEFAULT 'github', -- github | gitlab | local | zip
  source_url      TEXT,
  primary_language TEXT,
  frameworks      TEXT[],
  total_files     INT DEFAULT 0,
  risk_score      INT DEFAULT 0,
  risk_grade      CHAR(1) DEFAULT 'A',
  metadata        JSONB DEFAULT '{}',
  last_analysed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- files
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id   UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  path            TEXT NOT NULL,
  extension       TEXT,
  size_bytes      INT DEFAULT 0,
  lines_of_code   INT DEFAULT 0,
  language        TEXT,
  content_hash    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(repository_id, path)
);

-- ----------------------------------------------------------------
-- analysis_results
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analysis_results (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id         UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  file_id               UUID REFERENCES files(id) ON DELETE CASCADE,
  type                  TEXT NOT NULL, -- syntax | linting | complexity | security | refactor
  status                TEXT NOT NULL DEFAULT 'pending', -- pending | running | complete | failed
  results               JSONB DEFAULT '[]',
  summary               JSONB DEFAULT '{}',
  cyclomatic_complexity INT,
  cognitive_complexity  INT,
  issue_count           INT DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- execution_paths
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS execution_paths (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  file_id       UUID REFERENCES files(id) ON DELETE CASCADE,
  entry_point   TEXT NOT NULL,
  steps         JSONB DEFAULT '[]',
  branch_map    JSONB DEFAULT '{}',
  step_count    INT DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- governance_reports
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS governance_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id   UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  risk_score      INT DEFAULT 0,
  risk_grade      CHAR(1) DEFAULT 'A',
  security_issues JSONB DEFAULT '[]',
  compliance_issues JSONB DEFAULT '[]',
  licence_issues  JSONB DEFAULT '[]',
  architecture_issues JSONB DEFAULT '[]',
  summary         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- test_suggestions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_suggestions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  file_id       UUID REFERENCES files(id) ON DELETE CASCADE,
  function_name TEXT,
  test_type     TEXT NOT NULL DEFAULT 'unit', -- unit | integration | edge
  test_code     TEXT,
  description   TEXT,
  accepted      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_files_repository       ON files(repository_id);
CREATE INDEX IF NOT EXISTS idx_analysis_repository    ON analysis_results(repository_id);
CREATE INDEX IF NOT EXISTS idx_analysis_type          ON analysis_results(type);
CREATE INDEX IF NOT EXISTS idx_execution_repository   ON execution_paths(repository_id);
CREATE INDEX IF NOT EXISTS idx_governance_repository  ON governance_reports(repository_id);
CREATE INDEX IF NOT EXISTS idx_tests_repository       ON test_suggestions(repository_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token         ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_repositories_user      ON repositories(user_id);
