import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Login } from '../src/pages/Login';
import { AuthProvider } from '../src/context/AuthContext';

describe('Login Component Tests', () => {
  it('should render the login form inputs and title', () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    // Title Check
    expect(screen.getByText('NADRA Portal')).toBeInTheDocument();
    expect(screen.getByText('National Database Management Login')).toBeInTheDocument();

    // Inputs Check
    expect(screen.getByPlaceholderText('Administrator Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();

    // Submit Button Check
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('allows entering username and password', () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const usernameInput = screen.getByPlaceholderText('Administrator Username') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement;

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'admin123' } });

    expect(usernameInput.value).toBe('admin');
    expect(passwordInput.value).toBe('admin123');
  });
});
