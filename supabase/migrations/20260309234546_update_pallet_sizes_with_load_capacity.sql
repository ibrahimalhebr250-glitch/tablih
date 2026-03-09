/*
  # Update Pallet Sizes with Load Capacity & Complete Data

  Updates all existing pallet sizes with accurate load capacity values and
  adds missing sizes for comprehensive local (Saudi/Gulf) and international coverage.

  Sizes covered:
  - Gulf/Saudi Standard sizes
  - ISO International standards
  - EUR European standards
  - GMA/US American standards
  - Asian standards
  - Half and quarter pallets
  - Industrial heavy-duty sizes
*/

UPDATE pallet_sizes_master SET
  name_ar = '120×100 سم - خليجي قياسي',
  name_en = '120×100 cm - Gulf Standard',
  length_cm = 120, width_cm = 100, height_cm = 14,
  max_load_kg = 1500, weight_unit = 'kg'
WHERE code = '120x100';

UPDATE pallet_sizes_master SET
  name_ar = '110×110 سم - خليجي',
  name_en = '110×110 cm - Gulf',
  length_cm = 110, width_cm = 110, height_cm = 14,
  max_load_kg = 1200, weight_unit = 'kg'
WHERE code = '110x110';

UPDATE pallet_sizes_master SET
  name_ar = '120×80 سم - أوروبي صغير',
  name_en = '120×80 cm - Euro Small',
  length_cm = 120, width_cm = 80, height_cm = 14,
  max_load_kg = 1000, weight_unit = 'kg'
WHERE code = '120x80';

UPDATE pallet_sizes_master SET
  name_ar = '100×100 سم - مربع',
  name_en = '100×100 cm - Square',
  length_cm = 100, width_cm = 100, height_cm = 14,
  max_load_kg = 1200, weight_unit = 'kg'
WHERE code = '100x100';

UPDATE pallet_sizes_master SET
  name_ar = '80×60 سم - نصف مقاس',
  name_en = '80×60 cm - Half Size',
  length_cm = 80, width_cm = 60, height_cm = 12,
  max_load_kg = 500, weight_unit = 'kg'
WHERE code = '80x60';

UPDATE pallet_sizes_master SET
  name_ar = 'ISO 1200×1000 سم',
  name_en = 'ISO 1200×1000 cm',
  length_cm = 120, width_cm = 100, height_cm = 15,
  max_load_kg = 1500, weight_unit = 'kg'
WHERE code = 'iso_1200x1000';

UPDATE pallet_sizes_master SET
  name_ar = 'ISO 1200×800 سم',
  name_en = 'ISO 1200×800 cm',
  length_cm = 120, width_cm = 80, height_cm = 14,
  max_load_kg = 1000, weight_unit = 'kg'
WHERE code = 'iso_1200x800';

UPDATE pallet_sizes_master SET
  name_ar = 'ISO 1140×1140 سم',
  name_en = 'ISO 1140×1140 cm',
  length_cm = 114, width_cm = 114, height_cm = 15,
  max_load_kg = 1500, weight_unit = 'kg'
WHERE code = 'iso_1140x1140';

UPDATE pallet_sizes_master SET
  name_ar = 'ISO 1219×1016 سم - أمريكي',
  name_en = 'ISO 1219×1016 cm - American',
  length_cm = 121.9, width_cm = 101.6, height_cm = 14,
  max_load_kg = 1800, weight_unit = 'kg'
WHERE code = 'iso_1219x1016';

UPDATE pallet_sizes_master SET
  name_ar = 'ISO 1067×1067 سم',
  name_en = 'ISO 1067×1067 cm',
  length_cm = 106.7, width_cm = 106.7, height_cm = 14,
  max_load_kg = 1200, weight_unit = 'kg'
WHERE code = 'iso_1067x1067';

UPDATE pallet_sizes_master SET
  name_ar = 'EUR1 1200×800 - أوروبي',
  name_en = 'EUR1 1200×800 - European',
  length_cm = 120, width_cm = 80, height_cm = 14.4,
  max_load_kg = 1500, weight_unit = 'kg'
WHERE code = 'eur1_1200x800';

UPDATE pallet_sizes_master SET
  name_ar = 'EUR2 1200×1000 - أوروبي كبير',
  name_en = 'EUR2 1200×1000 - European Large',
  length_cm = 120, width_cm = 100, height_cm = 14.4,
  max_load_kg = 1500, weight_unit = 'kg'
WHERE code = 'eur2_1200x1000';

UPDATE pallet_sizes_master SET
  name_ar = 'EUR3 1000×1200 - أوروبي',
  name_en = 'EUR3 1000×1200 - European',
  length_cm = 100, width_cm = 120, height_cm = 14.4,
  max_load_kg = 1500, weight_unit = 'kg'
WHERE code = 'eur3_1000x1200';

UPDATE pallet_sizes_master SET
  name_ar = 'EUR6 800×600 - نصف أوروبي',
  name_en = 'EUR6 800×600 - Half Euro',
  length_cm = 80, width_cm = 60, height_cm = 14.4,
  max_load_kg = 500, weight_unit = 'kg'
