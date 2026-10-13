BEGIN;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

-- Remove permissive legacy policies. API handlers use service_role; browsers
-- receive SELECT only through organization membership or employee permissions.
DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['quotes','loads','load_events','contacts','profiles',
    'organizations','organization_members','invitations','quote_tokens',
    'portpro_webhook_logs','sync_status'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    FOR p IN SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.can_access_organization(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = p_org);
$$;
CREATE OR REPLACE FUNCTION public.can_access_module(p_module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    OR EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid()
      AND is_active AND p_module = ANY(permissions));
$$;
REVOKE ALL ON FUNCTION public.can_access_organization(uuid), public.can_access_module(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_organization(uuid), public.can_access_module(text) TO authenticated, service_role;

-- Keep prices, margins and internal notes server-only, including on Realtime.
GRANT SELECT (id, organization_id, reference_number, lifecycle_status, status, created_at, updated_at) ON public.quotes TO authenticated;
GRANT SELECT (id, organization_id, tracking_number, container_number, status, eta, created_at, updated_at) ON public.loads TO authenticated;
GRANT SELECT (id, load_id, status, created_at) ON public.load_events TO authenticated;
GRANT SELECT ON public.profiles, public.organizations, public.organization_members, public.sync_status TO authenticated;
CREATE POLICY quotes_read ON public.quotes FOR SELECT TO authenticated
  USING (public.can_access_organization(organization_id) OR public.can_access_module('quotes'));
CREATE POLICY loads_read ON public.loads FOR SELECT TO authenticated
  USING (public.can_access_organization(organization_id) OR public.can_access_module('loads'));
CREATE POLICY events_read ON public.load_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.loads l WHERE l.id = load_id));
CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY organization_read ON public.organizations FOR SELECT TO authenticated
  USING (public.can_access_organization(id));
CREATE POLICY membership_read ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY sync_read ON public.sync_status FOR SELECT TO authenticated
  USING (public.can_access_module('sync'));

-- Legacy SECURITY DEFINER helpers must not be callable with arbitrary user IDs.
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN
      ('get_pending_invitation','accept_invitation','accept_platform_invitation',
       'generate_quote_token','validate_quote_token','mark_quote_token_used','use_quote_token',
       'get_user_org_membership','is_super_admin','find_organization_by_email',
       'cleanup_old_notifications','handle_new_user','log_quote_status_change') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
  END LOOP;
END $$;

-- Pin legacy helper lookups as well as restricting who can call them.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN
      ('get_pending_invitation','accept_platform_invitation','generate_quote_token',
       'cleanup_old_notifications','log_quote_status_change','validate_quote_token',
       'use_quote_token','get_user_org_membership','accept_invitation',
       'update_employees_updated_at','update_updated_at','handle_new_user',
       'is_super_admin','find_organization_by_email') LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, public, extensions', f.signature);
  END LOOP;
END $$;

-- A single transaction validates the verified recipient, grants access and
-- consumes the invite. The caller can only accept for its own auth identity.
CREATE OR REPLACE FUNCTION public.accept_verified_invitation(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE inv public.invitations%ROWTYPE; u auth.users%ROWTYPE;
BEGIN
  SELECT * INTO u FROM auth.users WHERE id = auth.uid();
  IF u.id IS NULL OR u.email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Verified sign-in required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO inv FROM public.invitations WHERE token = p_token FOR UPDATE;
  IF inv.id IS NULL OR inv.status <> 'pending' OR inv.expires_at <= now()
    OR lower(inv.email) <> lower(u.email) THEN
    RAISE EXCEPTION 'Invalid invitation' USING ERRCODE = '42501';
  END IF;
  IF inv.platform_role = 'super_admin' THEN
    UPDATE public.profiles SET role = 'super_admin', updated_at = now() WHERE id = u.id;
  ELSIF inv.platform_role IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = u.id) THEN
      RAISE EXCEPTION 'Already belongs to an organization';
    END IF;
    INSERT INTO public.organization_members (organization_id, user_id, email, role, invitation_id)
      VALUES (inv.organization_id, u.id, u.email, inv.role, inv.id);
  END IF;
  UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = inv.id;
  RETURN jsonb_build_object('success', true, 'isPlatformAdmin', inv.platform_role = 'super_admin');
END $$;
REVOKE ALL ON FUNCTION public.accept_verified_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_verified_invitation(text) TO authenticated;

-- Organization creation is atomic and requires a verified identity. Do not
-- claim a domain: sharing an email provider is not proof of company ownership.
CREATE OR REPLACE FUNCTION public.create_verified_organization(p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE u auth.users%ROWTYPE; org_id uuid;
BEGIN
  SELECT * INTO u FROM auth.users WHERE id = auth.uid();
  IF u.id IS NULL OR u.email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Verified sign-in required' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(u.id::text));
  SELECT organization_id INTO org_id FROM public.organization_members WHERE user_id = u.id;
  IF org_id IS NOT NULL THEN RETURN org_id; END IF;
  IF length(trim(p_name)) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Invalid organization name'; END IF;
  INSERT INTO public.organizations(name, slug, primary_email)
    VALUES (trim(p_name), gen_random_uuid()::text, u.email) RETURNING id INTO org_id;
  INSERT INTO public.organization_members(organization_id, user_id, email, role)
    VALUES (org_id, u.id, u.email, 'admin');
  RETURN org_id;
END $$;
REVOKE ALL ON FUNCTION public.create_verified_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_verified_organization(text) TO authenticated;
COMMIT;
