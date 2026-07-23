package io.heumlabs.ingredienthunter.analysis

import org.springframework.beans.factory.annotation.Value
import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

/**
 * 성분표 이미지 → 비전 LLM으로 원재료 추출 → 리스크 KB(리포트 MD) 근거로 평가.
 * 우선순위: GEMINI_API_KEY(연습용 무료) > ANTHROPIC_API_KEY > DEMO(키 없을 때 UI/계약 확인).
 * MVP는 "비전 LLM 한 방" — 전용 OCR 파이프라인 없음(CLAUDE.md).
 */
@Service
class AnalyzeService(
    @Value("\${gemini.api-key:}") private val geminiKey: String,
    @Value("\${gemini.model:gemini-flash-latest}") private val geminiModel: String,
    @Value("\${anthropic.api-key:}") private val anthropicKey: String,
    @Value("\${anthropic.model:claude-sonnet-5}") private val anthropicModel: String,
) {
    private val json = JsonMapper.builder().build()
    private val http = HttpClient.newHttpClient()
    private val kb: String =
        ClassPathResource("ingredient-risk-kb.md").inputStream.use { it.readBytes().decodeToString() }

    fun analyze(imageBase64: String?, mediaType: String?): Any {
        if (imageBase64.isNullOrBlank()) return demo()
        val media = mediaType ?: "image/jpeg"
        return when {
            geminiKey.isNotBlank() -> callGemini(imageBase64, media)
            anthropicKey.isNotBlank() -> callClaude(imageBase64, media)
            else -> demo()
        }
    }

    /** Google Gemini (generateContent) — responseMimeType=application/json 으로 순수 JSON 수신. */
    private fun callGemini(imageBase64: String, media: String): Any {
        val body = json.writeValueAsString(
            mapOf(
                "system_instruction" to mapOf("parts" to listOf(mapOf("text" to systemPrompt()))),
                "contents" to listOf(
                    mapOf(
                        "parts" to listOf(
                            mapOf("inline_data" to mapOf("mime_type" to media, "data" to imageBase64)),
                            mapOf("text" to "이 성분표를 분석해 스키마대로 JSON만 응답해줘."),
                        ),
                    ),
                ),
                "generationConfig" to mapOf("responseMimeType" to "application/json"),
            ),
        )
        val request = HttpRequest.newBuilder(
            URI.create("https://generativelanguage.googleapis.com/v1beta/models/$geminiModel:generateContent"),
        )
            .header("x-goog-api-key", geminiKey)
            .header("content-type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build()

        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() !in 200..299) {
            return mapOf("error" to "gemini ${response.statusCode()}: ${response.body().take(300)}")
        }
        val root = json.readValue(response.body(), Map::class.java)
        val parts = (((root["candidates"] as? List<*>)?.firstOrNull() as? Map<*, *>)
            ?.get("content") as? Map<*, *>)
            ?.get("parts") as? List<*>
        val text = parts?.filterIsInstance<Map<*, *>>()
            ?.firstOrNull { it["text"] != null }
            ?.get("text") as? String
            ?: return mapOf("error" to "empty gemini response")
        return json.readValue(stripFence(text), Map::class.java)
    }

    /** Anthropic Claude (messages) — 폴백. */
    private fun callClaude(imageBase64: String, media: String): Any {
        val body = json.writeValueAsString(
            mapOf(
                "model" to anthropicModel,
                "max_tokens" to 1500,
                "system" to systemPrompt(),
                "messages" to listOf(
                    mapOf(
                        "role" to "user",
                        "content" to listOf(
                            mapOf(
                                "type" to "image",
                                "source" to mapOf("type" to "base64", "media_type" to media, "data" to imageBase64),
                            ),
                            mapOf("type" to "text", "text" to "이 성분표를 분석해 스키마대로 JSON만 응답해줘."),
                        ),
                    ),
                ),
            ),
        )
        val request = HttpRequest.newBuilder(URI.create("https://api.anthropic.com/v1/messages"))
            .header("x-api-key", anthropicKey)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build()

        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() !in 200..299) {
            return mapOf("error" to "anthropic ${response.statusCode()}: ${response.body().take(300)}")
        }
        val root = json.readValue(response.body(), Map::class.java)
        val text = (root["content"] as? List<*>)
            ?.filterIsInstance<Map<*, *>>()
            ?.firstOrNull { it["type"] == "text" }
            ?.get("text") as? String
            ?: return mapOf("error" to "empty anthropic response")
        return json.readValue(stripFence(text), Map::class.java)
    }

    private fun demo(): Any = json.readValue(DEMO, Map::class.java)

    private fun stripFence(text: String): String {
        val t = text.trim()
        if (!t.startsWith("```")) return t
        return t.removePrefix("```").substringAfter('\n').substringBeforeLast("```").trim()
    }

    private fun systemPrompt(): String = """
        너는 식품 성분표 이미지를 분석하는 도우미다. 아래 지식베이스(교차검증된 성분 리스크 리포트)만을 리스크 판단 근거로 쓴다.

        <knowledge_base>
        $kb
        </knowledge_base>

        작업:
        1) 이미지에서 원재료명(전성분)을 모두 추출한다.
        2) 각 원재료가 지식베이스에서 다뤄지면 그 내용으로 risk/evidence/consensus/source를 채운다.
           지식베이스에 없으면 risk="unknown", reason은 빈 문자열로 둔다. 근거 없는 단정은 금지한다.
        3) grade는 성분 중 최악 기준(위험>주의>양호). caution_count는 risk가 warn·bad인 개수.

        반드시 아래 JSON 스키마로만 응답한다(설명·코드펜스 없이 JSON만):
        {"product":"추정 제품명","summary":{"grade":"good|warn|bad","caution_count":0,"note":"한 줄 요약(음슴체)"},
        "ingredients":[{"name":"성분명","risk":"good|warn|bad|unknown","reason":"KB 근거 한 줄","evidence":"근거레벨","consensus":"컨센서스|논쟁|-","source":"출처"}]}
    """.trimIndent()

    companion object {
        // 키 미설정 시 UI/계약 확인용 데모(셀렉스 프로핏 라벨 기준)
        private val DEMO = """
            {"product":"셀렉스 프로핏 SPORTS 초콜릿 (데모)",
             "summary":{"grade":"warn","caution_count":4,"note":"인체 RCT·논쟁 단계 첨가물이 다수임. GEMINI_API_KEY 또는 ANTHROPIC_API_KEY 설정 시 실제 분석함."},
             "ingredients":[
               {"name":"카라기난","risk":"warn","reason":"동물실험서 장 점액층 손상·SCFA 감소, 인체 재현 근거는 부족함.","evidence":"동물실험","consensus":"논쟁","source":"EFSA 2018 / Carbohydrate Polymers 2022"},
               {"name":"CMC(카복시메틸셀룰로스)","risk":"warn","reason":"유화제로 장벽·미생물총 교란 근거(동물·ex vivo), 인체 RCT는 제한적임.","evidence":"동물/ex vivo","consensus":"논쟁","source":"Gut 2017"},
               {"name":"수크랄로스","risk":"warn","reason":"RCT서 혈당내성 저하 보고, 개인차 큼.","evidence":"RCT","consensus":"논쟁","source":"Cell 2022"},
               {"name":"아세설팜칼륨","risk":"warn","reason":"국제기구 ADI 이내이나 감미료 대사영향은 연구 중임.","evidence":"국제기구","consensus":"논쟁","source":"NCI 팩트시트"},
               {"name":"분리유청단백","risk":"unknown","reason":"","evidence":"","consensus":"-","source":""},
               {"name":"코코아파우더","risk":"unknown","reason":"","evidence":"","consensus":"-","source":""}]}
        """.trimIndent()
    }
}
