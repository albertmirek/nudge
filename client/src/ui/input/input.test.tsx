import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';
import { Input } from '@/ui';
import { useState } from 'react';

import * as stories from './input.stories';

describe('Input', () => {
  it('labels the text field so it is queryable by its label', async () => {
    await renderWithTheme(<Input label="Name" value="" onChangeText={() => {}} />);
    expect(screen.getByLabelText('Name')).toBeOnTheScreen();
    expect(screen.getByText('Name')).toBeOnTheScreen();
  });

  it('reports typed text', async () => {
    const onChangeText = jest.fn();
    // Controlled: the harness feeds the value back so each keystroke builds on the last.
    function Harness() {
      const [value, setValue] = useState('');
      return (
        <Input
          label="Name"
          value={value}
          onChangeText={(text) => {
            setValue(text);
            onChangeText(text);
          }}
        />
      );
    }
    await renderWithTheme(<Harness />);
    await userEvent.setup().type(screen.getByLabelText('Name'), 'Al');
    expect(onChangeText).toHaveBeenLastCalledWith('Al');
    expect(screen.getByLabelText('Name')).toHaveDisplayValue('Al');
  });

  it('shows the error under the field and as the field hint', async () => {
    await renderWithTheme(
      <Input
        label="Birthday"
        value="x"
        onChangeText={() => {}}
        error="Use the YYYY-MM-DD format"
      />,
    );
    expect(screen.getByText('Use the YYYY-MM-DD format')).toBeOnTheScreen();
    expect(screen.getByLabelText('Birthday')).toHaveProp(
      'accessibilityHint',
      'Use the YYYY-MM-DD format',
    );
  });

  it('passes native TextInput props through', async () => {
    await renderWithTheme(
      <Input label="Notes" value="" onChangeText={() => {}} multiline placeholder="Anything" />,
    );
    const field = screen.getByLabelText('Notes');
    expect(field.props.multiline).toBe(true);
    expect(screen.getByPlaceholderText('Anything')).toBe(field);
  });
});

describeStories('Input', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
