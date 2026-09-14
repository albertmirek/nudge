import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';
import { Avatar } from '@/ui';

import * as stories from './avatar.stories';

describe('Avatar', () => {
  it('renders an accent-filled circle when there is no image', async () => {
    await renderWithTheme(<Avatar label="Anastasia Kleisioni" />);
    const node = screen.getByLabelText('Anastasia Kleisioni');
    expect(node).toHaveStyle({
      width: 49,
      height: 49,
      borderRadius: 9999,
      backgroundColor: '#3a448a',
    });
    expect(screen.queryByTestId('avatar-image')).toBeNull();
  });

  it('honours size', async () => {
    await renderWithTheme(<Avatar label="Aku" size={80} />);
    expect(screen.getByLabelText('Aku')).toHaveStyle({ width: 80, height: 80 });
  });

  it('renders the image when a source is given', async () => {
    await renderWithTheme(<Avatar label="Aku" source="https://example.com/aku.png" />);
    const image = screen.getByTestId('avatar-image');
    // expo-image normalises `source` to an array of sources.
    expect(image.props.source).toEqual([{ uri: 'https://example.com/aku.png' }]);
    expect(screen.getByLabelText('Aku')).toHaveStyle({ width: 49, height: 49 });
  });
});

describeStories('Avatar', stories);

it('matches the default story snapshot', async () => {
  const { Placeholder } = composeStories(stories);
  expect((await render(<Placeholder />)).toJSON()).toMatchSnapshot();
});
