import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { ForgotPasswordForm } from './forgot-password-form';
import * as stories from './forgot-password-form.stories';

const baseProps = {
  values: { email: '' },
  onChange: () => {},
  onSubmit: () => {},
  onBack: () => {},
};

describe('ForgotPasswordForm', () => {
  it('renders the email field, CTA and link', async () => {
    await renderWithTheme(<ForgotPasswordForm {...baseProps} />);
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Send code' })).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toBeOnTheScreen();
  });

  it('reports edits with the full values object', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<ForgotPasswordForm {...baseProps} onChange={onChange} />);
    await userEvent.setup().type(screen.getByLabelText('Email'), 'a');
    expect(onChange).toHaveBeenLastCalledWith({ email: 'a' });
  });

  it('submits from the CTA and shows server errors', async () => {
    const onSubmit = jest.fn();
    await renderWithTheme(
      <ForgotPasswordForm
        {...baseProps}
        onSubmit={onSubmit}
        serverError="No account with that email"
      />,
    );
    expect(screen.getByText('No account with that email')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Send code' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables the CTA while loading', async () => {
    await renderWithTheme(<ForgotPasswordForm {...baseProps} loading />);
    expect(screen.getByRole('button', { name: 'Send code' })).toBeDisabled();
  });

  it('shows field errors', async () => {
    await renderWithTheme(
      <ForgotPasswordForm {...baseProps} errors={{ email: 'Enter your email' }} />,
    );
    expect(screen.getByText('Enter your email')).toBeOnTheScreen();
  });
});

describeStories('ForgotPasswordForm', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
