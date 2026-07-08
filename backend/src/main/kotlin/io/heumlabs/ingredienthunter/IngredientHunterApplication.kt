package io.heumlabs.ingredienthunter

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class IngredientHunterApplication

fun main(args: Array<String>) {
	runApplication<IngredientHunterApplication>(*args)
}
