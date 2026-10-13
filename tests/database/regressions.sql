-- These fixtures exist only in the disposable test database.
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('00000000-0000-0000-0000-000000000001','alice@one.test',now()),
 ('00000000-0000-0000-0000-000000000002','bob@two.test',now()),
 ('00000000-0000-0000-0000-000000000003','pending@three.test',null);
INSERT INTO organizations(id,name) VALUES
 ('10000000-0000-0000-0000-000000000001','Same Name'),
 ('10000000-0000-0000-0000-000000000002','Same Name');
INSERT INTO organization_members(organization_id,user_id,email,role) VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','alice@one.test','admin'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','bob@two.test','admin');
INSERT INTO quotes(id,organization_id,company_name,delivery_zip,reference_number) VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Same Name','90210','Q1'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Same Name','90210','Q2');
INSERT INTO invitations(email,platform_role,token) VALUES ('alice@one.test','super_admin',repeat('a',64));

SET ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM * FROM public.quote_tokens; RAISE EXCEPTION 'Tokens leaked';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM * FROM public.quotes; RAISE EXCEPTION 'Quotes leaked';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.accept_platform_invitation(repeat('a',64),'00000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'Legacy privilege escalation allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
SET ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.quotes) <> 1 THEN RAISE EXCEPTION 'Tenant isolation failed'; END IF;
  IF EXISTS (SELECT 1 FROM public.quotes WHERE reference_number = 'Q1') THEN RAISE EXCEPTION 'Other tenant visible'; END IF;
  BEGIN PERFORM quote_notes FROM public.quotes; RAISE EXCEPTION 'Internal notes leaked';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.profiles SET role = 'super_admin' WHERE id = auth.uid();
    RAISE EXCEPTION 'Profile escalation allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.accept_verified_invitation(repeat('a',64));
    RAISE EXCEPTION 'Foreign invite accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
SET ROLE authenticated;
DO $$ BEGIN
  BEGIN PERFORM public.create_verified_organization('Unverified');
    RAISE EXCEPTION 'Unverified organization created'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
SET ROLE authenticated;
SELECT public.accept_verified_invitation(repeat('a',64));
RESET ROLE;
DO $$ BEGIN
  IF (SELECT role FROM profiles WHERE email = 'alice@one.test') <> 'super_admin' THEN RAISE EXCEPTION 'Valid invitation failed'; END IF;
END $$;

SET ROLE service_role;
UPDATE quotes SET lifecycle_status = 'in_review' WHERE reference_number = 'Q1';
UPDATE quotes SET lifecycle_status = 'quoted', quoted_price = 500 WHERE reference_number = 'Q1';
INSERT INTO quote_tokens(quote_id,token,type,expires_at) VALUES
 ('20000000-0000-0000-0000-000000000001',repeat('b',64),'accept',now()+interval '1 day');
SELECT respond_to_quote(repeat('b',64),'accept','Alice');
SELECT respond_to_quote(repeat('b',64),'accept','Alice');
UPDATE quotes SET lifecycle_status = 'expired' WHERE lifecycle_status = 'quoted' AND expires_at < now();
DO $$ BEGIN
  IF (SELECT lifecycle_status FROM quotes WHERE reference_number='Q1') <> 'accepted' THEN RAISE EXCEPTION 'Acceptance overwritten'; END IF;
  IF EXISTS (SELECT 1 FROM quotes WHERE status <> lifecycle_status::text) THEN RAISE EXCEPTION 'Status drift'; END IF;
  IF (SELECT count(*) FROM notification_outbox) <> 6 THEN RAISE EXCEPTION 'Notifications not enqueued atomically'; END IF;
  IF (SELECT count(*) FROM claim_quote_notifications()) <> 6 THEN RAISE EXCEPTION 'Outbox claim failed'; END IF;
  IF (SELECT count(*) FROM claim_quote_notifications()) <> 0 THEN RAISE EXCEPTION 'Outbox double claim'; END IF;
  BEGIN
    INSERT INTO loads(quote_id,tracking_number) VALUES ('20000000-0000-0000-0000-000000000002','TEST-PENDING');
    RAISE EXCEPTION 'Pending quote converted to load';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SELECT apply_portpro_event('create-1','REF1','{"status":"booked"}','[{"status":"booked","description":"created"}]',true,'2026-01-01');
SELECT apply_portpro_event('create-1','REF1','{"status":"booked"}','[{"status":"booked","description":"created"}]',true,'2026-01-01');
SELECT apply_portpro_event('status-1','REF1','{"status":"delivered"}','[]',false,'2026-01-03');
SELECT apply_portpro_event('stale-1','REF1','{"status":"in_transit"}','[]',false,'2026-01-02');
DO $$ BEGIN
  IF (SELECT count(*) FROM load_events) <> 1 THEN RAISE EXCEPTION 'Duplicate event inserted'; END IF;
  IF (SELECT status FROM loads WHERE portpro_reference='REF1') <> 'delivered' THEN RAISE EXCEPTION 'Stale event overwrote status'; END IF;
  BEGIN
    PERFORM apply_portpro_event('failed-1','REF2','{"status":"invalid"}','[]',true);
    RAISE EXCEPTION 'Invalid status accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF EXISTS (SELECT 1 FROM portpro_processed_events WHERE event_key='failed-1') THEN RAISE EXCEPTION 'Failed event acknowledged'; END IF;
  IF EXISTS (SELECT 1 FROM loads WHERE portpro_reference='REF2') THEN RAISE EXCEPTION 'Partial write survived'; END IF;
END $$;
DO $$ DECLARE load_id uuid; BEGIN
  SELECT id INTO load_id FROM loads WHERE portpro_reference='REF1';
  PERFORM replace_portpro_tracking(load_id,'[{"event_type":"stop","status":"delivered","description":"Valid stop"}]');
  BEGIN
    PERFORM replace_portpro_tracking(load_id,'[{"event_type":"stop","status":"delivered","move_number":"not-a-number"}]');
    RAISE EXCEPTION 'Invalid tracking data accepted';
  EXCEPTION WHEN invalid_text_representation THEN NULL; END;
  IF NOT EXISTS (SELECT 1 FROM load_events WHERE description='Valid stop') THEN RAISE EXCEPTION 'Tracking rollback lost valid stop'; END IF;
END $$;
RESET ROLE;
