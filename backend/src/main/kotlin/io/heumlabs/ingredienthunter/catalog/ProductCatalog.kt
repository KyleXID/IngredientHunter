package io.heumlabs.ingredienthunter.catalog

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.core.io.ClassPathResource
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.jdbc.core.BatchPreparedStatementSetter
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.sql.PreparedStatement
import java.time.LocalDate
import java.time.OffsetDateTime

/**
 * 제품 카탈로그 — 식약처 C002 품목제조보고의 report_no(품목보고번호) 단위 미러.
 *   · 주간 재수집 → CatalogSync 가 upsert(변경 반영) + soft-delete(폐지 비활성).
 *   · (품목명,업소명) 병합은 저장이 아니라 조회 레이어(product_merged 뷰)로 분리.
 */

// ── 1. 엔티티 (Flyway V1+V2 의 product 테이블과 1:1). report_no 가 안정적 unique key ──
@Entity
@Table(name = "product")
class Product(
    @Id @Column(name = "report_no", length = 40) val reportNo: String,
    @Column(nullable = false, length = 300) val name: String,
    @Column(length = 200) val maker: String? = null,
    @Column(name = "prdlst_type", length = 60) val prdlstType: String? = null,
    @Column(name = "report_date") val reportDate: LocalDate? = null,
    @Column(name = "chng_dt") val chngDt: LocalDate? = null,                 // 식약처 변경일 — 변경 감지용
    @Column(nullable = false, length = 20) val category: String,
    @Column(name = "ingredient_count", nullable = false) val ingredientCount: Int = 0,
    @Column(name = "ingredients_json", columnDefinition = "text") val ingredientsJson: String? = null,
    @Column(name = "first_seen_at", nullable = false) val firstSeenAt: OffsetDateTime = OffsetDateTime.now(),
    @Column(name = "last_seen_at", nullable = false) val lastSeenAt: OffsetDateTime = OffsetDateTime.now(),
    @Column(nullable = false) val active: Boolean = true,                    // 최근 수집에 존재하면 true
)

// ── 2. 리포지토리 (기본적으로 active 만 노출) ──
interface ProductRepository : JpaRepository<Product, String> {
    fun findByActiveTrue(pageable: Pageable): Page<Product>
    fun findByCategoryAndActiveTrue(category: String, pageable: Pageable): Page<Product>
    fun findByNameContainingIgnoreCaseAndActiveTrue(q: String, pageable: Pageable): Page<Product>
    fun findByCategoryAndNameContainingIgnoreCaseAndActiveTrue(category: String, q: String, pageable: Pageable): Page<Product>
    fun countByActiveTrue(): Long
    fun countByCategoryAndActiveTrue(category: String): Long
}

// ── 3. 조회 API ──
@RestController
@RequestMapping("/api/products")
class ProductController(private val repo: ProductRepository, private val jdbc: JdbcTemplate) {

    /** report_no 단위 원본 미러 조회(활성만). category·q·page·size. */
    @GetMapping
    fun list(
        @RequestParam(required = false) category: String?,
        @RequestParam(required = false) q: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): Page<Product> {
        val pageable = PageRequest.of(page.coerceAtLeast(0), size.coerceIn(1, 100), Sort.by("name"))
        val cat = category?.takeIf { it.isNotBlank() }
        val query = q?.takeIf { it.isNotBlank() }
        return when {
            cat != null && query != null -> repo.findByCategoryAndNameContainingIgnoreCaseAndActiveTrue(cat, query, pageable)
            cat != null -> repo.findByCategoryAndActiveTrue(cat, pageable)
            query != null -> repo.findByNameContainingIgnoreCaseAndActiveTrue(query, pageable)
            else -> repo.findByActiveTrue(pageable)
        }
    }

    @GetMapping("/stats")
    fun stats(): Map<String, Long> = mapOf(
        "total" to repo.countByActiveTrue(),
        "protein" to repo.countByCategoryAndActiveTrue("protein"),
        "zero" to repo.countByCategoryAndActiveTrue("zero"),
    )

    /** 병합 조회 레이어: (품목명,업소명) 대표 1건. product_merged 뷰를 그대로 읽음. */
    @GetMapping("/merged")
    fun merged(
        @RequestParam(required = false) category: String?,
        @RequestParam(required = false) q: String?,
        @RequestParam(defaultValue = "50") limit: Int,
        @RequestParam(defaultValue = "0") offset: Int,
    ): List<Map<String, Any?>> {
        val sql = StringBuilder("select report_no, name, maker, prdlst_type, report_date, category, ingredient_count from product_merged")
        val args = ArrayList<Any>()
        val where = ArrayList<String>()
        category?.takeIf { it.isNotBlank() }?.let { where.add("category = ?"); args.add(it) }
        q?.takeIf { it.isNotBlank() }?.let { where.add("name ilike ?"); args.add("%$it%") }
        if (where.isNotEmpty()) sql.append(" where ").append(where.joinToString(" and "))
        sql.append(" order by name limit ? offset ?")
        args.add(limit.coerceIn(1, 200)); args.add(offset.coerceAtLeast(0))
        return jdbc.queryForList(sql.toString(), *args.toTypedArray())
    }
}

