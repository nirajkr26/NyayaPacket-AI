import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewCaseModal } from '../NewCaseModal';

describe('NewCaseModal', () => {
  it('opens and submits a new case with category and title', () => {
    const handleClose = vi.fn();
    const handleCreate = vi.fn();

    render(
      <NewCaseModal
        isOpen={true}
        initialCategory="Unpaid Wages"
        onClose={handleClose}
        onCreateCase={handleCreate}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Start a new case/i)).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/Case title/i);
    fireEvent.change(titleInput, { target: { value: 'Pending bonus from TechCorp' } });

    const submitBtn = screen.getByRole('button', { name: /Create case/i });
    fireEvent.click(submitBtn);

    expect(handleCreate).toHaveBeenCalledWith({
      title: 'Pending bonus from TechCorp',
      category: 'Unpaid Wages',
    });
  });
});
