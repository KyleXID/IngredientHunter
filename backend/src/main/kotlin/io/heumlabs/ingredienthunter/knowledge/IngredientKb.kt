package io.heumlabs.ingredienthunter.knowledge

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.springframework.data.jpa.repository.JpaRepository

/**
 * 성분 리스크 지식베이스(KB) — Flyway V3 ingredient·V4 diet_effect + V5 시드(Confluence 미러).
 * analyze는 이 DB를 근거로 판정한다(기존 MD KB 대체). LLM은 원재료 추출만, 판정은 여기서.
 */
@Entity
@Table(name = "ingredient")
class Ingredient(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) val id: Long = 0,
    @Column(nullable = false, length = 120) val name: String = "",
    @Column(length = 40) val category: String? = null,
    @Column(columnDefinition = "text") val aliases: String? = null,   // 라벨 이명(매칭용), '·' 구분
)

/** 성분 판정 룰 (성분 1:N). 대상·빈도별로 여러 행. */
@Entity
@Table(name = "ingredient_rule")
class IngredientRule(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) val id: Long = 0,
    @Column(name = "ingredient_id", nullable = false) val ingredientId: Long = 0,
    @Column(name = "applies_to", nullable = false, length = 30) val appliesTo: String = "",  // 모든 사람·당뇨병 환자…
    @Column(nullable = false, length = 10) val intake: String = "",                          // 지속·1회성
    @Column(name = "side_effect", length = 200) val sideEffect: String? = null,
    @Column(name = "base_amount", length = 200) val baseAmount: String? = null,
    @Column(length = 300) val source: String? = null,
    @Column(name = "source_url", columnDefinition = "text") val sourceUrl: String? = null,
    @Column(name = "source_tier", nullable = false, length = 4) val sourceTier: String = "",  // T1~T3
    @Column(name = "effect_level", nullable = false, length = 10) val effectLevel: String = "", // 안전·주의·유해
    @Column(name = "diet_effect", length = 10) val dietEffect: String? = null,                  // 역효과·없음·해당없음
)

interface IngredientRepository : JpaRepository<Ingredient, Long>

interface IngredientRuleRepository : JpaRepository<IngredientRule, Long>