// ── 4. 동기화: 시작 시 seed CSV 를 upsert(변경 반영) + soft-delete(폐지 비활성) ──
@Component
class CatalogSync(private val jdbc: JdbcTemplate) : ApplicationRunner {
    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments) {
        val runStart = jdbc.queryForObject("select now()", OffsetDateTime::class.java) ?: OffsetDateTime.now()
        val rows = LinkedHashMap<String, Array<Any?>>()   // report_no → insert 파라미터
        for (res in listOf("seed/mfds_protein.csv", "seed/mfds_zero.csv")) {
            val cp = ClassPathResource(res)
            if (!cp.exists()) { log.warn("시드 파일 없음: {}", res); continue }
            cp.inputStream.bufferedReader(Charsets.UTF_8).use { br ->
                val lines = br.readLines()
                if (lines.isEmpty()) return@use
                val header = parseCsvLine(lines[0].removePrefix("﻿"))
                val idx = header.withIndex().associate { (i, h) -> h to i }
                for (ln in lines.drop(1)) {
                    if (ln.isBlank()) continue
                    val f = parseCsvLine(ln)
                    fun col(name: String): String? = idx[name]?.let { f.getOrNull(it) }?.takeIf { it.isNotEmpty() }
                    val reportNo = col("report_no") ?: continue
                    rows[reportNo] = arrayOf(
                        reportNo,
                        col("name") ?: "",
                        col("maker"),
                        col("prdlst_type"),
                        col("report_date")?.let { runCatching { LocalDate.parse(it) }.getOrNull() },
                        col("chng_dt")?.let { runCatching { LocalDate.parse(it) }.getOrNull() },  // 구 CSV엔 없으면 null
                        col("category") ?: "",
                        col("ingredient_count")?.toIntOrNull() ?: 0,
                        col("ingredients_json"),
                        runStart,
                    )
                }
            }
        }
        if (rows.isEmpty()) { log.warn("시드 없음 — 카탈로그 동기화 생략"); return }
        val params = rows.values.toList()
        val sql = "insert into product(report_no,name,maker,prdlst_type,report_date,chng_dt,category,ingredient_count,ingredients_json,last_seen_at) " +
            "values(?,?,?,?,?,?,?,?,?,?) " +
            "on conflict (report_no) do update set name=excluded.name, maker=excluded.maker, prdlst_type=excluded.prdlst_type, " +
            "report_date=excluded.report_date, chng_dt=excluded.chng_dt, category=excluded.category, " +
            "ingredient_count=excluded.ingredient_count, ingredients_json=excluded.ingredients_json, " +
            "last_seen_at=excluded.last_seen_at, active=true"
        jdbc.batchUpdate(sql, object : BatchPreparedStatementSetter {
            override fun getBatchSize() = params.size
            override fun setValues(ps: PreparedStatement, i: Int) {
                val p = params[i]
                ps.setString(1, p[0] as String)
                ps.setString(2, p[1] as String)
                ps.setObject(3, p[2])
                ps.setObject(4, p[3])
                ps.setObject(5, p[4])          // report_date: LocalDate?
                ps.setObject(6, p[5])          // chng_dt: LocalDate?
                ps.setString(7, p[6] as String)
                ps.setInt(8, p[7] as Int)
                ps.setString(9, p[8] as String?)
                ps.setObject(10, p[9])         // last_seen_at: OffsetDateTime(runStart)
            }
        })
        // 이번 수집에 안 잡힌 기존 행 = 폐지 추정 → soft-delete(하드 삭제 X, 히스토리 보존)
        val deactivated = jdbc.update("update product set active = false where last_seen_at < ? and active = true", runStart)
        log.info("카탈로그 동기화: upsert {}건, soft-delete {}건", params.size, deactivated)
    }
}

/** RFC4180 한 줄 파서 — 따옴표 필드의 콤마·이스케이프("") 처리(원재료 JSON에 콤마 있음). */
internal fun parseCsvLine(line: String): List<String> {
    val out = ArrayList<String>()
    val sb = StringBuilder()
    var inQuotes = false
    var i = 0
    while (i < line.length) {
        val c = line[i]
        if (inQuotes) {
            if (c == '"') {
                if (i + 1 < line.length && line[i + 1] == '"') { sb.append('"'); i++ } else inQuotes = false
            } else sb.append(c)
        } else when (c) {
            '"' -> inQuotes = true
            ',' -> { out.add(sb.toString()); sb.setLength(0) }
            else -> sb.append(c)
        }
        i++
    }
    out.add(sb.toString())
    return out
}
