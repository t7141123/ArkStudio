<template>
  <section class="section legal-page">
    <div class="container legal-container">
      <h1 class="legal-title">{{ doc.title }}</h1>
      <p class="legal-updated">{{ updated }}</p>
      <p class="legal-text">{{ doc.intro }}</p>
      <section v-for="(section, i) in doc.sections" :key="i" class="legal-section">
        <h2 class="legal-heading">{{ section.h }}</h2>
        <p v-for="(para, j) in section.p" :key="j" class="legal-text">{{ para }}</p>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({ kind: { type: String, required: true } })
const { t, tm, rt } = useI18n()

// Resolve the message tree once per locale change.
const doc = computed(() => {
  const raw = tm(`legal.${props.kind}`)
  return {
    title: rt(raw.title),
    intro: rt(raw.intro),
    sections: (raw.sections || []).map((s) => ({ h: rt(s.h), p: (s.p || []).map((x) => rt(x)) }))
  }
})
const updated = computed(() => t('legal.updated'))
</script>

<style scoped>
.legal-page { padding-top: 7rem; }
.legal-container { max-width: 760px; }
.legal-title { font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem; }
.legal-updated { color: var(--text-muted, #6b7280); font-size: 0.9rem; margin-bottom: 1.5rem; }
.legal-heading { font-size: 1.2rem; font-weight: 600; margin: 1.75rem 0 0.5rem; }
.legal-text { line-height: 1.75; margin-bottom: 0.75rem; }
</style>
