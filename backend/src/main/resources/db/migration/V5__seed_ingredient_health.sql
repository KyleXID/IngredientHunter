-- 성분·건강설문 시드 — Confluence DB(제로음료 유해성분 판독기)의 ingredient·healthCondition 미러.
--   ingredient DB     : https://zerodrink.atlassian.net/wiki/spaces/MFS/database/3866645
--   healthCondition DB: https://zerodrink.atlassian.net/wiki/spaces/MFS/database/6127650
-- Confluence가 원천(source of truth). 편집 시 재적재 잡은 후속(지금은 1회 시드).

-- ── 건강설문 마스터 (12행) : 화면 CONDITION_GROUPS 와 1:1 ──
insert into health_survey (code, category, label, description, display_order) values
    ('children',     '생애주기',  '영유아·어린이·청소년', '성장기에 조심할 성분',        1),
    ('pregnant',     '생애주기',  '임신 중·수유 중',      '태아·모유에 영향을 주는 성분', 2),
    ('diabetes',     '질환·체질', '당뇨병',               '혈당에 영향을 주는 성분',      3),
    ('hypertension', '질환·체질', '고혈압',               '나트륨·혈압 관련 성분',        4),
    ('kidney',       '질환·체질', '신장질환',             '신장에 부담을 주는 성분',      5),
    ('asthma',       '질환·체질', '천식(아황산염 민감)',  '아황산염 계열 성분',           6),
    ('pku',          '질환·체질', 'PKU(페닐케톤뇨증)',    '페닐알라닌이 든 성분',         7),
    ('galactose',    '질환·체질', '갈락토스혈증',         '갈락토스 관련 성분',           8),
    ('lactose',      '질환·체질', '유당불내증',           '유당·유제품 성분',             9),
    ('caffeine',     '질환·체질', '카페인 민감',          '카페인과 비슷한 성분',        10),
    ('milk_allergy', '알레르기',  '우유 알레르기',        '우유 단백질 성분',            11),
    ('soy_allergy',  '알레르기',  '대두 알레르기',        '대두·콩 관련 성분',           12);

-- ── 성분 마스터 (14종) ──
insert into ingredient (name, category) values
    ('설탕(수크로스)',              '당류'),
    ('액상과당(고과당옥수수시럽)',  '당류'),
    ('과당(프럭토스)',              '당류'),
    ('포도당(덱스트로스)',          '당류'),
    ('유당(락토스)',                '당류'),
    ('아스파탐',                    '대체당-비당류감미료'),
    ('수크랄로스',                  '대체당-비당류감미료'),
    ('아세설팜칼륨',                '대체당-비당류감미료'),
    ('사카린(사카린나트륨)',        '대체당-비당류감미료'),
    ('네오탐',                      '대체당-비당류감미료'),
    ('스테비올배당체',              '대체당-비당류감미료'),
    ('아드반탐',                    '대체당-비당류감미료'),
    ('효소처리스테비아',            '대체당-비당류감미료'),
    ('나한과추출물(몽크프루트)',    '대체당-비당류감미료');

-- ── 성분 판정 룰 (17행, 성분 1:N) ──
--    컬럼: applies_to, intake, side_effect, base_amount, source, source_url, source_tier, effect_level, diet_effect
insert into ingredient_rule
    (ingredient_id, applies_to, intake, side_effect, base_amount, source, source_url, source_tier, effect_level, diet_effect)
