-- report_no(품목보고번호) 단위 미러로 전환.
--   · 주간 재수집 → upsert(변경 반영) + soft-delete(폐지 비활성) 지원 컬럼 추가.
--   · (품목명,업소명) 병합은 저장이 아니라 '조회 레이어'(product_merged 뷰)로 분리.

alter table product drop column dup_count;

alter table product
    add column chng_dt       date,                                   -- 식약처 변경일(CHNG_DT)
    add column first_seen_at timestamptz not null default now(),     -- 최초 수집 시각(보존)
    add column last_seen_at  timestamptz not null default now(),     -- 최근 수집 시각(동기화마다 갱신)
    add column active        boolean     not null default true;      -- 최근 수집에 존재=true, 사라지면 soft-delete(false)

create index idx_product_active on product (active);

-- 병합 조회 뷰: (정규화 품목명, 업소명) 기준 대표 1건(보고일 최신). 저장이 아닌 파생 조회용.
create view product_merged as
select distinct on (regexp_replace(lower(name), '\s', '', 'g'), coalesce(maker, ''))
       report_no, name, maker, prdlst_type, report_date, chng_dt,
       category, ingredient_count, ingredients_json
from product
where active
order by regexp_replace(lower(name), '\s', '', 'g'), coalesce(maker, ''), report_date desc nulls last;
