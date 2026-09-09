package io.heumlabs.ingredienthunter.analysis

import io.heumlabs.ingredienthunter.catalog.ProductRepository
import io.heumlabs.ingredienthunter.knowledge.Ingredient
import io.heumlabs.ingredienthunter.knowledge.IngredientRepository
import io.heumlabs.ingredienthunter.knowledge.IngredientRuleRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

/**
 * 성분표 이미지/제품 → 원재료 추출 → 성분 리스크 DB(ingredient_rule) 근거로 판정.
 *   · LLM(Gemini>Claude)은 "원재료명 추출"만. 판정·개인화·verdict·noDietEffect 는 DB 로직.
 *   · 검색 경로(productReportNo)는 LLM 없이 product.ingredients_json 사용.
 * 응답 계약 = 프론트 결과 화면과 1:1(verdict/productName/totalDetected/noDietEffect/note/ingredients).
 */
@Service
class AnalyzeService(
    private val ingredientRepo: IngredientRepository,
    private val ruleRepo: IngredientRuleRepository,
    private val productRepo: ProductRepository,
    private val jdbc: JdbcTemplate,
    @Value("\${gemini.api-key:}") private val geminiKey: String,
    @Value("\${gemini.model:gemini-flash-latest}") private val geminiModel: String,
    @Value("\${anthropic.api-key:}") private val anthropicKey: String,
    @Value("\${anthropic.model:claude-sonnet-5}") private val anthropicModel: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val json = JsonMapper.builder().build()
    private val http = HttpClient.newHttpClient()

    // 판정 위계·매핑
    private val severity = mapOf("안전" to 0, "주의" to 1, "유해" to 2)
    private val cardType = mapOf("주의" to "warning", "유해" to "harmful")
    /** applies_to(성분DB 표기) → 건강설문 code. "모든 사람"은 항상 적용이라 여기 없음. */
    private val conditionOfApplies = mapOf(
        "당뇨병 환자" to "diabetes",
        "유당불내증" to "lactose",
        "갈락토스혈증 환자" to "galactose",
    )

    // ── 진입점 ──
    fun analyze(req: AnalyzeRequest): AnalyzeResult {
        val (productName, rawNames) = resolveIngredients(req)
        val result = judge(productName, rawNames, req.conditions.toSet())
        if (req.consent) writeLog(req, result)
        return result
    }

    /** 입력 경로 3종: 직접 성분목록 > 제품(report_no) > 이미지(LLM). 키 없으면 데모. */
    private fun resolveIngredients(req: AnalyzeRequest): Pair<String, List<String>> {
        req.ingredientNames?.takeIf { it.isNotEmpty() }?.let {
            return (req.productName ?: "입력 성분") to it
        }
        req.productReportNo?.let { rno ->
            val p = productRepo.findById(rno).orElse(null)
            if (p != null) {
                // union: 같은 이름(공백무시)의 모든 활성 제품 원재료 합집합 — 등록·공장별 변형 누락 방지
                val jsons = jdbc.queryForList(
                    "select ingredients_json from product where active and " +
                        "regexp_replace(lower(name), '\\s', '', 'g') = regexp_replace(lower(?), '\\s', '', 'g')",
                    String::class.java, p.name,
                )
                val names = jsons.filterNotNull().flatMap { js ->
                    runCatching { json.readValue(js, List::class.java) }.getOrDefault(emptyList<Any>()).filterIsInstance<String>()
                }.map { it.trim() }.filter { it.isNotEmpty() }.distinct()
                return p.name to names
            }
        }
        if (!req.imageBase64.isNullOrBlank()) {
            return extractFromImage(req.imageBase64, req.mediaType ?: "image/jpeg")
        }
        return DEMO_PRODUCT to DEMO_NAMES
    }

    // ── 판정: 원재료명 → DB 룰 매칭 → 개인화 → verdict/noDietEffect ──
    fun judge(productName: String, rawNames: List<String>, conditions: Set<String>): AnalyzeResult {
        val ingredients = ingredientRepo.findAll()
        val rulesByIngredient = ruleRepo.findAll().groupBy { it.ingredientId }

        val matched = LinkedHashSet<Ingredient>()
        for (raw in rawNames) {
            val norm = raw.replace(" ", "")
            for (ing in ingredients) if (matchTerms(ing).any { norm.contains(it) }) matched.add(ing)
        }

        val cards = ArrayList<IngredientCard>()
        var worst = 0
        var noDietEffect = false
        for (ing in matched) {
            val rules = rulesByIngredient[ing.id] ?: continue
            // 개인화: "모든 사람" 룰은 항상 + 선택한 건강상태에 해당하는 룰
            val applicable = rules.filter {
                it.appliesTo == "모든 사람" || conditionOfApplies[it.appliesTo] in conditions
            }
            if (applicable.any { it.dietEffect == "없음" }) noDietEffect = true
            val chosen = applicable.maxByOrNull { severity[it.effectLevel] ?: 0 } ?: continue
            worst = maxOf(worst, severity[chosen.effectLevel] ?: 0)
            cardType[chosen.effectLevel]?.let { type ->
                cards.add(IngredientCard(ing.name, type, chosen.sideEffect, chosen.baseAmount, chosen.source))
            }
        }

        val verdict = when (worst) { 2 -> "harmful"; 1 -> "warning"; else -> "safe" }
        val note = if (verdict == "safe") {
            "조심해야 할 성분도, 유해한 성분도 찾지 못했어요. 건강 상태에 따라 다를 수 있으니 걱정된다면 전문가와 상담해 보세요."
        } else null
        // 유해 먼저, 그다음 주의 순으로 카드 정렬(화면 우선순위)
        cards.sortByDescending { if (it.type == "harmful") 1 else 0 }
        return AnalyzeResult(verdict, productName, rawNames.size, noDietEffect, note, cards)
    }

    /** 성분명 매칭어: 괄호 밖 본명 + 괄호 안 이명 + aliases. 2자 이상만. */
    private fun matchTerms(ing: Ingredient): List<String> {
        val terms = LinkedHashSet<String>()
        val base = ing.name.replace(Regex("\\(.*?\\)"), "").replace(" ", "")
        if (base.length >= 2) terms.add(base)
        Regex("\\(([^)]*)\\)").findAll(ing.name).forEach { m ->
            val inner = m.groupValues[1].replace(" ", "")
            if (inner.length >= 2) terms.add(inner)
        }
        ing.aliases?.split('·', '/', ',')?.forEach { a ->
            val t = a.trim().replace(" ", "")
            if (t.length >= 2) terms.add(t)
        }
        if (terms.isEmpty()) terms.add(ing.name.replace(" ", ""))
        return terms.toList()
    }

    // ── 로그: 동의 시에만. 건강정보(민감정보)는 healthConsent 일 때만 저장 ──
    private fun writeLog(req: AnalyzeRequest, result: AnalyzeResult) {
        runCatching {
            val reqLog = linkedMapOf<String, Any?>(
                "productReportNo" to req.productReportNo,
                "hasImage" to (!req.imageBase64.isNullOrBlank()),
            )
            if (req.healthConsent) reqLog["conditions"] = req.conditions   // 민감정보 — 동의 시만
            jdbc.update(
                "insert into analysis_log(cookie_id, consent, health_consent, product_report_no, verdict, request_body, response_body) " +
                    "values (?, ?, ?, ?, ?, ?::jsonb, ?::jsonb)",
                req.cookieId, req.consent, req.healthConsent, req.productReportNo, result.verdict,
                json.writeValueAsString(reqLog), json.writeValueAsString(result),
            )
        }.onFailure { log.warn("analysis_log 적재 실패: {}", it.message) }
    }

    // ── LLM: 원재료 추출만(판정 X) ──
    private fun extractFromImage(imageBase64: String, media: String): Pair<String, List<String>> {
        val raw = when {
            geminiKey.isNotBlank() -> callGemini(imageBase64, media)
            anthropicKey.isNotBlank() -> callClaude(imageBase64, media)
            else -> return DEMO_PRODUCT to DEMO_NAMES
        } ?: return "분석한 제품" to emptyList()
        val obj = runCatching { json.readValue(stripFence(raw), Map::class.java) }.getOrNull()
        val product = (obj?.get("product") as? String)?.takeIf { it.isNotBlank() } ?: "분석한 제품"
        val names = (obj?.get("ingredients") as? List<*>)?.filterIsInstance<String>() ?: emptyList()
        return product to names
    }

    private fun callGemini(imageBase64: String, media: String): String? {
        val body = json.writeValueAsString(
            mapOf(
                "system_instruction" to mapOf("parts" to listOf(mapOf("text" to EXTRACT_PROMPT))),
                "contents" to listOf(
                    mapOf(
                        "parts" to listOf(
                            mapOf("inline_data" to mapOf("mime_type" to media, "data" to imageBase64)),
                            mapOf("text" to "이 전성분표에서 원재료명을 추출해 스키마대로 JSON만."),
                        ),
                    ),
                ),
                "generationConfig" to mapOf("responseMimeType" to "application/json"),
            ),
        )
        val request = HttpRequest.newBuilder(
            URI.create("https://generativelanguage.googleapis.com/v1beta/models/$geminiModel:generateContent"),
        ).header("x-goog-api-key", geminiKey).header("content-type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body)).build()
        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() !in 200..299) { log.warn("gemini {}", response.statusCode()); return null }
        val root = json.readValue(response.body(), Map::class.java)
        val parts = (((root["candidates"] as? List<*>)?.firstOrNull() as? Map<*, *>)?.get("content") as? Map<*, *>)
            ?.get("parts") as? List<*>
        return parts?.filterIsInstance<Map<*, *>>()?.firstOrNull { it["text"] != null }?.get("text") as? String
    }

    private fun callClaude(imageBase64: String, media: String): String? {
        val body = json.writeValueAsString(
            mapOf(
                "model" to anthropicModel, "max_tokens" to 1200, "system" to EXTRACT_PROMPT,
                "messages" to listOf(
                    mapOf(
                        "role" to "user",
                        "content" to listOf(
                            mapOf("type" to "image", "source" to mapOf("type" to "base64", "media_type" to media, "data" to imageBase64)),
                            mapOf("type" to "text", "text" to "이 전성분표에서 원재료명을 추출해 스키마대로 JSON만."),
                        ),
                    ),
                ),
            ),
        )
        val request = HttpRequest.newBuilder(URI.create("https://api.anthropic.com/v1/messages"))
            .header("x-api-key", anthropicKey).header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body)).build()
        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() !in 200..299) { log.warn("anthropic {}", response.statusCode()); return null }
        val root = json.readValue(response.body(), Map::class.java)
        return (root["content"] as? List<*>)?.filterIsInstance<Map<*, *>>()
            ?.firstOrNull { it["type"] == "text" }?.get("text") as? String
    }

    private fun stripFence(text: String): String {
        val t = text.trim()
        if (!t.startsWith("```")) return t
        return t.removePrefix("```").substringAfter('\n').substringBeforeLast("```").trim()
    }

    companion object {
        private const val EXTRACT_PROMPT =
            "너는 식품 전성분표 이미지에서 정보만 추출하는 도우미다. 위험도 판정·평가는 절대 하지 않는다. " +
                "(1) 제품명 추정, (2) 원재료명을 표기 순서대로 추출한다. " +
                "설명·코드펜스 없이 JSON만 응답한다: {\"product\":\"제품명\",\"ingredients\":[\"원재료명\", ...]}"

        // 키 미설정 시 데모 — 실제 판정 로직을 그대로 태운다(제로 콜라류 라벨)
        private const val DEMO_PRODUCT = "데모 제로 콜라"
        private val DEMO_NAMES = listOf("정제수", "탄산가스", "수크랄로스(감미료)", "아세설팜칼륨(감미료)", "합성향료", "구연산")
    }
}

/** 결과 계약 — 프론트 ResultScreen props 와 1:1. */
data class AnalyzeResult(
    val verdict: String,          // safe | warning | harmful
    val productName: String,
    val totalDetected: Int,
    val noDietEffect: Boolean,
    val note: String?,
    val ingredients: List<IngredientCard>,
)

data class IngredientCard(
    val name: String,
    val type: String,             // warning | harmful
    val effect: String?,          // side_effect
    val dose: String?,            // base_amount
    val evidence: String?,        // source
)
