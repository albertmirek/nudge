import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';
import { ChoiceChips } from '@/ui';

import * as stories from './choice-chips.stories';

const OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
] as const;

describe('ChoiceChips', () => {
  it('renders one radio per option under the label and marks the selected one', async () => {
    await renderWithTheme(
      <ChoiceChips
        label="Contact Frequency"
        options={OPTIONS}
        value="MONTHLY"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('Contact Frequency')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Monthly' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Weekly' })).not.toBeChecked();
  });

  it('reports the tapped option', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <ChoiceChips label="Contact Frequency" options={OPTIONS} value={null} onChange={onChange} />,
    );
    await userEvent.setup().press(screen.getByRole('radio', { name: 'Weekly' }));
    expect(onChange).toHaveBeenCalledWith('WEEKLY');
  });

  it('shows an error message', async () => {
    await renderWithTheme(
      <ChoiceChips
        label="Contact Frequency"
        options={OPTIONS}
        value={null}
        onChange={() => {}}
        error="Pick one"
      />,
    );
    expect(screen.getByText('Pick one')).toBeOnTheScreen();
  });
});

describeStories('ChoiceChips', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
