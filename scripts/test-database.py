"""Replay migrations and authorization/regression tests on a disposable local DB.

NSL_TEST_DATABASE_URL must point to a fresh database named nsl_test on localhost.
Never runs against a deployed database. CI supplies its own ephemeral PostgreSQL.
"""
import os
from pathlib import Path
import subprocess
from urllib.parse import urlparse

root = Path(__file__).resolve().parents[1]
url = os.environ.get("NSL_TEST_DATABASE_URL", "postgresql://postgres:nsl-local-test-only@127.0.0.1:55439/nsl_test")
parsed = urlparse(url)
if parsed.hostname not in ("localhost", "127.0.0.1") or parsed.path != "/nsl_test":
    raise SystemExit("Refusing to test a non-local or non-test database")

bootstrap = """
SET client_min_messages = warning;
DROP PUBLICATION IF EXISTS supabase_realtime;
DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO PUBLIC;
CREATE SCHEMA auth;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}', email_confirmed_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
  $$ SELECT current_user::text $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
  $$ SELECT jsonb_build_object('role', current_user::text) $$;
CREATE PUBLICATION supabase_realtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
"""
# schema.sql is the renamed baseline. Historical migrations 003–006 still
# target shipments, so restore those legacy names just for replay.
sql = bootstrap + (root / "supabase/schema.sql").read_text()
sql += "\nALTER TABLE loads RENAME TO shipments; ALTER TABLE load_events RENAME TO shipment_events;\n"
sql += "ALTER TABLE shipment_events RENAME COLUMN load_id TO shipment_id;\n"
for migration in sorted((root / "supabase/migrations").glob("*.sql")):
    if migration.name.endswith("_simplify_quote_delivery.sql"):
        # Exercise the historical schema before retiring its browser access.
        sql += (root / "tests/database/regressions.sql").read_text()
    sql += "\n" + migration.read_text() + "\n"
sql += (root / "tests/database/simple-site.sql").read_text()
subprocess.run(["psql", url, "-X", "-v", "ON_ERROR_STOP=1", "-q"], input=sql, text=True, check=True)
print("Database migration and regression checks passed")
