import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { SignUpForm } from './sign-up-form';
import * as stories from './sign-up-form.stories';

const baseProps = {
  values: { email: '', password: '' },
  onChange: () => {},
  onSubmit: () => {},
  onSignIn: () => {},
};

describe('SignUpForm', () => {
  it('renders email, password, CTA and link', async () => {
    await renderWithTheme(<SignUpForm {...baseProps} />);
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
    expect(screen.getByLabelText('Password')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeOnTheScreen();
    expect(screen.getByText('At least 8 characters')).toBeOnTheScreen();
  });

  it('reports edits with the full values object', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<SignUpForm {...baseProps} onChange={onChange} />);
    await userEvent.setup().type(screen.getByLabelText('Email'), 'a');
    expect(onChange).toHaveBeenLastCalledWith({ email: 'a', password: '' });
  });

  it('submits from the CTA and shows server errors', async () => {
    const onSubmit = jest.fn();
    await renderWithTheme(
      <SignUpForm {...baseProps} onSubmit={onSubmit} serverError="Email already in use" />,
    );
    expect(screen.getByText('Email already in use')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Create account' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables the CTA while loading', async () => {
    await renderWithTheme(<SignUpForm {...baseProps} loading />);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
  });

  it('shows field errors', async () => {
    await renderWithTheme(<SignUpForm {...baseProps} errors={{ email: 'Enter your email' }} />);
    expect(screen.getByText('Enter your email')).toBeOnTheScreen();
  });
});

describeStories('SignUpForm', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
