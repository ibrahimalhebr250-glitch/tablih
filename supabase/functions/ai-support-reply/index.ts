import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLATFORM_NAME = "شبكة الطبليات الوطنية";

const KNOWLEDGE_BASE = [
  {
    keywords: ["طلب", "اطلب", "ارسل طلب", "انشاء طلب", "طلبية", "اضافة طلب"],
    answer: `لإنشاء طلب شراء في ${PLATFORM_NAME}:\n1. اضغط على زر "طلب" في الشاشة الرئيسية\n2. حدد نوع الطبلية والحجم والجودة\n3. أدخل الكمية والمدينة\n4. اضغط "إرسال الطلب"\nسيقوم النظام تلقائياً بمطابقة طلبك مع أقرب المخزون المتاح.`,
  },
  {
    keywords: ["مخزون", "اضافة مخزون", "ارفع مخزون", "تسجيل طبليات", "بيع طبليات"],
    answer: `لإضافة مخزونك إلى المنصة:\n1. اضغط على "مخزون" في القائمة السفلية\n2. اضغط "إضافة دفعة جديدة"\n3. أدخل نوع الطبلية والحجم والجودة والكمية\n4. أضف صوراً ووصفاً مناسباً\n5. اضغط "نشر في السوق"\nسيظهر مخزونك للمشترين فوراً.`,
  },
  {
    keywords: ["صفقة", "صفقات", "عروض", "متابعة صفقة", "حالة الصفقة"],
    answer: `لمتابعة صفقاتك:\n1. اذهب إلى "حسابي" ثم تبويب "الصفقات"\n2. ستجد جميع صفقاتك مع حالتها:\n• قيد الانتظار: تم المطابقة وتنتظر التأكيد\n• جاري التسليم: تم تأكيد الصفقة وجاري التنفيذ\n• مكتملة: تمت الصفقة بنجاح\nيمكنك تأكيد أو رفض الصفقة من نفس الصفحة.`,
  },
  {
    keywords: ["تسليم", "استلام", "التسليم", "وصل", "تأكيد استلام"],
    answer: `لتأكيد استلام طلبك:\n1. اذهب إلى "حسابي" > "الصفقات"\n2. ابحث عن الصفقة في حالة "جاري التسليم"\n3. اضغط "تأكيد الاستلام"\nملاحظة: بعد تأكيدك ستكتمل الصفقة وتُحتسب العمولة.`,
  },
  {
    keywords: ["عمولة", "رسوم", "نسبة", "سعر", "تكلفة", "كم العمولة"],
    answer: `نظام العمولة في ${PLATFORM_NAME}:\n• تُحتسب العمولة عند اكتمال الصفقة فقط\n• النسبة تعتمد على حجم الصفقة وإعدادات المنصة\n• يمكنك الاطلاع على تفاصيل العمولة في صفحة "حسابي" > "إعدادات"`,
  },
  {
    keywords: ["تسجيل", "حساب جديد", "انشاء حساب", "دخول", "تسجيل دخول", "رقم الهاتف"],
    answer: `للتسجيل في ${PLATFORM_NAME}:\n1. أدخل رقم هاتفك\n2. أنشئ رمز PIN من 4 أرقام\n3. اختر نوع حسابك (مورد أو مشتري)\nللدخول لاحقاً: أدخل رقم هاتفك ورمز PIN.`,
  },
  {
    keywords: ["المخزون السحابي", "مخزون سحابي", "مستودع", "طبليات اشتريتها"],
    answer: `المخزون السحابي هو مخزونك الذي اشتريته عبر المنصة.\nيمكنك:\n• عرض كميات طبلياتك المشتراة\n• سحب الكميات عند الحاجة\n• متابعة تاريخ الشراء والتكلفة\nللوصول: اذهب إلى "حسابي" > "المخزون السحابي"`,
  },
  {
    keywords: ["مشكلة", "خلل", "لا يعمل", "عطل", "خطأ", "error", "لا اقدر"],
    answer: `نأسف لمواجهتك هذه المشكلة!\nللمساعدة السريعة يرجى توضيح:\n1. ما الصفحة أو الخطوة التي تواجه فيها المشكلة؟\n2. ما الرسالة التي تظهر لك (إن وجدت)؟\nسيتواصل معك أحد أفراد فريق الدعم قريباً.`,
  },
  {
    keywords: ["السوق", "سوق", "عرض في السوق", "نشر", "الطبليات المعروضة"],
    answer: `السوق في ${PLATFORM_NAME} يعرض جميع طبليات الموردين المتاحة.\nيمكنك:\n• البحث والتصفية حسب النوع والحجم والجودة والمدينة\n• الاطلاع على تفاصيل كل دفعة\n• طلب التفاوض مباشرة مع المورد\n• الطلب مباشرة من الدفعة المعروضة`,
  },
  {
    keywords: ["تقييم", "تقييمات", "تقيم", "تقييم المورد", "موثوقية"],
    answer: `نظام التقييم في ${PLATFORM_NAME}:\n• يمكنك تقييم الموردين بعد اكتمال الصفقة\n• التقييم من 1 إلى 5 نجوم\n• يظهر متوسط التقييم في صفحة المورد\n• نظام الثقة يساعدك على اختيار أفضل الموردين`,
  },
  {
    keywords: ["اقتراح", "اقتراحات", "تحسين", "ارسل اقتراح"],
    answer: `نقدر اقتراحاتك لتطوير ${PLATFORM_NAME}!\nلإرسال اقتراحك:\nاذهب إلى "حسابي" > "الإعدادات" > "اقتراحات وتحسينات"\nاكتب اقتراحك وسيصل مباشرة لفريق التطوير.`,
  },
  {
    keywords: ["واتساب", "تواصل", "رقم التواصل", "كيف اتواصل"],
    answer: `يمكنك التواصل معنا عبر:\n• هذه الدردشة مباشرة (سيرد فريق الدعم قريباً)\n• واتساب: يمكن للمشرف إرسال رابط واتساب من صفحة المحادثة\nنحن هنا للمساعدة!`,
  },
  {
    keywords: ["مدينة", "مدن", "الرياض", "جدة", "الدمام", "مكة"],
    answer: `${PLATFORM_NAME} تغطي المدن الرئيسية في المملكة العربية السعودية.\nيمكنك تحديد مدينتك عند إنشاء الطلب أو رفع المخزون.\nللاطلاع على المدن المتاحة: ابحث في سوق الطبليات وستجد قائمة بجميع المدن.`,
  },
];

