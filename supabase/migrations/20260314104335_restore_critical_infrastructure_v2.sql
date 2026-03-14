
/*
  # Restore Critical Infrastructure V2

  Drops conflicting functions first, then recreates everything needed.
*/

-- Drop conflicting functions before recreating
DROP FUNCTION IF EXISTS admin_get_restoration_logs(integer) CASCADE;
DROP FUNCTION IF EXISTS validate_user_session(text) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_sessions() CASCADE;

-- ============================================================
-- RESTORE user_sessions table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text UNIQUE NOT NULL,
  phone text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('buyer', 'supplier', 'admin')),
  user_name text NOT NULL,
  ip_address text,
  user_agent text,
  expires_at timestamptz NOT NULL,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_phone ON user_sessions(phone) WHERE is_active = true;

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "System can insert sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;

CREATE POLICY "Users can view own sessions" ON user_sessions FOR SELECT USING (true);
CREATE POLICY "System can insert sessions" ON user_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own sessions" ON user_sessions FOR UPDATE USING (true);
CREATE POLICY "Users can delete own sessions" ON user_sessions FOR DELETE USING (true);

-- ============================================================
-- RESTORE admin_staff table
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'staff',
  permissions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin staff can read" ON admin_staff;
CREATE POLICY "Admin staff can read" ON admin_staff FOR SELECT USING (true);
CREATE POLICY "Admin staff insert" ON admin_staff FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin staff update" ON admin_staff FOR UPDATE USING (true);

-- ============================================================
-- RESTORE admin_login_logs table
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid,
  email text NOT NULL,
  action text NOT NULL DEFAULT 'login',
  user_agent text,
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_login_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read login logs" ON admin_login_logs;
DROP POLICY IF EXISTS "System can insert login logs" ON admin_login_logs;
CREATE POLICY "Admins can read login logs" ON admin_login_logs FOR SELECT USING (true);
CREATE POLICY "System can insert login logs" ON admin_login_logs FOR INSERT WITH CHECK (true);

