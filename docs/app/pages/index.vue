<script setup lang="ts">
const { data: page } = await useAsyncData('landing', () => queryCollection('landing').path('/').first())

if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
    fatal: true,
  })
}

const title = computed(() => page.value?.seo?.title || page.value?.title || 'Nuva 官方文档')
const description = computed(() => page.value?.seo?.description || page.value?.description || 'Nuva 官方文档')
const hero = computed(() => page.value?.hero)
const sections = computed(() => page.value?.sections ?? [])
const primarySections = computed(() => sections.value.slice(0, 2))
const guideSection = computed(() => sections.value[2])

useSeoMeta({
  title: () => title.value,
  ogTitle: () => title.value,
  description: () => description.value,
  ogDescription: () => description.value,
})
</script>

<template>
  <div v-if="page">
    <section
      v-if="hero"
      class="relative overflow-hidden border-b border-muted bg-elevated/20 py-12 sm:py-14 lg:py-18"
    >
      <UContainer>
        <div class="mx-auto flex max-w-5xl flex-col items-center text-center">
          <p
            v-if="hero.tagline"
            class="rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-medium text-primary"
          >
            {{ hero.tagline }}
          </p>

          <h1 class="mt-6 max-w-4xl text-balance text-4xl font-bold tracking-tight text-highlighted sm:text-5xl lg:text-[3.85rem] lg:leading-[1.08]">
            {{ hero.title }}
          </h1>

          <p class="mt-5 max-w-3xl text-pretty text-base leading-8 text-toned sm:text-lg">
            {{ hero.description }}
          </p>

          <div class="mt-10 flex justify-center">
            <UButton
              v-for="(link, index) in hero.links"
              :key="index"
              v-bind="link"
              size="xl"
              class="justify-center"
            />
          </div>
        </div>
      </UContainer>
    </section>

    <UPageSection
      v-for="section in primarySections"
      :key="section.title"
      :title="section.title"
      :description="section.description"
      :features="section.features"
    />

    <section
      v-if="guideSection"
      class="border-b border-muted bg-elevated/10 py-18 sm:py-20"
    >
      <UContainer>
        <div class="mx-auto max-w-3xl text-center">
          <h2 class="text-balance text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
            {{ guideSection.title }}
          </h2>

          <p
            v-if="guideSection.description"
            class="mt-4 text-pretty text-base leading-8 text-toned sm:text-lg"
          >
            {{ guideSection.description }}
          </p>
        </div>

        <div class="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <UCard
            v-for="feature in guideSection.features"
            :key="feature.title"
            as="a"
            :href="feature.to"
            class="group border border-default/70 bg-default/70 transition-colors hover:border-primary/50"
          >
            <template #header>
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-center gap-3">
                  <UIcon
                    :name="feature.icon"
                    class="mt-0.5 text-lg text-primary"
                  />
                  <h3 class="text-base font-semibold text-highlighted">
                    {{ feature.title }}
                  </h3>
                </div>

                <UIcon
                  name="i-lucide-arrow-up-right"
                  class="text-base text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                />
              </div>
            </template>

            <p class="text-sm leading-7 text-toned">
              {{ feature.description }}
            </p>
          </UCard>
        </div>
      </UContainer>
    </section>
  </div>
</template>
