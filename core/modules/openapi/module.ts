import { existsSync } from 'node:fs'
import { addTemplate, defineNuxtModule } from '@nuxt/kit'

export interface NuvaOpenapiOptions {
  /** OpenAPI/Swagger json URL or local file path. */
  input?: string
  /** Generated API output directory. */
  output?: string
  /** alova global API export name. */
  global?: string
  /** Whether to generate alova.config.ts. */
  config?: boolean
  /** Whether to generate useGeneratedApis helper. */
  composable?: boolean
}

function normalizeOutput(output: string) {
  return output.replace(/^~\/?/, '').replace(/^\.\//, '').replace(/\/$/, '')
}

function toRootRelativePath(path: string, rootDir: string) {
  return path.startsWith(rootDir) ? path.slice(rootDir.length).replace(/^\//, '') : path
}

function createAlovaConfig(options: Required<NuvaOpenapiOptions>) {
  return `import { defineConfig } from '@alova/wormhole'
import { rename } from '@alova/wormhole/plugin'

export default defineConfig({
  generator: [
    {
      input: ${JSON.stringify(options.input)},
      output: ${JSON.stringify(options.output)},
      platform: 'swagger',
      global: ${JSON.stringify(options.global)},
      type: 'auto',
      plugins: [
        rename({ style: 'camelCase' }),
      ],
    },
  ],
  autoUpdate: false,
})
`
}

function createGeneratedApisComposable(output: string, generatedExists: boolean) {
  const normalizedOutput = normalizeOutput(output)

  if (!generatedExists) {
    return `export function useGeneratedApis(): never {
  throw new Error('[nuva/openapi] Generated APIs are missing. Run \`alova gen\` before using useGeneratedApis().')
}

export type GeneratedApis = never
`
  }

  return `import { createApis, withConfigType } from '~~/${normalizedOutput}/createApis'
import { useHttpClient } from '#imports'

export const $$generatedConfigMap = withConfigType({})

export function useGeneratedApis() {
  return createApis(useHttpClient(), $$generatedConfigMap)
}

export type GeneratedApis = ReturnType<typeof useGeneratedApis>
`
}

export default defineNuxtModule<NuvaOpenapiOptions>({
  meta: {
    name: '@oevery/nuva/openapi',
    configKey: 'nuvaOpenapi',
  },
  defaults: {
    input: 'http://localhost:3000/openapi.json',
    output: 'app/api/generated',
    global: 'Apis',
    config: true,
    composable: true,
  },
  setup(options, nuxt) {
    const srcDir = nuxt.options.srcDir
    const appApiDir = `${srcDir}/api`
    const resolvedOptions = {
      input: options.input || 'http://localhost:3000/openapi.json',
      output: options.output || 'app/api/generated',
      global: options.global || 'Apis',
      config: options.config ?? true,
      composable: options.composable ?? true,
    }

    if (resolvedOptions.config) {
      addTemplate({
        filename: 'nuva/openapi/alova.config.ts',
        dst: `${nuxt.options.rootDir}/alova.config.ts`,
        write: true,
        getContents: () => createAlovaConfig(resolvedOptions),
      })
    }

    if (resolvedOptions.composable) {
      const outputPath = `${nuxt.options.rootDir}/${normalizeOutput(resolvedOptions.output)}/createApis.ts`
      const generatedExists = existsSync(outputPath)

      const generatedApisTemplate = addTemplate({
        filename: 'nuva/openapi/useGeneratedApis.ts',
        dst: `${appApiDir}/useGeneratedApis.ts`,
        write: true,
        getContents: () => createGeneratedApisComposable(toRootRelativePath(resolvedOptions.output, nuxt.options.rootDir), generatedExists),
      })
      nuxt.options.alias ||= {}
      nuxt.options.alias['#nuva/openapi'] = generatedApisTemplate.dst
    }
  },
})
