import { screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { Text } from '@/ui';

describe('Text', () => {
  it('renders body/primary by default', async () => {
    await renderWithTheme(<Text>Hello</Text>);
    expect(screen.getByText('Hello')).toHaveStyle({ fontSize: 15, color: '#151518' });
  });

  it('applies the variant and colour tokens', async () => {
    await renderWithTheme(
      <Text variant="bodyLight" color="secondary">
        Meta
      </Text>,
    );
    expect(screen.getByText('Meta')).toHaveStyle({ fontSize: 12, color: '#8a8a8f' });
  });

  it('follows the dark theme', async () => {
    await renderWithTheme(<Text>Hello</Text>, { scheme: 'dark' });
    expect(screen.getByText('Hello')).toHaveStyle({ color: '#f8f8f8' });
  });

  it('lets callers append styles and pass Text props through', async () => {
    await renderWithTheme(
      <Text numberOfLines={1} style={{ textAlign: 'right' }}>
        Hello
      </Text>,
    );
    const node = screen.getByText('Hello');
    expect(node).toHaveStyle({ textAlign: 'right', fontSize: 15 });
    expect(node.props.numberOfLines).toBe(1);
  });
});
