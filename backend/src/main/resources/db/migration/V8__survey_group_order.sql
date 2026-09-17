-- 건강설문 그룹 노출 순서 변경 (UX QA 반영)
--   생애주기 → 알레르기 → 질환·체질
-- HealthSurveyController 는 display_order 오름차순으로 읽어 category 가 처음 등장한
-- 순서대로 그룹을 만든다. 따라서 그룹 순서는 이 컬럼으로만 정해진다.
-- 스키마 변경 없음 — 표시 순서 데이터만 재부여한다.

update health_survey set display_order = 1  where code = 'children';
update health_survey set display_order = 2  where code = 'pregnant';

update health_survey set display_order = 3  where code = 'milk_allergy';
update health_survey set display_order = 4  where code = 'soy_allergy';

update health_survey set display_order = 5  where code = 'diabetes';
update health_survey set display_order = 6  where code = 'hypertension';
update health_survey set display_order = 7  where code = 'kidney';
update health_survey set display_order = 8  where code = 'asthma';
update health_survey set display_order = 9  where code = 'pku';
update health_survey set display_order = 10 where code = 'galactose';
update health_survey set display_order = 11 where code = 'lactose';
update health_survey set display_order = 12 where code = 'caffeine';
