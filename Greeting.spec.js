import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Greeting from '../../src/components/Greeting.vue';

describe('Greeting.vue', () => {
  it('renders props.msg when passed', () => {
    const msg = 'Hello Tester';
    const wrapper = mount(Greeting, {
      props: { msg }
    });
    // Assert the rendered text is correct
    expect(wrapper.text()).toContain(msg);
  });
});