import { mount } from '@vue/test-utils'
import NuvaHero from '../../app/components/NuvaHero.vue'

describe('nuva hero', () => {
  it('renders title, description and product eyebrow', () => {
    const wrapper = mount(NuvaHero, {
      props: {
        title: 'Dashboard Starter',
        description: 'Reusable Nuxt core layer.',
      },
    })

    expect(wrapper.text()).toContain('Nuva Core Layer')
    expect(wrapper.text()).toContain('Dashboard Starter')
    expect(wrapper.text()).toContain('Reusable Nuxt core layer.')
  })

  it('omits description paragraph when description is not provided', () => {
    const wrapper = mount(NuvaHero, {
      props: {
        title: 'Dashboard Starter',
      },
    })

    expect(wrapper.find('h1').text()).toBe('Dashboard Starter')
    expect(wrapper.find('p.mt-4').exists()).toBe(false)
  })
})
