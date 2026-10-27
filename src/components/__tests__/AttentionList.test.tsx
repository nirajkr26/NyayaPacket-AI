import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttentionList } from '../AttentionList';
import { INITIAL_ATTENTION_ITEMS } from '../../data/mock';

describe('AttentionList', () => {
  it('renders attention items with distinct AI draft and You wrote this tags', () => {
    render(<AttentionList items={INITIAL_ATTENTION_ITEMS} onToggleResolve={() => {}} />);

    expect(screen.getByText('Needs your attention')).toBeInTheDocument();
    
    // Look for AI draft chips
    const aiChips = screen.getAllByText('AI draft');
    expect(aiChips.length).toBeGreaterThan(0);

    // Look for citizen written chips
    const citizenChips = screen.getAllByText('You wrote this');
    expect(citizenChips.length).toBeGreaterThan(0);
  });
});
