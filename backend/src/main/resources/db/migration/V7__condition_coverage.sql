-- 2026-09-16: 건강설문 12개 조건 중 규칙 0건이던 7개(카페인 민감·PKU·천식/아황산염·임신·고혈압·신장·어린이)
-- 보강. 규칙이 없으면 해당 조건 사용자에게 무조건 "안전"으로 뜨던 구조적 공백 해소
-- (예: 카페인 민감자가 카페인 음료를 분석해도 안전으로 표시되던 문제).
-- 근거: 식약처 「식품등의 표시기준」(고카페인·아스파탐 페닐알라닌·아황산염 표시대상), WHO 나트륨 권고,
--       대한신장학회/KDOQI(만성신장질환 인·칼륨 제한).
-- applies_to 는 AnalyzeService.conditionOfApplies 에서 건강설문 code 로 매핑.

-- 신규 성분 (아스파탐은 기존 성분이라 규칙만 추가)
insert into ingredient (name, category, aliases) values
    ('카페인',   '자극성분', '무수카페인·카페인무수물·과라나추출물·과라나·가라나추출물'),
    ('아황산염', '보존료',   '메타중아황산나트륨·메타중아황산칼륨·아황산나트륨·산성아황산나트륨·무수아황산·이산화황'),
    ('소금',     '나트륨',   '정제소금·천일염·정제염·죽염·암염'),
    ('인산염',   '인',       '인산·인산나트륨·인산칼륨·피로인산나트륨·폴리인산나트륨·산성피로인산나트륨'),
    ('염화칼륨', '칼륨',     '젖산칼륨·구연산칼륨');

insert into ingredient_rule
    (ingredient_id, applies_to, intake, side_effect, base_amount, source, source_url, source_tier, effect_level, diet_effect)
values
    -- PKU: 아스파탐 = 페닐알라닌 공급원, 라벨 표시 의무
    ((select id from ingredient where name='아스파탐'), '페닐케톤뇨증', '1회성', '아스파탐 대사 시 페닐알라닌 생성 — PKU 환자는 축적 위험. 라벨 「페닐알라닌 함유」 표시 대상', '전량 회피',
     '식약처 「식품등의 표시기준」 아스파탐 함유 표시', 'https://www.foodsafetykorea.go.kr', 'T1', '유해', null),
    -- 카페인: 민감자 / 임신·수유 / 어린이
    ((select id from ingredient where name='카페인'), '카페인 민감', '1회성', '민감자는 소량에도 불면·심계항진·불안', '개인차 큼 — 저용량부터',
     '식약처 「식품등의 표시기준」 고카페인(총카페인 0.15mg/mL↑) 주의 표시', 'https://www.foodsafetykorea.go.kr', 'T1', '주의', null),
    ((select id from ingredient where name='카페인'), '임신 중·수유 중', '지속', '카페인은 태반 통과 — 임산부 300mg/일 초과 시 위험', '카페인 300mg/일 이내',
     '식약처 카페인 섭취 권고 / 「식품등의 표시기준」', 'https://www.foodsafetykorea.go.kr', 'T1', '주의', null),
    ((select id from ingredient where name='카페인'), '영유아·어린이', '지속', '어린이 카페인 과다 시 수면·행동 영향 — 체중당 2.5mg/kg 이내 권고', '체중당 2.5mg/kg/일 이내',
     '식약처 어린이 카페인 섭취 권고', 'https://www.foodsafetykorea.go.kr', 'T1', '주의', null),
    -- 천식(아황산염 민감)
    ((select id from ingredient where name='아황산염'), '아황산염 민감', '1회성', '아황산염 민감자·천식환자에서 기관지 수축·과민반응 유발 가능', '전량 회피 권고',
     '식약처 「식품등의 표시기준」 아황산염(SO2 10mg/kg↑) 표시 대상', 'https://www.foodsafetykorea.go.kr', 'T1', '유해', null),
    -- 고혈압: 나트륨
    ((select id from ingredient where name='소금'), '고혈압', '지속', '나트륨 과다 섭취는 혈압 상승 요인', 'WHO 나트륨 2,000mg/일 이내',
     'WHO Sodium intake guideline 2012 / 식약처 나트륨 저감', 'https://www.who.int/publications/i/item/9789241504836', 'T1', '주의', null),
    -- 신장질환: 인·칼륨
    ((select id from ingredient where name='인산염'), '신장질환', '지속', '신장 기능 저하 시 인 배출 저하 — 무기인산염은 흡수율 높아 축적 위험', '신장 상태별 제한 — 전문가 상담',
     '대한신장학회 만성콩팥병 식이 / KDOQI 인 제한', 'https://www.ksn.or.kr', 'T2', '주의', null),
    ((select id from ingredient where name='염화칼륨'), '신장질환', '지속', '신장 기능 저하 시 칼륨 배출 저하 — 고칼륨혈증 위험', '신장 상태별 제한 — 전문가 상담',
     'KDOQI 만성신장질환 칼륨 제한', 'https://www.kidney.org/professionals/guidelines', 'T2', '주의', null);
