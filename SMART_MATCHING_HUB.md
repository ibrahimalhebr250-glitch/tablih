# مركز المطابقة الذكية - دليل شامل

## نظرة عامة

تم تطوير **مركز المطابقة الذكية** كنظام متقدم ومبتكر لمراقبة وإدارة عمليات المطابقة بين المخزون والطلبات في الوقت الفعلي. النظام مصمم بتقنيات حديثة ويعمل بالذكاء الاصطناعي لتحليل وتحسين المطابقات.

## الميزات الرئيسية

### 1. المراقبة الحية (Live Monitoring)
- تتبع فوري للمطابقات لحظة بلحظة
- تحديث تلقائي كل 10 ثواني
- عرض تفصيلي لكل محاولة مطابقة مع:
  - نقاط المطابقة (Match Score)
  - وقت المعالجة بالميلي ثانية
  - تفاصيل المنتج والموقع والكمية
  - حالة المطابقة (ناجحة / فاشلة / معلقة)

### 2. التحليلات المتقدمة (Advanced Analytics)
- إحصائيات شاملة حسب فترات زمنية:
  - اليوم
  - هذا الأسبوع
  - هذا الشهر
- تحليل المطابقات حسب الجودة
- أكثر المدن نشاطاً
- متوسط النقاط ووقت المعالجة
- نسبة النجاح والفشل

### 3. قائمة الانتظار (Pending Queue)
- عرض الطلبات المعلقة
- عدد المطابقات المحتملة لكل طلب
- وقت الانتظار لكل طلب
- تحديد الطلبات العاجلة (أكثر من 24 ساعة)
- إمكانية تشغيل المطابقة يدوياً للمسؤولين

### 4. رسوم بيانية للأداء (Performance Charts)
- خط زمني لعدد المطابقات
- متوسط وقت المعالجة عبر الوقت
- نسبة النجاح التاريخية
- رسوم بيانية تفاعلية للمراقبة

## البنية التقنية

### قاعدة البيانات

#### الجداول الجديدة

**1. matching_analytics**
```sql
- id: uuid (Primary Key)
- order_id: uuid (Foreign Key → orders)
- batch_id: uuid (Foreign Key → inventory_batches)
- match_score: numeric
- match_status: text (pending | matched | failed)
- pallet_type: text
- size: text
- quality: text
- quantity: integer
- city: text
- buyer_phone: text
- supplier_phone: text
- processing_time_ms: integer
- match_factors: jsonb
- created_at: timestamptz
```

**2. matching_performance_log**
```sql
- id: uuid (Primary Key)
- log_timestamp: timestamptz
- matches_count: integer
- success_count: integer
- fail_count: integer
- avg_processing_time: numeric
- avg_score: numeric
- period_minutes: integer
```

### الدوال (Functions)

#### 1. get_matching_hub_stats()
```typescript
Returns: {
  total_matches_today: number
  success_rate: number
  avg_match_time_seconds: number
  pending_orders: number
  active_inventory: number
  potential_matches: number
}
```

#### 2. get_pending_orders_with_potential_matches(p_phone?)
```typescript
Returns: Array<{
  id: uuid
  request_id: string
  pallet_type: string
  size: string
  quality: string
  quantity: number
  city: string
  pallet_condition: string
  status: string
  created_at: timestamp
  phone: string
  potential_matches_count: number
  waiting_time_hours: number
}>
```

#### 3. get_matching_analytics(p_time_range)
```typescript
Parameters: 'today' | 'week' | 'month'

Returns: {
  total_matches: number
  successful_matches: number
  failed_matches: number
  avg_score: number
  avg_processing_time: number
  matches_by_hour: Array
  matches_by_quality: Array
  top_cities: Array
  success_rate_trend: number
}
```

#### 4. get_matching_performance_timeline()
```typescript
Returns: Array<{
  log_timestamp: timestamp
  matches_count: number
  success_rate: number
  avg_processing_time: number
  avg_score: number
}>
```

#### 5. log_matching_attempt()
```typescript
Parameters: {
  p_order_id: uuid
  p_batch_id: uuid
  p_match_score: number
  p_match_status: string
  p_pallet_type: string
  p_size: string
  p_quality: string
  p_quantity: number
  p_city: string
  p_buyer_phone: string
  p_supplier_phone: string
  p_processing_time_ms: number
  p_match_factors: jsonb
}

Returns: uuid (analytics entry id)
```

