# دليل منصة الطبليات - نظام متكامل

## نظرة عامة

منصة الطبليات هي سوق إلكتروني B2B متكامل لتداول الطبليات (Pallets) بين الموردين والمشترين. تجمع المنصة بين نظام مطابقة ذكي، إدارة مالية متقدمة، ونظام ثقة شامل.

---

## الأنظمة الرئيسية

### 1. نظام المستخدمين والمصادقة

#### المميزات:
- تسجيل مستخدمين جدد (شركات / أفراد)
- تسجيل دخول آمن باستخدام رقم الجوال و PIN
- جلسات آمنة مع tokens تلقائية التجديد (30 يوم)
- أدوار متعددة: مشتري (Buyer) / مورد (Supplier)
- ملفات تعريف قابلة للتحديث

#### الجداول المرتبطة:
- `platform_users`: بيانات المستخدمين الأساسية
- `session_tokens`: إدارة الجلسات
- `user_roles`: أدوار المستخدمين

#### الـ Functions:
- تسجيل حساب جديد عبر Hook: `useSession().register()`
- تسجيل دخول عبر: `useSession().login()`
- تحديث الملف الشخصي عبر: `useSession().updateProfile()`

---

### 2. نظام المخزون (Inventory)

#### المميزات:
- إضافة مخزون من الطبليات
- رفع صور متعددة (حتى 5 صور)
- تحديد: النوع، الحجم، الجودة، الحالة، السعر، الكمية، المدينة
- حجز تلقائي للكميات عند إنشاء الصفقات
- نظام الموافقة (اختياري)
- إمكانية تجميد أو إخفاء المخزون

#### الجداول المرتبطة:
- `inventory_batches`: الدُفعات (Batches) من المخزون
- `inventory_images`: صور المخزون (Storage: Supabase)
- `pallet_types`, `pallet_sizes`, `quality_grades`, `pallet_conditions`: إعدادات قابلة للتخصيص

#### الـ Functions:
- إضافة مخزون عبر: `useInventoryBuilder()`
- عرض مخزون المورد عبر: `SupplierInventory` Component
- المطابقة التلقائية عند الإضافة: `trigger_auto_match_on_inventory()`

---

### 3. نظام الطلبات (Orders)

#### المميزات:
- إنشاء طلبات بمواصفات دقيقة
- خيارات مرونة: قبول جودة قريبة، مدن قريبة، توصيل جزئي
- نظام تطابق ذكي مع المخزون المتاح
- حالات متعددة: معلق (pending)، متطابق (matched)، غير متطابق (unmatched)
- إنشاء صفقات تلقائياً عند التطابق

#### الجداول المرتبطة:
- `orders`: الطلبات
- `active_demand`: الطلب النشط (اختياري)

#### الـ Functions:
- إنشاء طلب عبر: `useOrderBuilder()`
- نظام المطابقة: `useMatching().runMatching()`
- مطابقة تلقائية: `auto_match_unmatched_orders()`

---

### 4. نظام المطابقة والصفقات (Matching & Deals)

#### المميزات:
- مطابقة ذكية تراعي: النوع، الحجم، الجودة، المدينة، الكمية
- أولوية للموردين ذوي الثقة العالية
- حساب سعر ديناميكي بناءً على المواصفات والكمية
- حجز كميات لمدة محددة (افتراضياً 24 ساعة)
- دورة حياة صفقة شاملة:
  1. **pending_supplier**: بانتظار المورد
  2. **inventory_reserved**: تم حجز المخزون
  3. **awaiting_buyer**: بانتظار المشتري
  4. **buyer_confirmed**: المشتري وافق
  5. **in_delivery**: في التوصيل
  6. **completed**: مكتملة
  7. **cancelled**: ملغاة

#### الجداول المرتبطة:
- `deals`: الصفقات
- `reservations`: حجز الكميات مع انتهاء تلقائي
- `commission_settlements`: تسوية العمولات

