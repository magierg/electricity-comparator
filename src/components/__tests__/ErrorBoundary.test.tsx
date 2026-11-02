import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

function Boom(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders the default fallback with error details', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    expect(screen.getByText(/error details/i)).toBeInTheDocument();
    expect(screen.getByText(/error: boom/i)).toBeInTheDocument();
  });

  it('renders a custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>Safe content</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });
});
