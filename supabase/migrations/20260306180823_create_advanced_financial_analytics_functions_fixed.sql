/*
  # دوال التحليل المالي المتقدم

  1. الدوال الجديدة
    - get_financial_summary: ملخص مالي شامل مع فلترة
    - get_commission_details_with_filters: تفاصيل العمولات مع فلترة متقدمة
    - get_revenue_timeline: خط زمني للإيرادات
    - get_city_financial_breakdown: تفصيل مالي حسب المدن
    - get_supplier_performance_metrics: مقاييس أداء الموردين
    
  2. المميزات
    - فلترة حسب الفترة الزمنية (يوم، أسبوع، شهر، سنة، الكل)
    - فلترة حسب المدينة
    - فلترة حسب حالة التحصيل
    - إحصائيات شاملة ومفصلة
*/

-- دالة الملخص المالي الشامل مع فلترة
CREATE OR REPLACE FUNCTION get_financial_summary(
  p_period TEXT DEFAULT 'all',
  p_city TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_result JSON;
  v_total_pallets INT;
  v_total_revenue NUMERIC;
  v_total_commission NUMERIC;
  v_settled_commission NUMERIC;
  v_pending_commission NUMERIC;
  v_overdue_commission NUMERIC;
  v_total_deals INT;
  v_active_suppliers INT;
  v_avg_commission_per_pallet NUMERIC;
BEGIN
  v_start_date := CASE p_period
    WHEN 'today' THEN CURRENT_DATE
    WHEN 'week' THEN CURRENT_DATE - INTERVAL '7 days'
    WHEN 'month' THEN CURRENT_DATE - INTERVAL '30 days'
    WHEN 'year' THEN CURRENT_DATE - INTERVAL '365 days'
    ELSE '2000-01-01'::TIMESTAMPTZ
  END;
  
  SELECT 
    COUNT(*),
    COALESCE(SUM(quantity), 0),
    COALESCE(SUM(final_price * quantity), 0),
    COALESCE(SUM(platform_fee_per_pallet * quantity), 0),
    COUNT(DISTINCT supplier_phone)
  INTO 
    v_total_deals,
    v_total_pallets,
    v_total_revenue,
    v_total_commission,
    v_active_suppliers
  FROM deals
  WHERE status != 'cancelled'
    AND created_at >= v_start_date
    AND (p_city IS NULL OR city = p_city);
  
  SELECT COALESCE(SUM(cs.commission_amount), 0)
  INTO v_settled_commission
  FROM commission_settlements cs
  JOIN deals d ON d.id = cs.deal_id
  WHERE cs.status = 'settled'
    AND cs.settled_at >= v_start_date
    AND (p_city IS NULL OR d.city = p_city);
  
  v_pending_commission := v_total_commission - v_settled_commission;
  
  SELECT COALESCE(SUM(platform_fee_per_pallet * quantity), 0)
  INTO v_overdue_commission
  FROM deals d
  WHERE status = 'completed'
    AND completed_at < NOW() - INTERVAL '7 days'
    AND created_at >= v_start_date
    AND (p_city IS NULL OR city = p_city)
    AND NOT EXISTS (
      SELECT 1 FROM commission_settlements cs
      WHERE cs.deal_id = d.id AND cs.status = 'settled'
    );
  
  v_avg_commission_per_pallet := CASE 
    WHEN v_total_pallets > 0 THEN v_total_commission / v_total_pallets
    ELSE 0
  END;
  
  v_result := json_build_object(
    'period', p_period,
    'city', p_city,
    'start_date', v_start_date,
    'total_pallets', v_total_pallets,
    'total_revenue', v_total_revenue,
    'total_commission', v_total_commission,
    'settled_commission', v_settled_commission,
    'pending_commission', v_pending_commission,
    'overdue_commission', v_overdue_commission,
    'total_deals', v_total_deals,
    'active_suppliers', v_active_suppliers,
    'avg_commission_per_pallet', ROUND(v_avg_commission_per_pallet, 2),
    'collection_rate', CASE 
      WHEN v_total_commission > 0 
      THEN ROUND((v_settled_commission / v_total_commission * 100), 1)
      ELSE 0 
    END
  );
  
  RETURN v_result;
END;
$$;

-- دالة الخط الزمني للإيرادات
CREATE OR REPLACE FUNCTION get_revenue_timeline(
  p_interval TEXT DEFAULT 'daily',
  p_period TEXT DEFAULT 'month',
  p_city TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_result JSON;
BEGIN
  v_start_date := CASE p_period
    WHEN 'week' THEN CURRENT_DATE - INTERVAL '7 days'
    WHEN 'month' THEN CURRENT_DATE - INTERVAL '30 days'
    WHEN 'year' THEN CURRENT_DATE - INTERVAL '365 days'
    ELSE CURRENT_DATE - INTERVAL '30 days'
  END;
  
  WITH timeline_data AS (
    SELECT 
      CASE p_interval
        WHEN 'daily' THEN DATE_TRUNC('day', created_at)
        WHEN 'weekly' THEN DATE_TRUNC('week', created_at)
        WHEN 'monthly' THEN DATE_TRUNC('month', created_at)
      END as period_start,
      COUNT(*) as deals_count,
      SUM(quantity) as pallets_count,
      SUM(final_price * quantity) as revenue,
      SUM(platform_fee_per_pallet * quantity) as commission
    FROM deals
    WHERE status != 'cancelled'
      AND created_at >= v_start_date
      AND (p_city IS NULL OR city = p_city)
    GROUP BY period_start
    ORDER BY period_start
  )
  SELECT json_build_object(
    'interval', p_interval,
    'period', p_period,
    'city', p_city,
    'start_date', v_start_date,
    'data', COALESCE(json_agg(
      json_build_object(
        'period_start', period_start,
        'deals_count', deals_count,
        'pallets_count', pallets_count,
        'revenue', revenue,
        'commission', commission
      ) ORDER BY period_start
    ), '[]'::JSON)
  )
  INTO v_result
  FROM timeline_data;
  
  RETURN v_result;
END;
$$;

-- دالة التفصيل المالي حسب المدن
CREATE OR REPLACE FUNCTION get_city_financial_breakdown(
  p_period TEXT DEFAULT 'all'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_result JSON;
BEGIN
  v_start_date := CASE p_period
    WHEN 'today' THEN CURRENT_DATE
    WHEN 'week' THEN CURRENT_DATE - INTERVAL '7 days'
    WHEN 'month' THEN CURRENT_DATE - INTERVAL '30 days'
    WHEN 'year' THEN CURRENT_DATE - INTERVAL '365 days'
    ELSE '2000-01-01'::TIMESTAMPTZ
  END;
  
  WITH city_stats AS (
    SELECT 
      d.city,
      COUNT(*) as deals_count,
      SUM(d.quantity) as pallets_count,
      SUM(d.final_price * d.quantity) as revenue,
      SUM(d.platform_fee_per_pallet * d.quantity) as total_commission,
      COUNT(DISTINCT d.supplier_phone) as suppliers_count,
      COUNT(DISTINCT d.buyer_phone) as buyers_count,
      COALESCE(SUM(CASE WHEN cs.status = 'settled' THEN cs.commission_amount ELSE 0 END), 0) as settled_commission
    FROM deals d
    LEFT JOIN commission_settlements cs ON cs.deal_id = d.id AND cs.status = 'settled'
    WHERE d.status != 'cancelled'
      AND d.created_at >= v_start_date
    GROUP BY d.city
  )
  SELECT json_build_object(
    'period', p_period,
    'start_date', v_start_date,
    'cities', COALESCE(json_agg(
      json_build_object(
        'city', city,
        'deals_count', deals_count,
        'pallets_count', pallets_count,
        'revenue', revenue,
        'total_commission', total_commission,
        'settled_commission', settled_commission,
        'pending_commission', total_commission - settled_commission,
        'suppliers_count', suppliers_count,
        'buyers_count', buyers_count,
        'collection_rate', CASE 
          WHEN total_commission > 0 
          THEN ROUND((settled_commission / total_commission * 100), 1)
          ELSE 0 
        END
      ) ORDER BY pallets_count DESC
    ), '[]'::JSON),
    'total_cities', COUNT(*)
  )
  INTO v_result
  FROM city_stats;
  
  RETURN v_result;
END;
$$;

-- دالة مقاييس أداء الموردين
CREATE OR REPLACE FUNCTION get_supplier_performance_metrics(
  p_period TEXT DEFAULT 'all',
  p_city TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_result JSON;
BEGIN
  v_start_date := CASE p_period
    WHEN 'today' THEN CURRENT_DATE
    WHEN 'week' THEN CURRENT_DATE - INTERVAL '7 days'
    WHEN 'month' THEN CURRENT_DATE - INTERVAL '30 days'
    WHEN 'year' THEN CURRENT_DATE - INTERVAL '365 days'
    ELSE '2000-01-01'::TIMESTAMPTZ
  END;
  
  WITH supplier_stats AS (
    SELECT 
      d.supplier_phone,
      pu.display_name,
      pu.city,
      pu.trust_rating,
      COUNT(*) as deals_count,
      SUM(d.quantity) as pallets_count,
      SUM(d.final_price * d.quantity) as revenue,
      SUM(d.platform_fee_per_pallet * d.quantity) as total_commission,
      AVG(d.final_price) as avg_price_per_pallet,
      COALESCE(SUM(CASE WHEN cs.status = 'settled' THEN cs.commission_amount ELSE 0 END), 0) as settled_commission,
      MIN(d.created_at) as first_deal_date,
      MAX(d.created_at) as last_deal_date
    FROM deals d
    JOIN platform_users pu ON pu.phone = d.supplier_phone
    LEFT JOIN commission_settlements cs ON cs.deal_id = d.id AND cs.status = 'settled'
    WHERE d.status != 'cancelled'
      AND d.created_at >= v_start_date
      AND (p_city IS NULL OR d.city = p_city)
    GROUP BY d.supplier_phone, pu.display_name, pu.city, pu.trust_rating
    ORDER BY pallets_count DESC
    LIMIT p_limit
  )
  SELECT json_build_object(
    'period', p_period,
    'city', p_city,
    'start_date', v_start_date,
    'suppliers', COALESCE(json_agg(
      json_build_object(
        'supplier_phone', supplier_phone,
        'display_name', display_name,
        'city', city,
        'trust_rating', trust_rating,
        'deals_count', deals_count,
        'pallets_count', pallets_count,
        'revenue', revenue,
        'total_commission', total_commission,
        'settled_commission', settled_commission,
        'pending_commission', total_commission - settled_commission,
        'avg_price_per_pallet', ROUND(avg_price_per_pallet, 2),
        'collection_rate', CASE 
          WHEN total_commission > 0 
          THEN ROUND((settled_commission / total_commission * 100), 1)
          ELSE 0 
        END,
        'first_deal_date', first_deal_date,
        'last_deal_date', last_deal_date
      )
    ), '[]'::JSON),
    'total_suppliers', COUNT(*)
  )
  INTO v_result
  FROM supplier_stats;
  
  RETURN v_result;
END;
$$;
