/*
  # Seed Saudi Arabian cities data

  1. New Data
    - Insert all major Saudi cities into the `cities` table
    - All cities set to `active` status by default
    - Covers all 13 administrative regions

  2. Important Notes
    - Uses INSERT ... ON CONFLICT to avoid duplicates if run again
    - Cities are in Arabic as used throughout the platform
*/

INSERT INTO cities (name, status) VALUES
  ('الرياض', 'active'),
  ('جدة', 'active'),
  ('مكة المكرمة', 'active'),
  ('المدينة المنورة', 'active'),
  ('الدمام', 'active'),
  ('الخبر', 'active'),
  ('الظهران', 'active'),
  ('الأحساء', 'active'),
  ('القطيف', 'active'),
  ('الجبيل', 'active'),
  ('حفر الباطن', 'active'),
  ('الطائف', 'active'),
  ('تبوك', 'active'),
  ('بريدة', 'active'),
  ('عنيزة', 'active'),
  ('حائل', 'active'),
  ('أبها', 'active'),
  ('خميس مشيط', 'active'),
  ('جازان', 'active'),
  ('نجران', 'active'),
  ('الباحة', 'active'),
  ('سكاكا', 'active'),
  ('عرعر', 'active'),
  ('ينبع', 'active'),
  ('القصيم', 'active'),
  ('الخرج', 'active'),
  ('رابغ', 'active'),
  ('الزلفي', 'active'),
  ('المجمعة', 'active'),
  ('شقراء', 'active'),
  ('وادي الدواسر', 'active'),
  ('بيشة', 'active'),
  ('محايل عسير', 'active'),
  ('صبيا', 'active'),
  ('القنفذة', 'active'),
  ('رفحاء', 'active'),
  ('طريف', 'active'),
  ('دومة الجندل', 'active'),
  ('النعيرية', 'active'),
  ('رأس تنورة', 'active')
ON CONFLICT DO NOTHING;
