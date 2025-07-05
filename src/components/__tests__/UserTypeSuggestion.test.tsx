import { render, screen, fireEvent } from '@testing-library/react';
import UserTypeSuggestion from '../UserTypeSuggestion';

describe('UserTypeSuggestion', () => {
  it('renders low user suggestion', () => {
    render(
      <UserTypeSuggestion
        predictedYearlyUsage={5000}
        suggestedUserType="low"
        onSetUserType={jest.fn()}
      />
    );
    expect(screen.getByText(/Predicted yearly usage/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Low User/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Use this/i })).toBeInTheDocument();
  });

  it('renders standard user suggestion', () => {
    render(
      <UserTypeSuggestion
        predictedYearlyUsage={9000}
        suggestedUserType="standard"
        onSetUserType={jest.fn()}
      />
    );
    expect(screen.getByText(/Predicted yearly usage/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Standard User/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Use this/i })).toBeInTheDocument();
  });

  it('calls onSetUserType with correct value', () => {
    const onSetUserType = jest.fn();
    render(
      <UserTypeSuggestion
        predictedYearlyUsage={9000}
        suggestedUserType="standard"
        onSetUserType={onSetUserType}
      />
    );
    const btn = screen.getByRole('button', { name: /Use this/i });
    fireEvent.click(btn);
    expect(onSetUserType).toHaveBeenCalledWith('standard');
  });

  it('renders nothing if suggestedUserType is null', () => {
    const { container } = render(
      <UserTypeSuggestion
        predictedYearlyUsage={0}
        suggestedUserType={null}
        onSetUserType={jest.fn()}
      />
    );
    expect(container.querySelector('[aria-live="polite"]')).toBeNull();
  });

  it('is accessible: button has aria-describedby', () => {
    render(
      <UserTypeSuggestion
        predictedYearlyUsage={5000}
        suggestedUserType="low"
        onSetUserType={jest.fn()}
      />
    );
    const btn = screen.getByRole('button', { name: /Use this/i });
    expect(btn).toHaveAttribute('aria-describedby');
  });
});
