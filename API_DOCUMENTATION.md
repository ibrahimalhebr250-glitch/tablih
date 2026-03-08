# 📡 دليل API - منصة طبليات

## نظرة عامة

توفر منصة طبليات API قوي وآمن للتكامل مع الأنظمة الخارجية. يدعم API عمليات القراءة والكتابة مع نظام تحكم صارم بالصلاحيات والحدود.

---

## 🔐 المصادقة (Authentication)

### إنشاء مفتاح API

```typescript
import { useAPIIntegration } from './hooks/useAPIIntegration';

const { createAPIKey } = useAPIIntegration(userPhone);

const result = await createAPIKey(
  'مفتاح الإنتاج',           // اسم المفتاح
  ['read', 'write'],        // الصلاحيات
  1000,                     // الحد الأقصى (طلب/ساعة)
  365                       // مدة الصلاحية (أيام)
);

// result.data.api_key = 'pk_xxxxxxxxxxxxx'
// احفظ المفتاح في مكان آمن!
```

### استخدام المفتاح

```javascript
// في كل طلب API
headers: {
  'Authorization': 'Bearer pk_xxxxxxxxxxxxx',
  'Content-Type': 'application/json'
}
```

---

## 📊 API Endpoints

### Base URL
```
https://bgoevtkcakfbvxootfhu.supabase.co/rest/v1
```

### 1. الطلبات (Orders)

#### إنشاء طلب جديد
```http
POST /rest/v1/rpc/create_order
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "p_phone": "05xxxxxxxx",
  "p_pallet_type": "euro",
  "p_pallet_size": "120x80",
  "p_quality_grade": "grade_a",
  "p_pallet_condition": "new",
  "p_quantity": 100,
  "p_city": "الرياض",
  "p_max_price_per_pallet": 150
}
```

**Response:**
```json
{
  "success": true,
  "order_id": "uuid",
  "message": "تم إنشاء الطلب بنجاح"
}
```

#### الحصول على طلبات المستخدم
```http
GET /rest/v1/rpc/get_user_orders?p_user_phone=05xxxxxxxx
Authorization: Bearer {api_key}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "pallet_type": "euro",
    "quantity": 100,
    "status": "pending",
    "created_at": "2026-03-08T..."
  }
]
```

---

### 2. المخزون (Inventory)

#### إضافة مخزون
```http
POST /rest/v1/rpc/add_inventory_batch
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "p_supplier_phone": "05xxxxxxxx",
  "p_pallet_type": "euro",
  "p_pallet_size": "120x80",
  "p_quality_grade": "grade_a",
  "p_pallet_condition": "new",
  "p_quantity": 500,
  "p_price_per_pallet": 120,
  "p_city": "الرياض",
  "p_description": "طبليات يورو جديدة",
  "p_images": []
}
```

**Response:**
```json
{
  "success": true,
  "batch_id": "uuid",
  "message": "تمت إضافة المخزون بنجاح"
}
```

#### الحصول على مخزون المورد
```http
GET /rest/v1/rpc/get_supplier_inventory?p_supplier_phone=05xxxxxxxx
Authorization: Bearer {api_key}
```

---

### 3. الصفقات (Deals)

#### الحصول على صفقات المشتري
```http
GET /rest/v1/rpc/get_buyer_deals?p_buyer_phone=05xxxxxxxx
Authorization: Bearer {api_key}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "order_id": "uuid",
    "inventory_batch_id": "uuid",
    "quantity": 100,
    "buyer_price": 15000,
    "supplier_price": 12000,
    "status": "pending_buyer",
    "created_at": "2026-03-08T..."
  }
]
```

#### تأكيد صفقة (مشتري)
```http
POST /rest/v1/rpc/buyer_confirm_deal
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "p_deal_id": "uuid",
  "p_buyer_phone": "05xxxxxxxx"
}
```

#### تأكيد توصيل (مورد)
```http
POST /rest/v1/rpc/supplier_delivery_deal
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "p_deal_id": "uuid",
  "p_supplier_phone": "05xxxxxxxx"
}
```

---

### 4. مخزون المشتري (Buyer Inventory)

#### الحصول على مخزون المشتري
```http
GET /rest/v1/rpc/get_buyer_inventory?p_buyer_phone=05xxxxxxxx
Authorization: Bearer {api_key}
```