function findBestAnswer(message: string): string | null {
  const normalizedMsg = message
    .toLowerCase()
    .replace(/[أإآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06FF\s\w]/g, " ");

  let bestMatch: { score: number; answer: string } | null = null;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const normalizedKeyword = keyword
        .toLowerCase()
        .replace(/[أإآا]/g, "ا")
        .replace(/[ىي]/g, "ي")
        .replace(/ة/g, "ه");

      if (normalizedMsg.includes(normalizedKeyword)) {
        score += normalizedKeyword.length;
      }
    }
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { score, answer: entry.answer };
    }
  }

  return bestMatch ? bestMatch.answer : null;
}

function getFallbackResponse(): string {
  const responses = [
    `شكراً لتواصلك مع ${PLATFORM_NAME}.\nسيتواصل معك أحد أفراد فريق الدعم في أقرب وقت ممكن.\n\nللمساعدة الفورية، يمكنك توضيح استفسارك أكثر أو تصفح الأسئلة الشائعة في الإعدادات.`,
    `وصلت رسالتك! فريق الدعم سيرد عليك قريباً.\n\nهل يمكنك توضيح استفسارك أكثر لنتمكن من مساعدتك بشكل أفضل؟`,
    `تم استلام رسالتك.\nفريق دعم ${PLATFORM_NAME} سيراجع استفسارك ويرد عليك في أقرب وقت.`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_phone, message } = body;

    if (!user_phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from("ai_auto_reply_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const isEnabled = settings?.is_enabled ?? false;
    const delaySeconds = settings?.delay_seconds ?? 3;
    const autoReplyLabel = settings?.auto_reply_label ?? "مساعد ذكي";

    if (!isEnabled) {
      return new Response(
        JSON.stringify({ success: true, replied: false, reason: "AI auto-reply is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: recentAdminMsg } = await supabase
      .from("support_messages")
      .select("id")
      .eq("user_phone", user_phone)
      .eq("sender", "admin")
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();

    if (recentAdminMsg) {
      return new Response(
        JSON.stringify({ success: true, replied: false, reason: "Recent admin reply exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));

    const { data: laterMsg } = await supabase
      .from("support_messages")
      .select("id")
      .eq("user_phone", user_phone)
      .eq("sender", "admin")
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();

    if (laterMsg) {
      return new Response(
        JSON.stringify({ success: true, replied: false, reason: "Admin replied in the meantime" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiAnswer = findBestAnswer(message) ?? getFallbackResponse();
    const finalAnswer = `[${autoReplyLabel}]\n${aiAnswer}`;

    const { error: insertError } = await supabase
      .from("support_messages")
      .insert({
        user_phone,
        sender: "admin",
        message: finalAnswer,
        image_url: null,
        is_read: false,
      });

    if (insertError) {
      throw new Error(insertError.message);
    }

    await supabase
      .from("ai_auto_reply_logs")
      .insert({
        user_phone,
        user_message: message,
        ai_response: finalAnswer,
        matched: findBestAnswer(message) !== null,
      });

    return new Response(
      JSON.stringify({ success: true, replied: true, answer: finalAnswer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
