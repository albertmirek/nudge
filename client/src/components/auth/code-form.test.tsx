import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { CodeForm } from './code-form';
import * as stories from './code-form.stories';

const baseProps = {
  values: { code: '' },
  onChange: () => {},
  onSubmit: () => {},
  submitLabel: 'Verify',
};

describe('CodeForm', () => {
  it('renders the code field and CTA', async () => {
    await renderWithTheme(<CodeForm {...baseProps} />);
    const input = screen.getByLabelText('Code');
    expect(input).toBeOnTheScreen();
    expect(input).toHaveProp('keyboardType', 'number-pad');
    expect(input).toHaveProp('maxLength', 6);
    expect(screen.getByRole('button', { name: 'Verify' })).toBeOnTheScreen();
  });

  it('does not show the resend link without onResend', async () => {
    await renderWithTheme(<CodeForm {...baseProps} />);
    expect(screen.queryByRole('link', { name: 'Resend code' })).toBeNull();
  });

  it('shows the resend link when onResend is given', async () => {
    await renderWithTheme(<CodeForm {...baseProps} onResend={() => {}} />);
    expect(screen.getByRole('link', { name: 'Resend code' })).toBeOnTheScreen();
  });

  it('reports edits with the full values object', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<CodeForm {...baseProps} onChange={onChange} />);
    await userEvent.setup().type(screen.getByLabelText('Code'), '1');
    expect(onChange).toHaveBeenLastCalledWith({ code: '1' });
  });

  it('submits from the CTA and shows server errors', async () => {
    const onSubmit = jest.fn();
    await renderWithTheme(
      <CodeForm {...baseProps} onSubmit={onSubmit} serverError="Code expired" />,
    );
    expect(screen.getByText('Code expired')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Verify' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables the CTA while loading', async () => {
    await renderWithTheme(<CodeForm {...baseProps} loading />);
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled();
  });

  it('shows field errors', async () => {
    await renderWithTheme(<CodeForm {...baseProps} errors={{ code: 'Enter the 6-digit code' }} />);
    expect(screen.getByText('Enter the 6-digit code')).toBeOnTheScreen();
  });
});

describeStories('CodeForm', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