-- ============================================================
-- RESTORE pallet_types_master table
-- ============================================================
CREATE TABLE IF NOT EXISTS pallet_types_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  icon text DEFAULT 'Package',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pallet_types_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read all pallet types" ON pallet_types_master;
DROP POLICY IF EXISTS "System can manage pallet types master" ON pallet_types_master;
CREATE POLICY "Public can read all pallet types" ON pallet_types_master FOR SELECT USING (true);
CREATE POLICY "System can manage pallet types master" ON pallet_types_master FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SESSION FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION create_user_session(
  p_phone text, p_user_type text, p_user_name text,
  p_ip_address text DEFAULT NULL, p_user_agent text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_token text; v_id uuid; v_expires_at timestamptz; v_hours integer;
BEGIN
  SELECT COALESCE(session_duration_hours, 24) INTO v_hours FROM platform_settings LIMIT 1;
  IF v_hours IS NULL THEN v_hours := 24; END IF;
  v_token := encode(gen_random_bytes(32), 'base64');
  v_expires_at := now() + (v_hours || ' hours')::interval;
  UPDATE user_sessions SET is_active = false WHERE phone = p_phone AND user_type = p_user_type AND is_active = true;
  INSERT INTO user_sessions (session_token, phone, user_type, user_name, ip_address, user_agent, expires_at, is_active)
  VALUES (v_token, p_phone, p_user_type, p_user_name, p_ip_address, p_user_agent, v_expires_at, true)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'session_token', v_token, 'session_id', v_id, 'expires_at', v_expires_at, 'duration_hours', v_hours);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION validate_user_session(p_session_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session user_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_session FROM user_sessions WHERE session_token = p_session_token AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة'); END IF;
  IF v_session.expires_at < now() THEN
    UPDATE user_sessions SET is_active = false WHERE id = v_session.id;
    RETURN jsonb_build_object('success', false, 'error', 'انتهت صلاحية الجلسة');
  END IF;
  UPDATE user_sessions SET last_activity_at = now() WHERE id = v_session.id;
  RETURN jsonb_build_object('success', true, 'phone', v_session.phone, 'user_type', v_session.user_type,
    'user_name', v_session.user_name, 'expires_at', v_session.expires_at, 'session_id', v_session.id);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION validate_session(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session user_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_session FROM user_sessions WHERE session_token = p_token AND is_active = true AND expires_at > now();
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة'); END IF;
  UPDATE user_sessions SET last_activity_at = now() WHERE id = v_session.id;
  RETURN jsonb_build_object('success', true, 'phone', v_session.phone, 'user_type', v_session.user_type, 'user_name', v_session.user_name);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION invalidate_user_session(p_session_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_sessions SET is_active = false WHERE session_token = p_session_token;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION invalidate_all_user_sessions(p_phone text, p_user_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count integer;
BEGIN
  UPDATE user_sessions SET is_active = false WHERE phone = p_phone AND user_type = p_user_type AND is_active = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'sessions_closed', v_count);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM user_sessions WHERE expires_at < now() - interval '7 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'deleted', v_count);
END; $$;

GRANT EXECUTE ON FUNCTION create_user_session(text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_user_session(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_session(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION invalidate_user_session(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION invalidate_all_user_sessions(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions() TO anon, authenticated;

-- ============================================================
-- ADMIN STAFF LOGIN
-- ============================================================
CREATE OR REPLACE FUNCTION admin_staff_login(p_email text, p_password text, p_user_agent text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_staff admin_staff%ROWTYPE;
BEGIN
  SELECT * INTO v_staff FROM admin_staff WHERE email = lower(trim(p_email)) AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'البريد الإلكتروني أو كلمة المرور غير صحيحة'); END IF;
  IF v_staff.password_hash != crypt(p_password, v_staff.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
  END IF;
  UPDATE admin_staff SET last_login_at = now() WHERE id = v_staff.id;
  INSERT INTO admin_login_logs (staff_id, email, action, user_agent, success) VALUES (v_staff.id, v_staff.email, 'login', p_user_agent, true);
  RETURN jsonb_build_object('success', true, 'staff_id', v_staff.id, 'email', v_staff.email,
    'full_name', v_staff.full_name, 'role', v_staff.role, 'permissions', v_staff.permissions);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

GRANT EXECUTE ON FUNCTION admin_staff_login(text,text,text) TO anon, authenticated;

-- ============================================================
-- PALLET TYPE MANAGEMENT (uses inventory_pallet_types)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_pallet_types(p_admin_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name_ar', name_ar, 'name_en', name_en,
    'icon', icon, 'is_active', is_active, 'display_order', display_order) ORDER BY display_order), '[]'::jsonb)
  INTO v_result FROM inventory_pallet_types;
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN '[]'::jsonb;
END; $$;

CREATE OR REPLACE FUNCTION admin_create_pallet_type(
  p_admin_email text, p_name_ar text, p_name_en text,
  p_icon text DEFAULT 'Package', p_is_active boolean DEFAULT true, p_display_order integer DEFAULT 0
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO inventory_pallet_types (name_ar, name_en, icon, is_active, display_order)
  VALUES (p_name_ar, p_name_en, p_icon, p_is_active, p_display_order) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION admin_update_pallet_type(
  p_admin_email text, p_id uuid, p_name_ar text, p_name_en text,
  p_icon text DEFAULT 'Package', p_is_active boolean DEFAULT true
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE inventory_pallet_types SET name_ar=p_name_ar, name_en=p_name_en, icon=p_icon, is_active=p_is_active, updated_at=now() WHERE id=p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'لم يتم العثور على النوع'); END IF;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION admin_delete_pallet_type(p_admin_email text, p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM inventory_pallet_types WHERE id=p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'لم يتم العثور على النوع'); END IF;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

GRANT EXECUTE ON FUNCTION admin_get_pallet_types(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_create_pallet_type(text,text,text,text,boolean,integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_pallet_type(text,uuid,text,text,text,boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_pallet_type(text,uuid) TO anon, authenticated;

-- ============================================================
-- INVENTORY OPERATIONS
-- ============================================================
CREATE OR REPLACE FUNCTION log_inventory_operation(
  p_operation_type text, p_batch_id uuid,
  p_quantity_affected integer DEFAULT 0, p_quantity_before integer DEFAULT 0,
  p_quantity_after integer DEFAULT 0, p_price_before numeric DEFAULT NULL,
  p_price_after numeric DEFAULT NULL, p_deal_id uuid DEFAULT NULL,
  p_performed_by text DEFAULT NULL, p_metadata jsonb DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO inventory_operations_log (operation_type, batch_id, quantity_affected, quantity_before,
    quantity_after, price_before, price_after, deal_id, performed_by, metadata)
  VALUES (p_operation_type, p_batch_id, p_quantity_affected, p_quantity_before,
    p_quantity_after, p_price_before, p_price_after, p_deal_id, p_performed_by, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION delete_inventory_operations(p_batch_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM inventory_operations_log WHERE batch_id=p_batch_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'deleted', v_count);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION delete_all_inventory_operations(p_supplier_phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM inventory_operations_log WHERE batch_id IN (SELECT id FROM inventory_batches WHERE supplier_phone=p_supplier_phone);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'deleted', v_count);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION get_inventory_analytics(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object('total_batches', COUNT(*), 'active_batches', COUNT(*) FILTER (WHERE status='active'),
    'total_pallets', COALESCE(SUM(quantity_available),0), 'avg_price', COALESCE(AVG(price_per_pallet),0))
  INTO v_result FROM inventory_batches WHERE created_at >= now() - (p_days||' days')::interval;
  RETURN COALESCE(v_result, '{}'::jsonb);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION get_batch_timeline(p_batch_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'operation_type',operation_type,
    'quantity_affected',quantity_affected,'performed_by',performed_by,'created_at',created_at) ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_result FROM inventory_operations_log WHERE batch_id=p_batch_id;
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN '[]'::jsonb;
END; $$;

CREATE OR REPLACE FUNCTION get_supplier_operations_summary(p_supplier_phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object('total_operations', COUNT(*), 'total_batches', COUNT(DISTINCT ol.batch_id),
    'last_operation', MAX(ol.created_at))
  INTO v_result FROM inventory_operations_log ol JOIN inventory_batches ib ON ib.id=ol.batch_id WHERE ib.supplier_phone=p_supplier_phone;
  RETURN COALESCE(v_result, '{}'::jsonb);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM);
END; $$;

GRANT EXECUTE ON FUNCTION log_inventory_operation(text,uuid,integer,integer,integer,numeric,numeric,uuid,text,jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_inventory_operations(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_all_inventory_operations(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_analytics(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_batch_timeline(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_supplier_operations_summary(text) TO anon, authenticated;

-- ============================================================
-- COMMENTS & RATINGS MANAGEMENT
-- ============================================================
CREATE OR REPLACE FUNCTION admin_bulk_moderate_comments(p_caller_email text, p_comment_ids uuid[], p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count integer;
BEGIN
  UPDATE marketplace_ratings SET is_confirmed = (p_action = 'approve') WHERE id = ANY(p_comment_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'updated', v_count);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION admin_restore_comment(p_caller_phone text, p_comment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE marketplace_ratings SET is_confirmed=true WHERE id=p_comment_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'التعليق غير موجود'); END IF;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION admin_update_comment(
  p_caller_phone text, p_comment_id uuid, p_comment_text text DEFAULT NULL,
  p_moderation_status text DEFAULT NULL, p_is_visible boolean DEFAULT NULL, p_flagged_reason text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE marketplace_ratings SET
    comment = COALESCE(p_comment_text, comment),
    is_confirmed = CASE WHEN p_moderation_status='approved' THEN true WHEN p_moderation_status='rejected' THEN false ELSE is_confirmed END,
    updated_at = now()
  WHERE id=p_comment_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'التعليق غير موجود'); END IF;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION admin_update_rating(
  p_caller_email text, p_rating_id uuid, p_rating_value integer DEFAULT NULL,
  p_comment text DEFAULT NULL, p_is_confirmed boolean DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_ratings SET
    rating=COALESCE(p_rating_value, rating), comment=COALESCE(p_comment, comment),
    is_confirmed=COALESCE(p_is_confirmed, is_confirmed), updated_at=now()
  WHERE id=p_rating_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'التقييم غير موجود'); END IF;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION get_user_comments(p_user_phone text, p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'comment',comment,'rating',rating,
    'item_type',item_type,'is_confirmed',is_confirmed,'created_at',created_at) ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_result FROM marketplace_ratings WHERE rater_phone=p_user_phone AND comment IS NOT NULL LIMIT p_limit;
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN '[]'::jsonb;
END; $$;

CREATE OR REPLACE FUNCTION create_visitor_rating(
  p_rated_phone text, p_item_type text, p_item_id uuid, p_rating integer,
  p_comment text DEFAULT NULL, p_visitor_phone text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid;
BEGIN
  IF p_rating < 1 OR p_rating > 5 THEN RETURN jsonb_build_object('success', false, 'error', 'التقييم يجب أن يكون بين 1 و 5'); END IF;
  INSERT INTO marketplace_ratings (rater_phone, rated_phone, item_type, item_id, rating, comment, is_confirmed)
  VALUES (COALESCE(p_visitor_phone,'anonymous'), p_rated_phone, p_item_type, p_item_id, p_rating, p_comment, true)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('success', false, 'error', 'لقد قمت بالتقييم مسبقاً');
WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

GRANT EXECUTE ON FUNCTION admin_bulk_moderate_comments(text,uuid[],text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_restore_comment(text,uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_comment(text,uuid,text,text,boolean,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_rating(text,uuid,integer,text,boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_comments(text,integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_visitor_rating(text,text,uuid,integer,text,text) TO anon, authenticated;

-- ============================================================
-- ANALYTICS & BEHAVIOR
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_behavior_summary(days_back integer DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object('total_sessions', COUNT(DISTINCT id), 'unique_visitors', COUNT(DISTINCT visitor_id),
    'avg_duration_seconds', COALESCE(AVG(EXTRACT(EPOCH FROM (last_active_at - created_at))),0))
  INTO v_result FROM visitor_sessions WHERE created_at >= now() - (days_back||' days')::interval;
  RETURN COALESCE(v_result, '{}'::jsonb);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION admin_get_live_behavior_feed(lim integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',vs.id,'visitor_id',vs.visitor_id,
    'current_page',vs.current_page,'phone',vs.phone,'device_type',vs.device_type,
    'created_at',vs.created_at,'last_active_at',vs.last_active_at) ORDER BY vs.last_active_at DESC), '[]'::jsonb)
  INTO v_result FROM visitor_sessions vs WHERE vs.last_active_at >= now() - interval '60 minutes' LIMIT lim;
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN '[]'::jsonb;
END; $$;

GRANT EXECUTE ON FUNCTION admin_get_behavior_summary(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_live_behavior_feed(integer) TO anon, authenticated;

-- ============================================================
-- FINANCIAL FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION get_financial_summary(p_period text DEFAULT 'all', p_city text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start_date timestamptz;
  v_total_deals integer; v_total_pallets integer;
  v_total_revenue numeric; v_total_commission numeric; v_settled_commission numeric;
BEGIN
  v_start_date := CASE p_period WHEN 'today' THEN CURRENT_DATE WHEN 'week' THEN CURRENT_DATE-INTERVAL '7 days'
    WHEN 'month' THEN CURRENT_DATE-INTERVAL '30 days' WHEN 'year' THEN CURRENT_DATE-INTERVAL '365 days'
    ELSE '2000-01-01'::timestamptz END;
  SELECT COUNT(*), COALESCE(SUM(quantity),0), COALESCE(SUM(final_price*quantity),0), COALESCE(SUM(platform_fee_per_pallet*quantity),0)
  INTO v_total_deals, v_total_pallets, v_total_revenue, v_total_commission
  FROM deals WHERE status!='cancelled' AND created_at>=v_start_date AND (p_city IS NULL OR city=p_city);
  SELECT COALESCE(SUM(cs.commission_amount),0) INTO v_settled_commission
  FROM commission_settlements cs JOIN deals d ON d.id=cs.deal_id WHERE cs.status='settled' AND (p_city IS NULL OR d.city=p_city);
  RETURN jsonb_build_object('period',p_period,'total_deals',v_total_deals,'total_pallets',v_total_pallets,
    'total_revenue',v_total_revenue,'total_commission',v_total_commission,'settled_commission',v_settled_commission,
    'pending_commission',v_total_commission-v_settled_commission);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION get_city_financial_breakdown(p_period text DEFAULT 'all', p_limit integer DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('city',city,'total_deals',COUNT(*),
    'total_revenue',COALESCE(SUM(final_price*quantity),0),'total_commission',COALESCE(SUM(platform_fee_per_pallet*quantity),0))
    ORDER BY SUM(final_price*quantity) DESC), '[]'::jsonb) INTO v_result FROM deals WHERE status!='cancelled' GROUP BY city LIMIT p_limit;
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN '[]'::jsonb;
END; $$;

GRANT EXECUTE ON FUNCTION get_financial_summary(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_city_financial_breakdown(text,integer) TO anon, authenticated;

-- ============================================================
-- WHATSAPP FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION increment_whatsapp_template_usage(p_template_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE whatsapp_templates SET usage_count=COALESCE(usage_count,0)+1, last_used_at=now() WHERE id=p_template_id;
EXCEPTION WHEN OTHERS THEN NULL;
END; $$;

CREATE OR REPLACE FUNCTION mark_admin_contacted_user(p_phone text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE whatsapp_contact_logs SET admin_contacted=true, admin_contacted_at=now()
  WHERE recipient_phone=p_phone AND admin_contacted=false;
EXCEPTION WHEN OTHERS THEN NULL;
END; $$;

CREATE OR REPLACE FUNCTION refresh_template_performance_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN UPDATE whatsapp_templates SET updated_at=now() WHERE id IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL; END; $$;

CREATE OR REPLACE FUNCTION get_silent_deals(p_days integer DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'buyer_phone',buyer_phone,'supplier_phone',supplier_phone,
    'status',status,'created_at',created_at) ORDER BY created_at DESC), '[]'::jsonb) INTO v_result
  FROM deals WHERE status IN ('pending','accepted') AND created_at < now()-(p_days||' days')::interval;
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN '[]'::jsonb;
END; $$;

CREATE OR REPLACE FUNCTION get_reengagement_candidates(p_days_inactive integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('phone',pu.phone,'name',pu.name,'user_type',pu.user_type,
    'last_active',pu.last_active_at) ORDER BY pu.last_active_at DESC), '[]'::jsonb) INTO v_result
  FROM platform_users pu WHERE pu.last_active_at < now()-(p_days_inactive||' days')::interval AND pu.is_active=true LIMIT 100;
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN RETURN '[]'::jsonb;
END; $$;

CREATE OR REPLACE FUNCTION get_supplier_active_batches(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_phone text; v_result jsonb;
BEGIN
  SELECT phone INTO v_phone FROM user_sessions WHERE session_token=p_token AND is_active=true AND expires_at>now() LIMIT 1;
  IF v_phone IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'جلسة غير صالحة'); END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'pallet_type',pallet_type,'size',size,'quality',quality,
    'quantity_available',quantity_available,'price_per_pallet',price_per_pallet,'city',city,'status',status)
    ORDER BY created_at DESC), '[]'::jsonb) INTO v_result FROM inventory_batches WHERE supplier_phone=v_phone AND status='active';
  RETURN jsonb_build_object('success', true, 'data', v_result);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

GRANT EXECUTE ON FUNCTION increment_whatsapp_template_usage(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_admin_contacted_user(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_template_performance_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_silent_deals(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_reengagement_candidates(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_supplier_active_batches(text) TO anon, authenticated;

-- ============================================================
-- INVOICE FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION mark_invoice_as_paid(p_invoice_id uuid, p_payment_date timestamptz DEFAULT now())
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE invoices SET status='paid', payment_date=p_payment_date, updated_at=now() WHERE id=p_invoice_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'الفاتورة غير موجودة'); END IF;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION admin_update_invoice_status(p_invoice_id uuid, p_status text, p_payment_date timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE invoices SET status=p_status, payment_date=COALESCE(p_payment_date,payment_date), updated_at=now() WHERE id=p_invoice_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'الفاتورة غير موجودة'); END IF;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

GRANT EXECUTE ON FUNCTION mark_invoice_as_paid(uuid,timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_invoice_status(uuid,text,timestamptz) TO anon, authenticated;

-- ============================================================
-- STUB FUNCTIONS (removed systems - return empty/success)
-- ============================================================
CREATE OR REPLACE FUNCTION expire_reservations() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN NULL; END; $$;
CREATE OR REPLACE FUNCTION ai_preview_matches(p_order_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN jsonb_build_object('matches','[]'::jsonb,'total',0); END; $$;
CREATE OR REPLACE FUNCTION admin_send_stall_reminder_v4(p_admin_email text, p_deal_id uuid, p_message text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN jsonb_build_object('success',true); END; $$;
CREATE OR REPLACE FUNCTION assign_ab_test_variant(p_user_id text, p_test_name text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN jsonb_build_object('variant','control'); END; $$;
CREATE OR REPLACE FUNCTION create_ab_test(p_name text, p_description text, p_variants jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN jsonb_build_object('success',true,'id',gen_random_uuid()); END; $$;
CREATE OR REPLACE FUNCTION get_ab_test_results(p_test_name text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN jsonb_build_object('results','[]'::jsonb); END; $$;
CREATE OR REPLACE FUNCTION track_ab_test_conversion(p_test_name text, p_user_id text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN NULL; END; $$;
CREATE OR REPLACE FUNCTION admin_list_backups() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN '[]'::jsonb; END; $$;
CREATE OR REPLACE FUNCTION admin_get_backup_schedules() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN '[]'::jsonb; END; $$;
CREATE OR REPLACE FUNCTION admin_get_backup_statistics() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN jsonb_build_object('total',0,'last_backup',null); END; $$;
CREATE OR REPLACE FUNCTION admin_get_restoration_logs(p_limit integer DEFAULT 50) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN '[]'::jsonb; END; $$;
CREATE OR REPLACE FUNCTION admin_create_backup(p_type text DEFAULT 'manual') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN jsonb_build_object('success',true,'id',gen_random_uuid()); END; $$;
CREATE OR REPLACE FUNCTION admin_delete_backup(p_backup_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN jsonb_build_object('success',true); END; $$;
CREATE OR REPLACE FUNCTION admin_configure_backup_schedule(p_settings jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN jsonb_build_object('success',true); END; $$;
CREATE OR REPLACE FUNCTION admin_log_restoration(p_backup_id uuid, p_type text, p_notes text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN jsonb_build_object('success',true); END; $$;

GRANT EXECUTE ON FUNCTION expire_reservations() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION ai_preview_matches(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_send_stall_reminder_v4(text,uuid,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION assign_ab_test_variant(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_ab_test(text,text,jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_ab_test_results(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION track_ab_test_conversion(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_list_backups() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_backup_schedules() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_backup_statistics() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_restoration_logs(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_create_backup(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_backup(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_configure_backup_schedule(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_log_restoration(uuid,text,text) TO anon, authenticated;
