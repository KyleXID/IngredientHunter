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

/**
 * 제품 카탈로그 — 식약처 C002 품목제조보고에서 수집한 제로·단백질 제품.
 * (한 파일에 엔티티·리포지토리·조회 API·시더를 모아 흐름을 한눈에 보이게 함 — POC 단계.)
 */

// ── 1. 엔티티: DB 테이블 product 한 행 = Product 객체 하나 (Flyway V1__product_catalog.sql 과 1:1) ──
@Entity
@Table(name = "product")
class Product(
    @Id @Column(name = "report_no", length = 40) val reportNo: String,
    @Column(nullable = false, length = 300) val name: String,
    @Column(length = 200) val maker: String? = null,
    @Column(name = "prdlst_type", length = 60) val prdlstType: String? = null,
    @Column(name = "report_date") val reportDate: LocalDate? = null,
    @Column(nullable = false, length = 20) val category: String,
    @Column(name = "ingredient_count", nullable = false) val ingredientCount: Int = 0,
    @Column(name = "ingredients_json", columnDefinition = "text") val ingredientsJson: String? = null,
    @Column(name = "dup_count", nullable = false) val dupCount: Int = 1,
)

// ── 2. 리포지토리: 메서드 이름만으로 SQL이 자동 생성됨(Spring Data JPA) ──
interface ProductRepository : JpaRepository<Product, String> {
    fun findByCategory(category: String, pageable: Pageable): Page<Product>
    fun findByNameContainingIgnoreCase(q: String, pageable: Pageable): Page<Product>
    fun findByCategoryAndNameContainingIgnoreCase(category: String, q: String, pageable: Pageable): Page<Product>
    fun countByCategory(category: String): Long
}

// ── 3. 조회 API: GET /api/products (목록·검색), GET /api/products/stats (건수) ──
@RestController
@RequestMapping("/api/products")
class ProductController(private val repo: ProductRepository) {

    /** category(protein|zero)·q(제품명 검색어)·page·size 로 페이지 조회. */
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
            cat != null && query != null -> repo.findByCategoryAndNameContainingIgnoreCase(cat, query, pageable)
            cat != null -> repo.findByCategory(cat, pageable)
            query != null -> repo.findByNameContainingIgnoreCase(query, pageable)
            else -> repo.findAll(pageable)
        }
    }

    @GetMapping("/stats")
    fun stats(): Map<String, Long> = mapOf(
        "total" to repo.count(),
        "protein" to repo.countByCategory("protein"),
        "zero" to repo.countByCategory("zero"),
    )
}

// ── 4. 시더: 앱 시작 시 product 가 비어 있으면 resources/seed/*.csv 를 한 번에 적재 ──
@Component
class ProductSeeder(private val jdbc: JdbcTemplate) : ApplicationRunner {
    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments) {
        val existing = jdbc.queryForObject("select count(*) from product", Long::class.java) ?: 0L
        if (existing > 0) {
            log.info("product 이미 {}건 적재됨 — 시딩 생략", existing)
            return
        }
        val rows = LinkedHashMap<String, Array<Any?>>()   // report_no → insert 파라미터 (파일 간 중복 제거)
        for (res in listOf("seed/mfds_protein.csv", "seed/mfds_zero.csv")) {
            val cp = ClassPathResource(res)
            if (!cp.exists()) {
                log.warn("시드 파일 없음: {}", res); continue
            }
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
                    rows.putIfAbsent(reportNo, arrayOf(
                        reportNo,
                        col("name") ?: "",
                        col("maker"),
                        col("prdlst_type"),
                        col("report_date")?.let { runCatching { LocalDate.parse(it) }.getOrNull() },
                        col("category") ?: "",
                        col("ingredient_count")?.toIntOrNull() ?: 0,
                        col("ingredients_json"),
                        col("dup_count")?.toIntOrNull() ?: 1,
                    ))
                }
            }
        }
        val params = rows.values.toList()
        val sql = "insert into product(report_no,name,maker,prdlst_type,report_date,category,ingredient_count,ingredients_json,dup_count) " +
            "values(?,?,?,?,?,?,?,?,?) on conflict (report_no) do nothing"
        jdbc.batchUpdate(sql, object : BatchPreparedStatementSetter {
            override fun getBatchSize() = params.size
            override fun setValues(ps: PreparedStatement, i: Int) {
                val p = params[i]
                ps.setString(1, p[0] as String)
                ps.setString(2, p[1] as String)
                ps.setObject(3, p[2])
                ps.setObject(4, p[3])
                ps.setObject(5, p[4])                 // LocalDate? → Postgres date
                ps.setString(6, p[5] as String)
                ps.setInt(7, p[6] as Int)
                ps.setString(8, p[7] as String?)
                ps.setInt(9, p[8] as Int)
            }
        })
        log.info("product 시딩 완료: {}건", params.size)
    }
}

/** RFC4180 한 줄 파서 — 따옴표로 감싼 필드의 콤마·이스케이프("")를 처리. (원재료 JSON에 콤마가 있어 필요) */
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
