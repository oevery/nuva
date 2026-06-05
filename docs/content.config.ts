import { defineCollection, defineContentConfig, z } from '@nuxt/content'

const buttonColors = ['error', 'primary', 'secondary', 'success', 'info', 'warning', 'neutral'] as const
const buttonVariants = ['link', 'solid', 'outline', 'soft', 'subtle', 'ghost'] as const

export default defineContentConfig({
  collections: {
    landing: defineCollection({
      type: 'page',
      source: 'index.md',
      schema: z.object({
        hero: z.object({
          title: z.string(),
          description: z.string(),
          tagline: z.string().optional(),
          links: z.array(z.object({
            label: z.string(),
            to: z.string(),
            target: z.string().optional(),
            color: z.enum(buttonColors).optional(),
            variant: z.enum(buttonVariants).optional(),
            trailingIcon: z.string().optional(),
          })),
        }),
        quickStart: z.object({
          title: z.string(),
          description: z.string().optional(),
          command: z.string(),
        }).optional(),
        sections: z.array(z.object({
          title: z.string(),
          description: z.string().optional(),
          features: z.array(z.object({
            title: z.string(),
            description: z.string(),
            icon: z.string(),
            to: z.string().optional(),
          })),
        })),
        audience: z.object({
          title: z.string(),
          description: z.string().optional(),
          fits: z.array(z.object({
            title: z.string(),
            description: z.string(),
            icon: z.string(),
          })),
          avoids: z.array(z.object({
            title: z.string(),
            description: z.string(),
            icon: z.string(),
          })),
        }).optional(),
        paths: z.object({
          title: z.string(),
          description: z.string().optional(),
          items: z.array(z.object({
            title: z.string(),
            description: z.string(),
            icon: z.string(),
            to: z.string(),
          })),
        }).optional(),
      }),
    }),
    docs: defineCollection({
      type: 'page',
      source: {
        include: '**',
        exclude: ['index.md'],
      },
      schema: z.object({
        links: z.array(z.object({
          label: z.string(),
          icon: z.string().optional(),
          to: z.string(),
          target: z.string().optional(),
          color: z.enum(buttonColors).optional(),
          variant: z.enum(buttonVariants).optional(),
          trailingIcon: z.string().optional(),
        })).optional(),
      }),
    }),
  },
})
