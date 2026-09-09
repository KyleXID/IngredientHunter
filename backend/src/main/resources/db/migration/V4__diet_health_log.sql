-- 2026-09-03 정기 미팅 + Confluence DB(ingredient·healthCondition) 반영.
--   1) ingredient_rule.diet_effect  : "다이어트 효과" 컬럼(회의 결정 = effect_level과 분리된 축)
--   2) health_survey                : 건강설문 마스터(하드코딩 제거 → DB 관리). healthCondition DB 미러
--   3) analysis_log                 : 분석 요청·응답 raw 로그 + 쿠키 + 동의(법령 대응)

-- 1) 다이어트 효과 — 안전성(effect_level)과 다른 축. 감미료의 "체중조절 효과 없음" 등.
--    값: 역효과(체중증가 유발) · 없음(체중조절 효과 없음) · 해당없음. 미평가면 NULL.
alter table ingredient_rule
    add column diet_effect varchar(10);
alter table ingredient_rule
    add constraint ck_rule_diet_effect check (diet_effect in ('역효과', '없음', '해당없음'));

-- 2) 건강설문 마스터 — 화면 문항을 DB에서 관리(DB만 바꿔도 화면 반영).
--    code = 프론트 안정 키(children·diabetes…), category = 그룹(생애주기·질환·체질·알레르기)
create table health_survey (
    id            bigint generated always as identity primary key,
    code          varchar(40)  not null unique,       -- 프론트 매칭 키
    category      varchar(30)  not null,              -- 그룹(스캔 단위)
    label         varchar(60)  not null,              -- 화면 표기명
    description   varchar(120),                        -- 보조 설명
    display_order int          not null default 0,     -- 그룹 내/전체 표시 순서
    active        boolean      not null default true,
    created_at    timestamptz  not null default now()
);
create index idx_health_survey_active on health_survey (active, display_order);

-- 3) 분석 로그 — 요청·응답 바디를 raw(jsonb)로 적재 + 쿠키 + 동의 플래그.
--    법령: 미동의 시 로그 미적재, 건강정보(민감정보)는 health_consent=true 일 때만 저장.
--    통계(연속분석 비율 등)는 이 raw 로그를 대시보드에서 후가공.
create table analysis_log (
    id                bigint generated always as identity primary key,
    cookie_id         varchar(64),                     -- 로그인 없이 기기 구분(비식별)
    consent           boolean     not null default false,  -- 사용 기록 분석 동의
    health_consent    boolean     not null default false,  -- 건강정보(민감정보) 동의
    product_report_no varchar(40),                     -- 검색 경로면 제품 식별(선택)
    verdict           varchar(10),                     -- safe|warning|harmful (빠른 집계용)
    request_body      jsonb,                           -- 제품·건강설문 등 요청 원문
    response_body     jsonb,                           -- 성분별 판정 결과 원문
    created_at        timestamptz not null default now()  -- ms 정밀도(연속분석 구분)
);
create index idx_analysis_log_cookie on analysis_log (cookie_id, created_at);
