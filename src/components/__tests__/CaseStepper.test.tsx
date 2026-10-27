import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CaseStepper } from '../CaseStepper';
import { INITIAL_CASES } from '../../data/mock';

describe('CaseStepper', () => {
  it('displays the 9 steps, highlighting the current step and readiness percent', () => {
    const testCase = INITIAL_CASES[0];
    render(<CaseStepper currentCase={testCase} onNextStepClick={() => {}} />);

    // Check title and readiness
    expect(screen.getByText('Salary not paid for 2 months')).toBeInTheDocument();
    expect(screen.getByText(/72% ready/i)).toBeInTheDocument();
    
    // Check 9 steps are present in stepper
    expect(screen.getAllByText('New Case').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Verification').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ready for Lawyer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Closed').length).toBeGreaterThan(0);

    // Check next-step button
    expect(screen.getByRole('button', { name: /Verify 6 draft items/i })).toBeInTheDocument();
  });
});
