import { fireEvent, render, screen } from '@testing-library/react';
import UserTypeToggle from '../UserTypeToggle';

describe('UserTypeToggle', () => {
  it('changes the selected user type', () => {
    const onChange = jest.fn();
    render(
      <UserTypeToggle
        value="standard"
        suggested="standard"
        annualKwh={9000}
        onChange={onChange}
        onUseSuggested={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /standard user/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: /low user/i }));
    expect(onChange).toHaveBeenCalledWith('low');
  });

  it('offers the suggestion when the manual choice differs', () => {
    const onUseSuggested = jest.fn();
    render(
      <UserTypeToggle
        value="low"
        suggested="standard"
        annualKwh={9000}
        onChange={jest.fn()}
        onUseSuggested={onUseSuggested}
      />,
    );

    expect(screen.getByText(/suggested:/i).parentElement).toHaveTextContent(/standard user/i);
    fireEvent.click(screen.getByRole('button', { name: /use suggestion/i }));
    expect(onUseSuggested).toHaveBeenCalled();
  });

  it('hides the suggestion button when the selected type matches', () => {
    render(
      <UserTypeToggle
        value="low"
        suggested="low"
        annualKwh={5000}
        onChange={jest.fn()}
        onUseSuggested={jest.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /use suggestion/i }),
    ).not.toBeInTheDocument();
  });
});
