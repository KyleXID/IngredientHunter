package io.heumlabs.ingredienthunter.analysis

import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class AnalyzeController(private val analyzeService: AnalyzeService) {

    @PostMapping("/analyze")
    fun analyze(@RequestBody request: AnalyzeRequest): AnalyzeResult = analyzeService.analyze(request)
}

/**
 * 분석 요청 — 입력 경로 3종(우선순위: ingredientNames > productReportNo > imageBase64).
 * conditions = 건강설문 선택 code(개인화). consent/healthConsent = 로그·민감정보 동의(법령).
 */
data class AnalyzeRequest(
    val imageBase64: String? = null,      // 이미지 경로(멀티파트 대신 base64 JSON)
    val mediaType: String? = null,
    val productReportNo: String? = null,  // 검색 경로(카탈로그 제품) — LLM 없이 판정
    val productName: String? = null,
    val ingredientNames: List<String>? = null,  // 직접 입력(테스트/폴백)
    val conditions: List<String> = emptyList(),  // 선택 건강상태 code(diabetes 등)
    val consent: Boolean = false,          // 사용 기록 분석 동의 → 로그 적재 여부
    val healthConsent: Boolean = false,    // 건강정보(민감정보) 동의 → conditions 저장 여부
    val cookieId: String? = null,          // 로그인 없이 기기 구분(비식별)
)