#### الـ Functions الرئيسية:
- `create_deal_with_reservation()`: إنشاء صفقة مع حجز
- `supplier_confirm_deal_v4()`: موافقة المورد
- `buyer_confirm_deal_v4()`: موافقة المشتري
- `supplier_start_delivery_v4()`: بدء التوصيل
- `supplier_confirm_delivery_v4()`: تأكيد التوصيل
- `supplier_fail_delivery_v4()`: فشل التوصيل (إرجاع الكمية)
- `supplier_cancel_deal_v4()`: إلغاء من المورد
- `buyer_cancel_deal()`: إلغاء من المشتري

---

### 5. النظام المالي والعمولات

#### المميزات:
- حساب عمولة المنصة تلقائياً (افتراضياً 1 ر.س لكل طبلية)
- تتبع العمولات المستحقة والمسددة
- إدارة مستحقات الموردين
- تقارير مالية شاملة
- تسوية يدوية من لوحة التحكم

#### الجداول المرتبطة:
- `commission_config`: إعدادات العمولة
- `commission_settlements`: سجل التسويات
- `ledger_entries`: سجل محاسبي شامل
- `supplier_liabilities`: مستحقات الموردين

#### الـ Functions:
- `get_finance_dashboard_metrics()`: مؤشرات مالية
- `admin_settle_supplier()`: تسوية عمولة مورد
- `create_ledger_entries_for_deal()`: تسجيل محاسبي للصفقة

---

### 6. نظام التقييمات والثقة

#### المميزات:
- **تقييمات الصفقات**: بعد إكمال الصفقة، يمكن للطرفين تقييم بعضهما
- **تقييمات الزوار**: تقييم الموردين/المشترين من السوق مباشرة
- **نظام التعليقات**: إضافة تعليقات مع الفلترة التلقائية
- **إدارة شاملة من لوحة التحكم**:
  - الموافقة على التقييمات
  - مراجعة التعليقات
  - الإبلاغ عن المحتوى غير اللائق
- **مؤشر ثقة ديناميكي** (1-5 نجوم) يُحدّث تلقائياً
- **تأثير على المطابقة**: الموردون ذوو الثقة العالية يحصلون على أولوية

#### الجداول المرتبطة:
- `user_ratings`: التقييمات
- `ratings_comments`: التعليقات
- `trust_levels`: مستويات الثقة القابلة للتخصيص
- `platform_users.trust_rating`: مؤشر الثقة لكل مستخدم

#### الـ Functions:
- `create_user_rating()`: إنشاء تقييم صفقة
- `create_visitor_rating()`: إنشاء تقييم زائر
- `update_trust_rating_from_visitor_ratings()`: تحديث الثقة تلقائياً
- `admin_confirm_rating()`: موافقة إدارية
- `admin_delete_rating()`: حذف تقييم
- `admin_flag_comment()`: الإبلاغ عن تعليق

---

### 7. نظام المدن

#### المميزات:
- إدارة كاملة للمدن المدعومة
- حالات متعددة: نشط، مراقبة، تجريبي، مجمّد
- إعدادات خاصة لكل مدينة:
  - رسوم مخصصة
  - مدة حجز مخصصة
  - حد أدنى للكمية
  - تفعيل/تعطيل المطابقة
- مؤشرات لكل مدينة: العرض، الطلب، الصفقات النشطة

#### الجداول المرتبطة:
- `cities`: المدن

---

### 8. نظام الإشعارات (Notifications)

#### المميزات:
- إشعارات داخل التطبيق لكل المستخدمين
- إشعارات مرتبطة بالصفقات
- تتبع الإشعارات المقروءة
- قوالب قابلة للتخصيص

#### الجداول المرتبطة:
- `user_notifications`: الإشعارات
- `notification_templates`: قوالب الإشعارات

---

### 9. نظام الصور والملفات

#### المميزات:
- رفع صور للمخزون (حتى 5 صور)
- تخزين آمن في Supabase Storage
- صور رئيسية وثانوية
- ترتيب مخصص للصور

