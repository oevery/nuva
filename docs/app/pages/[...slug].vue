<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'
import { findPageHeadline } from '@nuxt/content/utils'

definePageMeta({
  layout: 'docs',
})

const route = useRoute()
const { toc } = useAppConfig()
const navigation = inject<Ref<ContentNavigationItem[] | undefined>>('navigation')

const { data: page } = await useAsyncData(route.path, () => queryCollection('docs').path(route.path).first())

if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
    fatal: true,
  })
}

const { data: surround } = await useAsyncData(`${route.path}-surround`, () => {
  return queryCollectionItemSurroundings('docs', route.path, {
    fields: ['description'],
  })
})

const title = computed(() => page.value?.seo?.title || page.value?.title || 'Nuva Docs')
const description = computed(() => page.value?.seo?.description || page.value?.description || 'Nuva 官方文档')

useSeoMeta({
  title: () => title.value,
  ogTitle: () => title.value,
  description: () => description.value,
  ogDescription: () => description.value,
})

const headline = computed(() => findPageHeadline(navigation?.value, page.value?.path))

const links = computed(() => toc.bottom?.links ?? [])
</script>

<template>
  <UPage v-if="page">
    <UPageHeader
      :title="page.title"
      :description="page.description"
      :headline="headline"
    >
      <template #links>
        <UButton
          v-for="(link, index) in page.links"
          :key="index"
          v-bind="link"
        />
      </template>
    </UPageHeader>

    <UPageBody>
      <ContentRenderer :value="page" />

      <USeparator v-if="surround?.length" />

      <UContentSurround :surround="surround" />
    </UPageBody>

    <template
      v-if="page.body?.toc?.links?.length"
      #right
    >
      <UContentToc
        :title="toc.title"
        :links="page.body.toc.links"
      >
        <template
          v-if="links.length"
          #bottom
        >
          <div
            class="hidden space-y-6 lg:block"
            :class="{ 'mt-6!': page.body.toc.links.length }"
          >
            <USeparator type="dashed" />

            <UPageLinks
              :title="toc.bottom.title"
              :links="links"
            />
          </div>
        </template>
      </UContentToc>
    </template>
  </UPage>
</template>
