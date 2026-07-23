package io.heumlabs.ingredienthunter.analysis

import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class AnalyzeController(private val analyzeService: AnalyzeService) {

    @PostMapping("/analyze")
    fun analyze(@RequestBody request: AnalyzeRequest): Any =
        analyzeService.analyze(request.imageBase64, request.mediaType)
}

/** 프론트에서 base64 이미지를 받는다(멀티파트 대신 JSON — POC 단순화). */
data class AnalyzeRequest(
    val imageBase64: String? = null,
    val mediaType: String? = null,
)