#### Storage Buckets:
- `inventory-images`: صور المخزون

#### الجداول المرتبطة:
- `inventory_images`: بيانات الصور

---

## لوحة التحكم الإدارية

### الوصول:
- زر الدرع الأحمر (🛡️) في الشريط العلوي
- حسابات إدارية مُعدة مسبقاً:

| البريد الإلكتروني | كلمة المرور | الدور |
|-------------------|-------------|-------|
| admin@palletexchange.com | admin123 | مدير النظام |
| market@palletmarket.com | admin123 | مدير السوق |
| deals@palletmarket.com | admin123 | مدير الصفقات |
| finance@palletmarket.com | admin123 | مدير المالية |
| support@palletmarket.com | admin123 | موظف دعم |

### الأقسام:

#### 1. لوحة القيادة (Dashboard)
- مؤشرات تنفيذية: GMV، إيرادات، مستحقات، صفقات نشطة
- نظرة عامة على السوق (المدن)
- معاينة تدفق الصفقات
- ملخص مالي يومي
- سجل النشاطات الأخيرة

#### 2. إدارة السوق (Market)
- **المدن**: إدارة كاملة (إضافة، تعديل، تجميد)
- **المخزون**: عرض، تعديل، تجميد، حذف
- **الطلبات**: عرض، تعديل، حذف

#### 3. إدارة الصفقات (Deals)
- فلترة حسب الحالة
- عرض تفاصيل كاملة
- تجميد/إلغاء/حذف صفقات
- إرسال تذكيرات
- تعديل رسوم الصفقة

#### 4. إدارة المالية (Finance)
- مؤشرات: إجمالي الطبليات، العمولات، المسددة، المستحقة
- إدارة العمولات المستحقة والمتأخرة
- تسوية يدوية
- ملفات مالية للموردين
- إحصائيات السوق

#### 5. إدارة المستخدمين (Users)
- قائمة المستخدمين
- إيقاف/استرجاع حسابات
- إدارة الموظفين والصلاحيات
- تحليلات المستخدمين

#### 6. التقييمات والتعليقات
- **التقييمات**: عرض، موافقة، حذف، تحليلات
- **التعليقات**: مراجعة، إبلاغ، إخفاء، إظهار

#### 7. الإعدادات (Settings)
- إعدادات المنصة العامة
- إعدادات العمولة
- إعدادات المطابقة
- إعدادات نماذج الطلب والمخزون
- إعدادات الثقة
- قوالب الإشعارات

---

## مسار الصفقة الكامل (End-to-End Flow)

### 1. إضافة مخزون (Supplier)
```
Supplier → Inventory Builder → Fill Form → Upload Images → Submit
→ Batch Created (status: active)
→ Auto-matching triggered if there are pending orders
```

### 2. إنشاء طلب (Buyer)
```
Buyer → Order Builder → Fill Form → Set Flexibility → Submit
→ Order Created (status: pending)
→ Matching Engine Runs
→ If Match Found: Deal Created (status: pending_supplier)
→ Quantity Reserved (reservation_expires_at: +24h)
```

### 3. موافقة المورد
```
Supplier → My Deals → View Deal → Confirm
→ supplier_confirm_deal_v4()
→ Status: inventory_reserved → awaiting_buyer
```

### 4. موافقة المشتري
```
Buyer → My Deals → View Deal → Confirm
→ buyer_confirm_deal_v4()
→ Status: awaiting_buyer → in_delivery
```

### 5. بدء التوصيل (Supplier)
```
Supplier → My Deals → Start Delivery
→ supplier_start_delivery_v4()
→ delivery_started_at timestamp set
```

### 6. تأكيد التوصيل (Supplier)
```
Supplier → My Deals → Confirm Delivery
→ supplier_confirm_delivery_v4()
→ Status: in_delivery → completed
→ Commission recorded
→ Both parties can now rate each other
```

