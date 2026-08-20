-- 식약처 C002 품목제조보고 기반 제품 카탈로그 (제로·단백질 키워드 전량 수집분).
-- 컬럼은 식약처 원본 필드 기준. 성분 리스크 지식베이스(M1)는 별도 마이그레이션에서 추가 예정.
create table product (
    report_no        varchar(40)  primary key,        -- 품목보고번호(PRDLST_REPORT_NO)
    name             varchar(300) not null,            -- 품목명/제품명(PRDLST_NM)
    maker            varchar(200),                     -- 업소명/제조사(BSSH_NM)
    prdlst_type      varchar(60),                      -- 식품유형(PRDLST_DCNM)
    report_date      date,                             -- 품목보고일(PRMS_DT)
    category         varchar(20)  not null,            -- 검색 버킷: protein | zero
    ingredient_count integer      not null default 0,  -- 원재료 개수
    ingredients_json text,                             -- 원재료 배열(JSON 문자열)
    dup_count        integer      not null default 1   -- 동일 (품목명,업소명) 재등록 병합 수
);

create index idx_product_category on product (category);
create index idx_product_name on product (name);