#### سحب من المخزون
```http
POST /rest/v1/rpc/buyer_withdraw_from_inventory
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "p_buyer_phone": "05xxxxxxxx",
  "p_pallet_type": "euro",
  "p_pallet_size": "120x80",
  "p_quality_grade": "grade_a",
  "p_pallet_condition": "new",
  "p_quantity": 50
}
```

---

### 5. المستخدمين (Users)

#### تحديث ملف المستخدم
```http
PATCH /rest/v1/users?phone=eq.05xxxxxxxx
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "name": "اسم جديد",
  "profile_image_url": "https://..."
}
```

---

## 🎯 Webhooks

### إنشاء Webhook

```typescript
const { createWebhook } = useAPIIntegration(userPhone);

const result = await createWebhook(
  'https://your-domain.com/webhooks/pallet-platform',
  'Webhook الإنتاج',
  [
    'order.created',
    'order.matched',
    'deal.confirmed',
    'deal.completed'
  ]
);

// result.data.secret_key = 'whsec_xxxxxxxxxxxxx'
```

### الأحداث المدعومة

| الحدث | الوصف |
|------|------|
| `order.created` | عند إنشاء طلب جديد |
| `order.matched` | عند مطابقة طلب مع مخزون |
| `order.completed` | عند إتمام طلب |
| `inventory.added` | عند إضافة مخزون جديد |
| `inventory.updated` | عند تحديث مخزون |
| `deal.created` | عند إنشاء صفقة |
| `deal.confirmed` | عند تأكيد صفقة |
| `deal.in_delivery` | عند بدء التوصيل |
| `deal.completed` | عند إتمام صفقة |
| `deal.cancelled` | عند إلغاء صفقة |
| `user.registered` | عند تسجيل مستخدم جديد |
| `user.updated` | عند تحديث معلومات مستخدم |

### تنسيق الـ Webhook Payload

```json
{
  "event": "deal.confirmed",
  "timestamp": "2026-03-08T10:30:00Z",
  "data": {
    "deal_id": "uuid",
    "order_id": "uuid",
    "inventory_batch_id": "uuid",
    "buyer_phone": "05xxxxxxxx",
    "supplier_phone": "05yyyyyyyy",
    "quantity": 100,
    "buyer_price": 15000,
    "status": "in_delivery"
  },
  "signature": "sha256_signature_here"
}
```

### التحقق من التوقيع

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return computedSignature === signature;
}

// في endpoint الـ webhook الخاص بك
app.post('/webhooks/pallet-platform', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = 'whsec_xxxxxxxxxxxxx';

  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // معالجة الحدث
  const { event, data } = req.body;

  switch (event) {
    case 'deal.confirmed':
      // تحديث نظامك الخارجي
      break;
    case 'order.created':
      // إرسال إشعار
      break;
  }

  res.status(200).json({ received: true });
});
```

---

## ⚡ Rate Limiting

### الحدود الافتراضية

- **Free Tier**: 1000 طلب/ساعة
- **Pro Tier**: 10,000 طلب/ساعة
- **Enterprise**: غير محدود

### استجابة Rate Limit

```json
{
  "error": "Rate limit exceeded",
  "limit": 1000,
  "reset_at": "2026-03-08T11:00:00Z",
  "retry_after": 3600
}
```

### التعامل مع Rate Limits

```javascript
async function makeAPIRequest(endpoint, options) {
  const response = await fetch(endpoint, options);

  if (response.status === 429) {
    const data = await response.json();
    const retryAfter = data.retry_after || 3600;

    console.log(`Rate limit exceeded. Retry after ${retryAfter} seconds`);

    // انتظر وأعد المحاولة
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return makeAPIRequest(endpoint, options);
  }

  return response;
}
```

---

## 🔒 الصلاحيات (Permissions)

### أنواع الصلاحيات

| الصلاحية | الوصف |
|---------|------|
| `read` | قراءة البيانات فقط |
| `write` | إنشاء وتحديث البيانات |
| `delete` | حذف البيانات |
| `admin` | صلاحيات إدارية كاملة |

### تخصيص الصلاحيات

```typescript
await createAPIKey(
  'مفتاح القراءة فقط',
  ['read'],              // قراءة فقط
  1000
);

await createAPIKey(
  'مفتاح الكتابة',
  ['read', 'write'],     // قراءة وكتابة
  5000
);
```

---

## 📝 أمثلة الاستخدام

### Node.js Example

```javascript
const fetch = require('node-fetch');

class PalletPlatformAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://bgoevtkcakfbvxootfhu.supabase.co/rest/v1';
  }

  async createOrder(orderData) {
    const response = await fetch(`${this.baseURL}/rpc/create_order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    return response.json();
  }

  async getUserOrders(phone) {
    const response = await fetch(
      `${this.baseURL}/rpc/get_user_orders?p_user_phone=${phone}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );

    return response.json();
  }
}

// الاستخدام
const api = new PalletPlatformAPI('pk_xxxxxxxxxxxxx');

const order = await api.createOrder({
  p_phone: '05xxxxxxxx',
  p_pallet_type: 'euro',
  p_quantity: 100,
  // ...
});

console.log('Order created:', order);
```

### Python Example

```python
import requests

class PalletPlatformAPI:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://bgoevtkcakfbvxootfhu.supabase.co/rest/v1'

    def _headers(self):
        return {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }

    def create_order(self, order_data):
        response = requests.post(
            f'{self.base_url}/rpc/create_order',
            json=order_data,
            headers=self._headers()
        )
        return response.json()

    def get_user_orders(self, phone):
        response = requests.get(
            f'{self.base_url}/rpc/get_user_orders',
            params={'p_user_phone': phone},
            headers=self._headers()
        )
        return response.json()

# الاستخدام
api = PalletPlatformAPI('pk_xxxxxxxxxxxxx')

order = api.create_order({
    'p_phone': '05xxxxxxxx',
    'p_pallet_type': 'euro',
    'p_quantity': 100,
    # ...
})

print('Order created:', order)
```

### cURL Examples

```bash
# إنشاء طلب
curl -X POST \
  'https://bgoevtkcakfbvxootfhu.supabase.co/rest/v1/rpc/create_order' \
  -H 'Authorization: Bearer pk_xxxxxxxxxxxxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_phone": "05xxxxxxxx",
    "p_pallet_type": "euro",
    "p_quantity": 100
  }'

# الحصول على الطلبات
curl -X GET \
  'https://bgoevtkcakfbvxootfhu.supabase.co/rest/v1/rpc/get_user_orders?p_user_phone=05xxxxxxxx' \
  -H 'Authorization: Bearer pk_xxxxxxxxxxxxx'
```

---

## 📊 مراقبة الاستخدام

### إحصائيات API

```typescript
const { usageStats } = useAPIIntegration(userPhone);

console.log(usageStats);
// {
//   total_requests: 1250,
//   successful_requests: 1200,
//   failed_requests: 50,
//   avg_response_time_ms: 150
// }
```

### سجل الطلبات

```typescript
const { data } = await supabase
  .from('api_requests_log')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100);
```

---

## 🛡️ أفضل الممارسات

### الأمان

1. **احفظ المفتاح بأمان**: لا تشارك مفتاح API أبداً في الكود العام
2. **استخدم HTTPS**: تأكد من استخدام HTTPS في جميع الطلبات
3. **قم بتدوير المفاتيح**: قم بتغيير المفاتيح بانتظام
4. **استخدم صلاحيات محدودة**: امنح أقل الصلاحيات المطلوبة فقط

### الأداء

1. **استخدم Pagination**: للبيانات الكبيرة
2. **Cache الردود**: قم بتخزين الردود مؤقتاً عند الإمكان
3. **راقب Rate Limits**: تابع حدودك لتجنب التوقف

### معالجة الأخطاء

```javascript
async function safeAPICall(apiFunction) {
  try {
    const result = await apiFunction();
    return { success: true, data: result };
  } catch (error) {
    if (error.status === 429) {
      // Rate limit exceeded
      return { success: false, error: 'تجاوز الحد الأقصى للطلبات' };
    } else if (error.status === 401) {
      // Authentication failed
      return { success: false, error: 'فشل التحقق من الهوية' };
    } else {
      return { success: false, error: error.message };
    }
  }
}
```

---

## 🆘 الدعم

للحصول على المساعدة:

1. **التوثيق**: راجع هذا الدليل
2. **الدعم الفني**: افتح تذكرة دعم من داخل المنصة
3. **البريد الإلكتروني**: support@pallet-platform.com

---

## 📚 الموارد الإضافية

- [دليل البدء السريع](./QUICK_START.md)
- [دليل التحسينات](./ENHANCEMENTS_GUIDE.md)
- [دليل النظام](./PLATFORM_GUIDE.md)

---

تم التحديث: 2026-03-08
الإصدار: 2.0.0