### 7. التقييم (Both Parties)
```
Buyer/Supplier → Rate Deal → Submit Rating → Optionally Add Comment
→ create_user_rating()
→ Trust rating updated automatically
→ Admin can review/approve
```

---

## البيانات الموجودة

### المدن النشطة (8 مدن):
الرياض، جدة، الدمام، المدينة المنورة، مكة المكرمة، الخبر، تبوك، أبها

### أنواع الطبليات (3):
- خشبية
- بلاستيكية
- إعادة تدوير

### الأحجام (4):
- 120×100
- 110×110
- 120×80
- 80×60

### درجات الجودة (4):
- A (ممتاز)
- B (جيد)
- C (مقبول)
- Scrap (خردة)

### حالات الطبليات (3):
- جديدة
- مستعملة
- معاد تدويرها

---

## قاعدة البيانات

### إجمالي الجداول: 42 جدول

### الجداول الرئيسية:
1. `platform_users` - المستخدمون (40 مستخدم)
2. `orders` - الطلبات (13 طلب)
3. `inventory_batches` - المخزون (7 دفعات)
4. `deals` - الصفقات (16 صفقة)
5. `user_ratings` - التقييمات (11 تقييم)
6. `ratings_comments` - التعليقات (7 تعليقات)
7. `cities` - المدن (20 مدينة)
8. `admin_staff` - الموظفون (6 موظفين)
9. `session_tokens` - الجلسات (104 جلسة)
10. `inventory_images` - صور المخزون (22 صورة)

### الـ Functions: 108+ function
- functions لإدارة الصفقات
- functions لإدارة المستخدمين
- functions لإدارة المالية
- functions لإدارة التقييمات والتعليقات
- functions للـ Admin

### RLS (Row Level Security):
- جميع الجداول محمية بـ RLS
- سياسات دقيقة لكل عملية (SELECT, INSERT, UPDATE, DELETE)
- حماية شاملة للبيانات

### Realtime:
- مفعّل على الجداول الحيوية:
  - `orders`, `deals`, `inventory_batches`
  - `user_ratings`, `ratings_comments`
  - `platform_users`, `cities`

---

## الأمان

### المصادقة:
- تشفير PIN باستخدام SHA-256 + Salt
- Tokens عشوائية آمنة
- جلسات تنتهي تلقائياً بعد 30 يوم

### RLS:
- كل جدول محمي بـ RLS
- المستخدمون يرون بياناتهم فقط
- الإدارة لديها صلاحيات محددة حسب الدور

### الصلاحيات الإدارية:
- 5 أدوار: System Admin, Market Manager, Deals Manager, Finance Manager, Support Staff
- كل دور له صلاحيات محددة على كل قسم
- تسجيل كامل لجميع العمليات الإدارية في `audit_log`

---

## الإحصائيات الحالية

### المستخدمون: 40
- موردون: 17
- مشترون: متعدد
- مدراء: 6

### الصفقات: 16
- معلقة، نشطة، مكتملة، ملغاة

### المخزون: 7 دفعات
- متاح للشراء

### الطلبات: 13
- معلقة، متطابقة، غير متطابقة

### التقييمات: 11 تقييم
- متوسط الثقة: 3 نجوم (افتراضي)

---

## التطوير والصيانة

### التقنيات المستخدمة:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Functions + Realtime)
- **Icons**: Lucide React

### البناء:
```bash
npm run build
```

### التشغيل المحلي:
```bash
npm run dev
```

### متغيرات البيئة (.env):
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## الخلاصة

منصة الطبليات هي نظام متكامل وجاهز للتشغيل التجريبي. تجمع بين:

✅ نظام مستخدمين قوي
✅ مطابقة ذكية
✅ إدارة مالية متقدمة
✅ نظام ثقة شامل
✅ لوحة تحكم إدارية قوية
✅ أمان متقدم مع RLS
✅ بيانات حقيقية وجاهزة للاختبار

**المنصة جاهزة الآن للتشغيل والاختبار الشامل!** 🚀
