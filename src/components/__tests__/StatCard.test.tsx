import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';
import { FolderOpen } from 'lucide-react';

describe('StatCard', () => {
  it('renders title, value, helper text, and icon correctly', () => {
    render(
      <StatCard
        title="Active cases"
        value={3}
        helperText="All ongoing packets"
        icon={<FolderOpen data-testid="test-icon" />}
        badgeColor="teal"
      />
    );

    expect(screen.getByText('Active cases')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('All ongoing packets')).toBeInTheDocument();
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });
});
