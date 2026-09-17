-- 건강설문 그룹 재편 (위키 healthCondition DB와 동기화)
--   생애주기 (2) → 알레르기·체질 (4) → 질환 (6)
-- 바뀌는 것은 category·display_order 뿐이다. label·description(UX 라이팅)은 별도 단계에서 다룬다.
--
-- 이동: 유당불내증·카페인 민감 이 질환·체질 → 알레르기·체질 로 옮겨간다.
-- 이름: 알레르기 → 알레르기·체질, 질환·체질 → 질환.
-- category 는 화면 그룹 이름으로 그대로 노출되고, 프론트의 단일 선택 그룹(생애주기)은 바뀌지 않는다.
-- ingredient_rule.applies_to ↔ health_survey.code 매핑(AnalyzeService.conditionOfApplies)은 영향 없다.

update health_survey set category = '생애주기',     display_order = 1  where code = 'children';
update health_survey set category = '생애주기',     display_order = 2  where code = 'pregnant';

update health_survey set category = '알레르기·체질', display_order = 3  where code = 'lactose';
update health_survey set category = '알레르기·체질', display_order = 4  where code = 'caffeine';
update health_survey set category = '알레르기·체질', display_order = 5  where code = 'milk_allergy';
update health_survey set category = '알레르기·체질', display_order = 6  where code = 'soy_allergy';

update health_survey set category = '질환',         display_order = 7  where code = 'diabetes';
update health_survey set category = '질환',         display_order = 8  where code = 'hypertension';
update health_survey set category = '질환',         display_order = 9  where code = 'kidney';
update health_survey set category = '질환',         display_order = 10 where code = 'asthma';
update health_survey set category = '질환',         display_order = 11 where code = 'pku';
update health_survey set category = '질환',         display_order = 12 where code = 'galactose';