### المكونات (Components)

#### 1. MatchingHub
المكون الرئيسي الذي يحتوي على:
- إحصائيات فورية في الرأس
- نظام تبويب للتنقل بين الأقسام
- تحديثات فورية من قاعدة البيانات

#### 2. LiveMatchingMonitor
- عرض المطابقات الحية
- اشتراك في التحديثات الفورية عبر Realtime
- عرض مفصل لكل مطابقة مع الحالة والنقاط

#### 3. PendingMatchesQueue
- قائمة الطلبات المعلقة
- تحديد الطلبات العاجلة
- عرض المطابقات المحتملة
- زر تشغيل المطابقة للمسؤولين

#### 4. MatchingAnalytics
- تحليلات شاملة حسب الفترة الزمنية
- رسوم بيانية لنسب النجاح
- تحليل حسب الجودة والمدن

#### 5. MatchingPerformanceChart
- رسوم بيانية تفاعلية
- خطوط زمنية للأداء
- مقارنة البيانات عبر الوقت

## التكامل مع النظام

### التحديثات الفورية (Realtime)
النظام يستخدم Supabase Realtime للتحديثات الفورية:

```typescript
const channel = supabase
  .channel('matching-updates')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'deals' },
    () => loadStats()
  )
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'orders' },
    () => loadStats()
  )
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'inventory_batches' },
    () => loadStats()
  )
  .subscribe();
```

### تسجيل المطابقات
عند كل محاولة مطابقة، يجب تسجيلها:

```typescript
await supabase.rpc('log_matching_attempt', {
  p_order_id: orderId,
  p_batch_id: batchId,
  p_match_score: score,
  p_match_status: 'matched',
  p_pallet_type: palletType,
  p_size: size,
  p_quality: quality,
  p_quantity: quantity,
  p_city: city,
  p_buyer_phone: buyerPhone,
  p_supplier_phone: supplierPhone,
  p_processing_time_ms: processingTime,
  p_match_factors: {
    quality_score: 95,
    price_score: 85,
    location_score: 90
  }
});
```

## الوصول إلى النظام

### للمسؤولين
1. تسجيل الدخول إلى لوحة التحكم
2. الانتقال إلى قسم "المطابقة الذكية"
3. عرض جميع البيانات والإحصائيات

### للمستخدمين
- يمكن للمستخدمين رؤية المطابقات الخاصة بهم فقط
- عرض إحصائيات محدودة

## الأمان

### Row Level Security (RLS)
- جدول `matching_analytics`: قراءة للجميع، كتابة للنظام فقط
- جدول `matching_performance_log`: قراءة للجميع، إدارة كاملة للنظام

### الأذونات
- المسؤولون: وصول كامل لجميع البيانات
- المستخدمون العاديون: وصول محدود لبياناتهم فقط

## التحسينات المستقبلية

1. **تعلم آلي متقدم**
   - تحسين خوارزمية المطابقة بناءً على البيانات التاريخية
   - توقع أفضل الأوقات للمطابقة

2. **إشعارات ذكية**
   - تنبيهات فورية عند وجود مطابقات محتملة
   - اقتراحات تلقائية للتحسين

3. **تقارير مخصصة**
   - تصدير التقارير بصيغ مختلفة
   - جدولة التقارير الدورية

4. **لوحة تحكم متقدمة**
   - رسوم بيانية أكثر تعقيداً
   - مقارنات تاريخية متقدمة

## الملخص

نظام مركز المطابقة الذكية يوفر:
- ✅ مراقبة فورية لحظة بلحظة
- ✅ تحليلات شاملة ومتقدمة
- ✅ إدارة ذكية لقوائم الانتظار
- ✅ رسوم بيانية تفاعلية للأداء
- ✅ تكامل كامل مع النظام الأساسي
- ✅ أمان محكم مع RLS
- ✅ تحديثات فورية عبر Realtime

النظام جاهز للاستخدام الفوري ويوفر رؤية كاملة وشاملة لعمليات المطابقة في المنصة.
