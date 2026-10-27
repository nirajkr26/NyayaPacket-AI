import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CaseCard } from '../CaseCard';
import { INITIAL_CASES } from '../../data/mock';

describe('CaseCard', () => {
  it('renders case details: title, category chip, state chip, evidence count, and Open button', () => {
    const testCase = INITIAL_CASES[0];
    render(<CaseCard caseData={testCase} onOpen={() => {}} />);

    expect(screen.getByText('Salary not paid for 2 months')).toBeInTheDocument();
    expect(screen.getByText('Unpaid Wages')).toBeInTheDocument();
    expect(screen.getByText('Verification')).toBeInTheDocument();
    expect(screen.getByText(/5 evidence files/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open case: Salary not paid for 2 months/i })).toBeInTheDocument();
  });
});
