-- 성분 리스크 판정 스키마 (빈 테이블). 데이터는 성분표(Confluence) 확정분을 추후 적재.
--   ingredient          : 성분 마스터(고유 31종)
--   ingredient_rule     : 성분표 판정 행 (성분 1 : N) — 사용자대상·섭취빈도·부작용수준·출처등급
--   product_ingredient  : product ↔ ingredient (N:M) — 라벨 원문 원재료 보존 + 표준 성분 매칭

create table ingredient (
    id         bigint generated always as identity primary key,
    name       varchar(120) not null unique,       -- 성분명(라벨 표기 기준)
    name_en    varchar(120),
    category   varchar(40),                          -- 감미료·유화제·색소 등
    aliases    text,                                 -- 라벨 이명(매칭용). 커지면 별도 테이블로
    created_at timestamptz not null default now()
);

create table ingredient_rule (
    id            bigint generated always as identity primary key,
    ingredient_id bigint      not null references ingredient(id) on delete cascade,
    applies_to    varchar(30) not null,              -- 사용자 대상 15종(모든사람·당뇨·어린이·PKU·임산부…). 대상 1개=행 1개
    intake        varchar(10) not null,              -- 섭취빈도
    side_effect   varchar(200),                      -- 발생 부작용(키워드: 설사·장트러블·혈당급상승 등)
    base_amount   varchar(200),                      -- 기준 용량(ADI·UL·표시 의무 역치)
    source        varchar(300),                      -- 출처 문서명
    source_url    text,
    source_tier   varchar(4)  not null,              -- 출처등급
    effect_level  varchar(10) not null,              -- 부작용 수준
    check (intake in ('지속', '1회성')),
    check (source_tier in ('T1', 'T2', 'T3')),
    check (effect_level in ('안전', '주의', '유해'))
);
create index idx_rule_ingredient on ingredient_rule (ingredient_id);
create index idx_rule_effect on ingredient_rule (effect_level);
create index idx_rule_applies on ingredient_rule (applies_to);

create table product_ingredient (
    id                bigint generated always as identity primary key,
    product_report_no varchar(40)  not null references product(report_no) on delete cascade,
    ingredient_id     bigint       references ingredient(id),   -- 미매칭(KB 없음) 시 NULL
    raw_name          varchar(200) not null,                    -- 라벨 원문 원재료명
    display_order     int,                                      -- 전성분 표시 순서
    match_confidence  numeric(4, 3),                            -- 0~1
    unique (product_report_no, raw_name)
);
create index idx_pi_product on product_ingredient (product_report_no);
create index idx_pi_ingredient on product_ingredient (ingredient_id);