values
    ((select id from ingredient where name='설탕(수크로스)'), '모든 사람', '지속', '체중증가·비만',
     '유리당 총열량의 10% 미만 권고(2000kcal 기준 약 50g)',
     'WHO Guideline: Sugars intake for adults and children (2015)', 'https://www.who.int/publications/i/item/9789241549028', 'T1', '주의', '역효과'),
    ((select id from ingredient where name='설탕(수크로스)'), '모든 사람', '지속', '충치',
     '정량 역치 없음 — 하루 중 섭취 빈도가 결정',
     'WHO Guideline: Sugars intake for adults and children (2015)', 'https://www.who.int/publications/i/item/9789241549028', 'T1', '주의', '역효과'),
    ((select id from ingredient where name='설탕(수크로스)'), '당뇨병 환자', '1회성', '혈당 급상승',
     '개인별 상이',
     'WHO Guideline: Sugars intake for adults and children (2015)', 'https://www.who.int/publications/i/item/9789241549028', 'T1', '유해', '역효과'),
    ((select id from ingredient where name='액상과당(고과당옥수수시럽)'), '모든 사람', '지속', '체중증가·비만',
     '유리당으로 합산해 총열량의 10% 미만',
     'WHO Guideline: Sugars intake for adults and children (2015)', 'https://www.who.int/publications/i/item/9789241549028', 'T1', '주의', '역효과'),
    ((select id from ingredient where name='과당(프럭토스)'), '모든 사람', '지속', '체중증가·비만',
     '유리당으로 합산해 총열량의 10% 미만',
     'WHO Guideline: Sugars intake for adults and children (2015)', 'https://www.who.int/publications/i/item/9789241549028', 'T1', '주의', '역효과'),
    ((select id from ingredient where name='포도당(덱스트로스)'), '당뇨병 환자', '1회성', '혈당 급상승',
     '개인별 상이',
     'WHO Guideline: Sugars intake for adults and children (2015)', 'https://www.who.int/publications/i/item/9789241549028', 'T1', '유해', null),
    ((select id from ingredient where name='유당(락토스)'), '유당불내증', '1회성', '장트러블·설사·복통·가스',
     '단회 12g 초과(다른 음식과 함께면 15~18g까지 내성)',
     'Shaukat A. et al. Ann Intern Med 2010', 'https://www.acpjournals.org/doi/10.7326/0003-4819-152-12-201006150-00241', 'T3', '주의', null),
    ((select id from ingredient where name='유당(락토스)'), '갈락토스혈증 환자', '1회성', '갈락토스 축적·장기손상',
     '전량 회피',
     'Shaukat A. et al. Ann Intern Med 2010', 'https://www.acpjournals.org/doi/10.7326/0003-4819-152-12-201006150-00241', 'T3', '유해', null),
    ((select id from ingredient where name='아스파탐'), '모든 사람', '지속', '없음',
     '용량 무관 — 체중조절 목적 사용 자체를 권고하지 않음(조건부 권고)',
     'WHO advises not to use non-sugar sweeteners for weight control (2023)', 'https://www.who.int/news/item/15-05-2023-who-advises-not-to-use-non-sugar-sweeteners-for-weight-control-in-newly-released-guideline', 'T1', '안전', '없음'),
    ((select id from ingredient where name='수크랄로스'), '모든 사람', '지속', '없음',
     '용량 무관 — 체중조절 목적 사용 자체를 권고하지 않음(조건부 권고)',
     'WHO advises not to use non-sugar sweeteners for weight control (2023)', 'https://www.who.int/news/item/15-05-2023-who-advises-not-to-use-non-sugar-sweeteners-for-weight-control-in-newly-released-guideline', 'T1', '안전', '없음'),
    ((select id from ingredient where name='아세설팜칼륨'), '모든 사람', '지속', '없음',
     'ADI 15 mg/kg 체중/일 (60kg 기준 900mg) / 체중조절 효과는 용량 무관하게 권고되지 않음',
     'EFSA Re-evaluation of acesulfame K (E 950) / WHO NSS guideline (2023)', 'https://www.efsa.europa.eu/en/topics/topic/sweeteners', 'T1', '안전', '없음'),
    ((select id from ingredient where name='사카린(사카린나트륨)'), '모든 사람', '지속', '없음',
     'ADI 9 mg/kg 체중/일 (60kg 기준 540mg) / 체중조절 효과는 용량 무관하게 권고되지 않음',
     'EFSA Re-evaluation of saccharins (E 954) / WHO NSS guideline (2023)', 'https://www.efsa.europa.eu/en/topics/topic/sweeteners', 'T1', '안전', '없음'),
    ((select id from ingredient where name='네오탐'), '모든 사람', '지속', '없음',
     '국내 허용 감미료이나 시장 사용 0건(7,056개 조사)',
     'EFSA Re-evaluation of neotame (E 961) / WHO NSS guideline (2023)', 'https://www.efsa.europa.eu/en/topics/topic/sweeteners', 'T1', '안전', '없음'),
    ((select id from ingredient where name='스테비올배당체'), '모든 사람', '지속', '없음',
     'ADI 4 mg/kg 체중/일(스테비올 당량, 60kg 기준 240mg) / 체중조절 효과는 용량 무관하게 권고되지 않음',
     'EFSA Safety of steviol glycosides (E 960) / JECFA / WHO NSS (2023)', 'https://www.efsa.europa.eu/en/topics/topic/sweeteners', 'T1', '안전', '없음'),
    ((select id from ingredient where name='아드반탐'), '모든 사람', '지속', '없음',
     '국내 허용 감미료이나 시장 사용 0건(7,056개 조사)',
     'EFSA Scientific Opinion on advantame (E 969), EFSA Journal 2013;11(7):3301 / WHO NSS (2023)', 'https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2013.3301', 'T1', '안전', '없음'),
    ((select id from ingredient where name='효소처리스테비아'), '모든 사람', '지속', '없음',
     '스테비올배당체 ADI 4 mg/kg 준용 / 체중조절 효과는 용량 무관하게 권고되지 않음',
     '식약처 「식품첨가물의 기준 및 규격」 / JECFA / WHO NSS (2023)', 'https://www.foodsafetykorea.go.kr', 'T1', '안전', '없음'),
    ((select id from ingredient where name='나한과추출물(몽크프루트)'), '모든 사람', '지속', '없음',
     'ADI 미설정 — 독성 우려 없어 수치 한도 불필요 / 체중조절 효과는 용량 무관하게 권고되지 않음',
     'US FDA GRAS Notices (몽크프루트 추출물) / WHO NSS (2023)', 'https://www.fda.gov/food/generally-recognized-safe-gras/gras-notice-inventory', 'T1', '안전', '없음');
