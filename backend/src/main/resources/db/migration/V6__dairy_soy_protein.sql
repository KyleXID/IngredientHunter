-- 2026-09-10 회의: 유당불내증을 "유당"만 필터링하던 것을 유제품 단백(유청·산양유·우유·카제인)과
-- 대두단백까지 확장. 우유알레르기·대두알레르기 대상도 함께 매핑.
-- 근거: 식약처 「식품등의 표시기준」 알레르기 유발물질 표시대상(우유·대두), Shaukat 2010(유당불내증).
-- applies_to 는 AnalyzeService.conditionOfApplies 에서 건강설문 code(milk_allergy·soy_allergy·lactose)로 매핑.

insert into ingredient (name, category, aliases) values
    ('유청단백질',     '유단백',   '농축유청단백·분리유청단백·유청·유청분말·유청농축단백·WPC·WPI'),
    ('산양유',         '유단백',   '산양유청·산양유단백·산양분유'),
    ('우유',           '유단백',   '전지분유·탈지분유·분유·우유농축단백·우유단백'),
    ('카제인',         '유단백',   '카제인나트륨·카제인칼슘·카세인'),
    ('분리대두단백',   '식물단백', '대두단백·농축대두단백·분리대두단백질·대두단백질');

insert into ingredient_rule
    (ingredient_id, applies_to, intake, side_effect, base_amount, source, source_url, source_tier, effect_level, diet_effect)
values
    ((select id from ingredient where name='유청단백질'), '우유알레르기', '1회성', '우유 단백 알레르기 반응(두드러기·호흡곤란 등)', '전량 회피',
     '식약처 「식품등의 표시기준」 알레르기 유발물질(우유)', 'https://www.foodsafetykorea.go.kr', 'T1', '유해', null),
    ((select id from ingredient where name='유청단백질'), '유당불내증', '1회성', '농축유청단백의 잔여 유당으로 장트러블 가능(분리유청단백은 유당 거의 없음)', '제품별 상이 — 농축(WPC) > 분리(WPI)',
     'Shaukat A. et al. Ann Intern Med 2010', 'https://www.acpjournals.org/doi/10.7326/0003-4819-152-12-201006150-00241', 'T3', '주의', null),
    ((select id from ingredient where name='산양유'), '우유알레르기', '1회성', '우유 단백과 교차반응 가능', '개인별 상이 — 회피 권고',
     '식약처 「식품등의 표시기준」 알레르기 유발물질(우유) / 우유-산양유 교차반응', 'https://www.foodsafetykorea.go.kr', 'T2', '유해', null),
    ((select id from ingredient where name='산양유'), '유당불내증', '1회성', '유당 함유로 장트러블 가능', '단회 12g 초과 기준 준용',
     'Shaukat A. et al. Ann Intern Med 2010', 'https://www.acpjournals.org/doi/10.7326/0003-4819-152-12-201006150-00241', 'T3', '주의', null),
    ((select id from ingredient where name='우유'), '우유알레르기', '1회성', '우유 단백 알레르기 반응', '전량 회피',
     '식약처 「식품등의 표시기준」 알레르기 유발물질(우유)', 'https://www.foodsafetykorea.go.kr', 'T1', '유해', null),
    ((select id from ingredient where name='우유'), '유당불내증', '1회성', '유당 함유로 장트러블 가능', '단회 12g 초과 기준 준용',
     'Shaukat A. et al. Ann Intern Med 2010', 'https://www.acpjournals.org/doi/10.7326/0003-4819-152-12-201006150-00241', 'T3', '주의', null),
    ((select id from ingredient where name='카제인'), '우유알레르기', '1회성', '우유 단백(카제인) 알레르기 반응', '전량 회피',
     '식약처 「식품등의 표시기준」 알레르기 유발물질(우유)', 'https://www.foodsafetykorea.go.kr', 'T1', '유해', null),
    ((select id from ingredient where name='분리대두단백'), '대두알레르기', '1회성', '대두 단백 알레르기 반응', '전량 회피',
     '식약처 「식품등의 표시기준」 알레르기 유발물질(대두)', 'https://www.foodsafetykorea.go.kr', 'T1', '유해', null);
