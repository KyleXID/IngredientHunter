package io.heumlabs.ingredienthunter.analysis

import io.heumlabs.ingredienthunter.catalog.ProductRepository
import io.heumlabs.ingredienthunter.knowledge.Ingredient
import io.heumlabs.ingredienthunter.knowledge.IngredientRepository
import io.heumlabs.ingredienthunter.knowledge.IngredientRule
import io.heumlabs.ingredienthunter.knowledge.IngredientRuleRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.jdbc.core.JdbcTemplate

/**
 * judge() 핵심 판정 로직 단위 테스트 — DB 없이 findAll()만 스텁.
 * 개인화(applies_to 매칭)·verdict=최악값·noDietEffect·매칭어(alias/괄호이명/공백무시)·커버리지 카운트 검증.
 * conditionOfApplies 의 기본 3종(diabetes/lactose/galactose)만 사용해 후속 PR(milk/soy/pku 등)과 독립.
 */
class AnalyzeServiceTest {

    // 픽스처 성분
    private val sugar = Ingredient(id = 1, name = "설탕(수크로스)")
    private val lactose = Ingredient(id = 2, name = "유당(락토스)")
    private val saccharin = Ingredient(id = 3, name = "사카린(사카린나트륨)")
    private val sucralose = Ingredient(id = 4, name = "수크랄로스", aliases = "스플렌다")
    private val ingredients = listOf(sugar, lactose, saccharin, sucralose)

    // 픽스처 룰
    private val rules = listOf(
        IngredientRule(ingredientId = 1, appliesTo = "당뇨병 환자", intake = "1회성", effectLevel = "유해", sourceTier = "T1", sideEffect = "혈당 급상승"),
        IngredientRule(ingredientId = 1, appliesTo = "모든 사람", intake = "지속", effectLevel = "안전", sourceTier = "T2", dietEffect = "없음"),
        IngredientRule(ingredientId = 2, appliesTo = "유당불내증", intake = "1회성", effectLevel = "주의", sourceTier = "T3", sideEffect = "장트러블"),
        IngredientRule(ingredientId = 3, appliesTo = "모든 사람", intake = "지속", effectLevel = "안전", sourceTier = "T2"),
        IngredientRule(ingredientId = 4, appliesTo = "모든 사람", intake = "지속", effectLevel = "안전", sourceTier = "T2"),
    )

    private fun svc(): AnalyzeService {
        val ir = Mockito.mock(IngredientRepository::class.java)
        val rr = Mockito.mock(IngredientRuleRepository::class.java)
        Mockito.`when`(ir.findAll()).thenReturn(ingredients)
        Mockito.`when`(rr.findAll()).thenReturn(rules)
        return AnalyzeService(ir, rr, Mockito.mock(ProductRepository::class.java), JdbcTemplate(), "", "gemini", "", "claude")
    }

    @Test
    fun `개인화 - 당뇨병 선택 시 설탕은 유해`() {
        val r = svc().judge("테스트", listOf("설탕"), setOf("diabetes"))
        assertEquals("harmful", r.verdict)
        assertEquals(1, r.coveredCount)
        assertTrue(r.ingredients.any { it.name == "설탕(수크로스)" && it.type == "harmful" })
    }

    @Test
    fun `개인화 - 조건 미선택이면 설탕은 모든사람 안전만 적용`() {
        val r = svc().judge("테스트", listOf("설탕"), emptySet())
        assertEquals("safe", r.verdict)
        assertEquals(1, r.coveredCount)           // 매칭은 됐지만(covered=1) 유해 아님
        assertTrue(r.ingredients.isEmpty())       // 안전은 카드로 안 뜸
        assertTrue(r.noDietEffect)                // 모든사람 룰 dietEffect='없음'
    }

    @Test
    fun `verdict는 최악값 - 유해와 주의가 섞이면 harmful`() {
        val r = svc().judge("테스트", listOf("설탕", "유당"), setOf("diabetes", "lactose"))
        assertEquals("harmful", r.verdict)
        assertEquals(2, r.coveredCount)
        // 유해 카드가 주의 카드보다 앞(정렬)
        assertEquals("harmful", r.ingredients.first().type)
    }

    @Test
    fun `유당불내증만 선택하면 유당은 주의`() {
        val r = svc().judge("테스트", listOf("유당"), setOf("lactose"))
        assertEquals("warning", r.verdict)
    }

    @Test
    fun `커버리지 0 - DB에 없는 성분은 안전이 아니라 정보 제한 안내`() {
        val r = svc().judge("테스트", listOf("정체불명물질XYZ"), setOf("diabetes"))
        assertEquals("safe", r.verdict)
        assertEquals(0, r.coveredCount)
        assertTrue(r.note?.contains("제한적") == true)
    }

    @Test
    fun `매칭 - 괄호 안 이명으로도 매칭`() {
        val r = svc().judge("테스트", listOf("사카린나트륨"), emptySet())
        assertEquals(1, r.coveredCount)
    }

    @Test
    fun `매칭 - alias와 공백무시`() {
        val r = svc().judge("테스트", listOf("스플 렌다"), emptySet())  // alias '스플렌다' + 공백
        assertEquals(1, r.coveredCount)
    }

    @Test
    fun `totalDetected는 입력 성분 수, coveredCount는 매칭 수`() {
        val r = svc().judge("테스트", listOf("설탕", "정체불명물질XYZ"), setOf("diabetes"))
        assertEquals(2, r.totalDetected)
        assertEquals(1, r.coveredCount)
    }
}
