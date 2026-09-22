import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { SignInForm } from './sign-in-form';
import * as stories from './sign-in-form.stories';

const baseProps = {
  values: { email: '', password: '' },
  onChange: () => {},
  onSubmit: () => {},
  onForgotPassword: () => {},
  onCreateAccount: () => {},
};

describe('SignInForm', () => {
  it('renders email, password, CTA and both links', async () => {
    await renderWithTheme(<SignInForm {...baseProps} />);
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
    expect(screen.getByLabelText('Password')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Create account' })).toBeOnTheScreen();
  });

  it('reports edits with the full values object', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<SignInForm {...baseProps} onChange={onChange} />);
    await userEvent.setup().type(screen.getByLabelText('Email'), 'a');
    expect(onChange).toHaveBeenLastCalledWith({ email: 'a', password: '' });
  });

  it('submits from the CTA and shows server errors', async () => {
    const onSubmit = jest.fn();
    await renderWithTheme(
      <SignInForm {...baseProps} onSubmit={onSubmit} serverError="Wrong email or password" />,
    );
    expect(screen.getByText('Wrong email or password')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables the CTA while loading', async () => {
    await renderWithTheme(<SignInForm {...baseProps} loading />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  it('shows field errors', async () => {
    await renderWithTheme(<SignInForm {...baseProps} errors={{ email: 'Enter your email' }} />);
    expect(screen.getByText('Enter your email')).toBeOnTheScreen();
  });
});

describeStories('SignInForm', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
