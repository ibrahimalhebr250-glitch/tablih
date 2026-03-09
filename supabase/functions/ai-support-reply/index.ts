import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface KnowledgeEntry {
  id: string;
  category: string;
  keywords: string[];
  answer: string;
  priority: number;
  usage_count: number;
}

interface LearnedResponse {
  id: string;
  trigger_message: string;
  normalized_trigger: string;
  learned_answer: string;
  times_seen: number;
  confidence: number;
  is_approved: boolean;
}

function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[أإآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06FF\s\w]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function computeMatchScore(normalizedMsg: string, keywords: string[]): number {
  let score = 0;
  const words = normalizedMsg.split(/\s+/);

  for (const keyword of keywords) {
    const normalizedKw = normalizeArabic(keyword);
    if (normalizedMsg.includes(normalizedKw)) {
      score += normalizedKw.length * 2;
    }
    for (const word of words) {
      if (word.length >= 3 && normalizedKw.includes(word)) {
        score += word.length;
      }
    }
  }
  return score;
}

function findBestKnowledgeMatch(
  message: string,
  knowledgeBase: KnowledgeEntry[]
): { entry: KnowledgeEntry; score: number } | null {
  const normalizedMsg = normalizeArabic(message);
  let best: { entry: KnowledgeEntry; score: number } | null = null;

  for (const entry of knowledgeBase) {
    if (!entry.keywords || entry.keywords.length === 0) continue;
    const score = computeMatchScore(normalizedMsg, entry.keywords);
    const weightedScore = score + entry.priority;

    if (score > 0 && (!best || weightedScore > best.score)) {
      best = { entry, score: weightedScore };
    }
  }
  return best;
}

function findLearnedMatch(
  message: string,
  learned: LearnedResponse[]
): LearnedResponse | null {
  const normalizedMsg = normalizeArabic(message);

  let bestMatch: { item: LearnedResponse; score: number } | null = null;

  for (const item of learned) {
    const normalizedTrigger = item.normalized_trigger || normalizeArabic(item.trigger_message);

    const triggerWords = normalizedTrigger.split(/\s+/).filter((w) => w.length >= 3);
    const msgWords = normalizedMsg.split(/\s+/).filter((w) => w.length >= 3);

    let commonWords = 0;
    for (const tw of triggerWords) {
      if (msgWords.some((mw) => mw.includes(tw) || tw.includes(mw))) {
        commonWords++;
      }
    }

    const totalWords = Math.max(triggerWords.length, msgWords.length, 1);
    const similarity = commonWords / totalWords;
    const score = similarity * item.confidence * item.times_seen;

    if (similarity >= 0.5 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { item, score };
    }
  }

  return bestMatch ? bestMatch.item : null;
}

function getFallbackResponse(platformName: string): string {
  const responses = [
    `شكراً لتواصلك مع ${platformName}.\nسيتواصل معك أحد أفراد فريق الدعم في أقرب وقت ممكن.\n\nللمساعدة الفورية، يمكنك توضيح استفسارك أكثر لنتمكن من مساعدتك بشكل أفضل.`,
    `وصلت رسالتك! فريق الدعم سيرد عليك قريباً.\n\nهل يمكنك توضيح استفسارك أكثر؟ سيساعدنا ذلك في تقديم إجابة أدق.`,
    `تم استلام رسالتك بنجاح.\nفريق دعم ${platformName} سيراجع استفسارك ويرد عليك في أقرب وقت.\n\nيمكنك أيضاً تصفح قسم المساعدة في إعدادات التطبيق.`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

async function doReply(
  supabase: ReturnType<typeof createClient>,
  user_phone: string,
  message: string,
  delaySeconds: number,
  autoReplyLabel: string,
  platformName: string,
  knowledgeBase: KnowledgeEntry[],
  learnedResponses: LearnedResponse[]
) {
  if (delaySeconds > 0) {
    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
  }

  const { data: adminReply } = await supabase
    .from("support_messages")
    .select("id")
    .eq("user_phone", user_phone)
    .eq("sender", "admin")
    .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .limit(1)
    .maybeSingle();

  if (adminReply) return;

  let aiAnswer: string | null = null;
  let matchSource: "learned" | "knowledge" | "fallback" = "fallback";
  let matchedKnowledgeId: string | null = null;

  const learnedMatch = findLearnedMatch(message, learnedResponses);
  if (learnedMatch) {
    aiAnswer = learnedMatch.learned_answer;
    matchSource = "learned";
  }

  if (!aiAnswer) {
    const knowledgeMatch = findBestKnowledgeMatch(message, knowledgeBase);
    if (knowledgeMatch) {
      aiAnswer = knowledgeMatch.entry.answer;
      matchSource = "knowledge";
      matchedKnowledgeId = knowledgeMatch.entry.id;
    }
  }

  if (!aiAnswer) {
    aiAnswer = getFallbackResponse(platformName);
    matchSource = "fallback";
  }

  const finalAnswer = `[${autoReplyLabel}]\n${aiAnswer}`;

  await supabase.from("support_messages").insert({
    user_phone,
    sender: "admin",
    message: finalAnswer,
    image_url: null,
    is_read: false,
  });

  if (matchedKnowledgeId) {
    await supabase.rpc("increment_knowledge_usage", { entry_id: matchedKnowledgeId }).catch(() => {});
  }

  await supabase.from("ai_auto_reply_logs").insert({
    user_phone,
    user_message: message,
    ai_response: finalAnswer,
    matched: matchSource !== "fallback",
    match_source: matchSource,
  });
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

    const [settingsResult, knowledgeResult, learnedResult] = await Promise.all([
      supabase.from("ai_auto_reply_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("ai_knowledge_base").select("*").eq("is_active", true).order("priority", { ascending: false }),
      supabase.from("ai_learned_responses").select("*").eq("is_approved", true).gte("confidence", 0.7).order("confidence", { ascending: false }).limit(200),
    ]);

    const settings = settingsResult.data;
    const isEnabled = settings?.is_enabled ?? false;
    const delaySeconds = Math.min(settings?.delay_seconds ?? 2, 5);
    const autoReplyLabel = settings?.auto_reply_label ?? "مساعد ذكي";
    const platformName = settings?.platform_name ?? "شبكة الطبليات الوطنية";

    if (!isEnabled) {
      return new Response(
        JSON.stringify({ success: true, replied: false, reason: "disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const knowledgeBase: KnowledgeEntry[] = (knowledgeResult.data ?? []) as KnowledgeEntry[];
    const learnedResponses: LearnedResponse[] = (learnedResult.data ?? []) as LearnedResponse[];

    EdgeRuntime.waitUntil(
      doReply(supabase, user_phone, message, delaySeconds, autoReplyLabel, platformName, knowledgeBase, learnedResponses)
    );

    return new Response(
      JSON.stringify({ success: true, queued: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
