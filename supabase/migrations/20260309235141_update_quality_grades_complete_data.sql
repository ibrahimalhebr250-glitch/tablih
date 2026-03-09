/*
  # Update Quality Grades with Complete Standard Data

  Updates all existing quality grades with proper industry-standard descriptions,
  accurate color schemes, and correct sort orders. Also fixes Grade C English name.

  Grades covered:
  - Grade A: Premium/Excellent (industry standard green)
  - Grade B: Good/Used-light (blue)
  - Grade C: Acceptable/Used (amber/orange)
  - Scrap: For recycling/disposal (gray)
*/

UPDATE quality_grades_master SET
  name_ar = 'درجة أولى - ممتازة',
  name_en = 'Grade A - Premium',
  description_ar = 'طبلية ممتازة — جديدة أو لا تكاد تُستخدم، بدون كسور أو شقوق، تحمل كامل بلا قيود',
  color_hex = '#16A34A',
  badge_color = '#16A34A',
  bg_color = '#F0FDF4',
  border_color = '#16A34A',
  sort_order = 1,
  updated_at = now()
WHERE code = 'A';

UPDATE quality_grades_master SET
  name_ar = 'درجة ثانية - جيدة',
  name_en = 'Grade B - Good',
  description_ar = 'طبلية مستعملة بحالة جيدة — آثار استخدام خفيفة، هيكل سليم، تصلح للاستخدام العادي',
  color_hex = '#2563EB',
  badge_color = '#2563EB',
  bg_color = '#EFF6FF',
  border_color = '#2563EB',
  sort_order = 2,
  updated_at = now()
WHERE code = 'B';

UPDATE quality_grades_master SET
  name_ar = 'درجة ثالثة - مقبولة',
  name_en = 'Grade C - Acceptable',
  description_ar = 'طبلية مستعملة بحالة مقبولة — بها تلف بسيط أو إصلاحات، تصلح للاستخدام المحدود',
  color_hex = '#D97706',
  badge_color = '#D97706',
  bg_color = '#FFFBEB',
  border_color = '#D97706',
  sort_order = 3,
  updated_at = now()
WHERE code = 'C';

UPDATE quality_grades_master SET
  name_ar = 'خردة - إعادة تدوير',
  name_en = 'Scrap - Recycling',
  description_ar = 'طبلية تالفة للتخلص منها أو إعادة تدويرها — غير صالحة للاستخدام المعتاد',
  color_hex = '#6B7280',
  badge_color = '#6B7280',
  bg_color = '#F9FAFB',
  border_color = '#D1D5DB',
  sort_order = 4,
  updated_at = now()
WHERE code = 'Scrap';
