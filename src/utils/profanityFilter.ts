const ARABIC_PROFANITY_KEYWORDS = [
  'كلب',
  'حمار',
  'غبي',
  'احمق',
  'خنزير',
  'حقير',
  'وسخ',
  'قذر',
  'نذل',
  'لعين',
];

const SPAM_PATTERNS = [
  /\d{10,}/,
  /واتساب/i,
  /whatsapp/i,
  /تواصل معي/i,
  /للتواصل/i,
  /اتصل/i,
];

export function containsProfanity(text: string): boolean {
  if (!text) return false;

  const normalizedText = text.toLowerCase().trim();

  for (const word of ARABIC_PROFANITY_KEYWORDS) {
    if (normalizedText.includes(word)) {
      return true;
    }
  }

  return false;
}

export function containsSpam(text: string): boolean {
  if (!text) return false;

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

export function validateComment(text: string): {
  isValid: boolean;
  reason?: string;
} {
  if (!text || text.trim().length === 0) {
    return { isValid: false, reason: 'التعليق فارغ' };
  }

  if (text.length < 5) {
    return { isValid: false, reason: 'التعليق قصير جداً (الحد الأدنى 5 أحرف)' };
  }

  if (text.length > 500) {
    return { isValid: false, reason: 'التعليق طويل جداً (الحد الأقصى 500 حرف)' };
  }

  if (containsProfanity(text)) {
    return { isValid: false, reason: 'التعليق يحتوي على كلمات غير لائقة' };
  }

  if (containsSpam(text)) {
    return { isValid: false, reason: 'التعليق يحتوي على محتوى دعائي أو أرقام تواصل' };
  }

  return { isValid: true };
}