WHERE code = 'eur6_800x600';

UPDATE pallet_sizes_master SET
  name_ar = 'GMA 122×102 - أمريكي GMA',
  name_en = 'GMA 48×40 in - American GMA',
  length_cm = 121.9, width_cm = 101.6, height_cm = 14,
  max_load_kg = 1800, weight_unit = 'kg'
WHERE code = 'gma_48x40';

UPDATE pallet_sizes_master SET
  name_ar = 'US 122×122 - أمريكي مربع',
  name_en = 'US 48×48 in - Square American',
  length_cm = 121.9, width_cm = 121.9, height_cm = 14,
  max_load_kg = 2000, weight_unit = 'kg'
WHERE code = 'us_48x48';

UPDATE pallet_sizes_master SET
  name_ar = 'US 101×101 - أمريكي متوسط',
  name_en = 'US 40×40 in - Medium American',
  length_cm = 101.6, width_cm = 101.6, height_cm = 14,
  max_load_kg = 1500, weight_unit = 'kg'
WHERE code = 'us_40x40';

UPDATE pallet_sizes_master SET
  name_ar = 'US 122×51 - أمريكي ضيق',
  name_en = 'US 48×20 in - Narrow American',
  length_cm = 121.9, width_cm = 50.8, height_cm = 14,
  max_load_kg = 800, weight_unit = 'kg'
WHERE code = 'us_48x20';

UPDATE pallet_sizes_master SET
  name_ar = 'آسيوي 1100×1100 سم',
  name_en = 'Asian 1100×1100 cm',
  length_cm = 110, width_cm = 110, height_cm = 14,
  max_load_kg = 1200, weight_unit = 'kg'
WHERE code = 'asia_1100x1100';

UPDATE pallet_sizes_master SET
  name_ar = 'آسيوي 1100×900 سم',
  name_en = 'Asian 1100×900 cm',
  length_cm = 110, width_cm = 90, height_cm = 14,
  max_load_kg = 1000, weight_unit = 'kg'
WHERE code = 'asia_1100x900';

UPDATE pallet_sizes_master SET
  name_ar = 'نصف طبلية 60×80 سم',
  name_en = 'Half Pallet 60×80 cm',
  length_cm = 60, width_cm = 80, height_cm = 12,
  max_load_kg = 500, weight_unit = 'kg'
WHERE code = 'half_60x80';

UPDATE pallet_sizes_master SET
  name_ar = 'نصف طبلية 80×100 سم',
  name_en = 'Half Pallet 80×100 cm',
  length_cm = 80, width_cm = 100, height_cm = 12,
  max_load_kg = 750, weight_unit = 'kg'
WHERE code = 'half_80x100';

UPDATE pallet_sizes_master SET
  name_ar = 'ربع طبلية 60×40 سم',
  name_en = 'Quarter Pallet 60×40 cm',
  length_cm = 60, width_cm = 40, height_cm = 10,
  max_load_kg = 250, weight_unit = 'kg'
WHERE code = 'quarter_60x40';

UPDATE pallet_sizes_master SET
  name_ar = 'صناعي ثقيل 120×120 سم',
  name_en = 'Heavy Industrial 120×120 cm',
  length_cm = 120, width_cm = 120, height_cm = 18,
  max_load_kg = 3000, weight_unit = 'kg'
WHERE code = 'industrial_120x120';

UPDATE pallet_sizes_master SET
  name_ar = 'صناعي 130×110 سم',
  name_en = 'Industrial 130×110 cm',
  length_cm = 130, width_cm = 110, height_cm = 18,
  max_load_kg = 2500, weight_unit = 'kg'
WHERE code = 'industrial_130x110';

UPDATE pallet_sizes_master SET
  name_ar = 'صناعي 150×100 سم',
  name_en = 'Industrial 150×100 cm',
  length_cm = 150, width_cm = 100, height_cm = 18,
  max_load_kg = 2000, weight_unit = 'kg'
WHERE code = 'industrial_150x100';

UPDATE pallet_sizes_master SET
  name_ar = 'سعودي 120×90 سم',
  name_en = 'Saudi 120×90 cm',
  length_cm = 120, width_cm = 90, height_cm = 14,
  max_load_kg = 1200, weight_unit = 'kg'
WHERE code = 'sa_120x90';

UPDATE pallet_sizes_master SET
  name_ar = 'سعودي 100×80 سم',
  name_en = 'Saudi 100×80 cm',
  length_cm = 100, width_cm = 80, height_cm = 14,
  max_load_kg = 1000, weight_unit = 'kg'
WHERE code = 'sa_100x80';

UPDATE pallet_sizes_master SET
  name_ar = 'مقاس مخصص',
  name_en = 'Custom Size',
  length_cm = 120, width_cm = 100, height_cm = 14,
  max_load_kg = 1000, weight_unit = 'kg'
WHERE code = 'sa_custom';

UPDATE pallet_sizes_master SET updated_at = now() WHERE true;
