package io.heumlabs.ingredienthunter.survey

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 건강설문 마스터 — 화면 문항을 DB에서 관리(하드코딩 제거).
 * Flyway V4 health_survey 테이블 + V5 시드(Confluence healthCondition DB 미러)와 1:1.
 * 프론트 CONDITION_GROUPS 와 같은 모양으로 내려줘 배선을 최소화한다.
 */
@Entity
@Table(name = "health_survey")
class HealthSurvey(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) val id: Long = 0,
    @Column(nullable = false, length = 40) val code: String = "",       // 프론트 안정 키
    @Column(nullable = false, length = 30) val category: String = "",   // 그룹(생애주기·질환·체질·알레르기)
    @Column(nullable = false, length = 60) val label: String = "",      // 화면 표기명
    @Column(length = 120) val description: String? = null,
    @Column(name = "display_order", nullable = false) val displayOrder: Int = 0,
    @Column(nullable = false) val active: Boolean = true,
)

interface HealthSurveyRepository : JpaRepository<HealthSurvey, Long> {
    fun findByActiveTrueOrderByDisplayOrder(): List<HealthSurvey>
}

@RestController
@RequestMapping("/api/health-survey")
class HealthSurveyController(private val repo: HealthSurveyRepository) {

    /** 카테고리별 그룹으로 반환 — [{group, items:[{id, label, desc}]}]. 첫 등장 순서로 그룹 정렬. */
    @GetMapping
    fun groups(): List<Map<String, Any?>> {
        val byCategory = LinkedHashMap<String, MutableList<HealthSurvey>>()
        for (item in repo.findByActiveTrueOrderByDisplayOrder()) {
            byCategory.getOrPut(item.category) { mutableListOf() }.add(item)
        }
        return byCategory.map { (group, items) ->
            mapOf(
                "group" to group,
                "items" to items.map { mapOf("id" to it.code, "label" to it.label, "desc" to it.description) },
            )
        }
    }
}
