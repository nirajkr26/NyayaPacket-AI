import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DisclaimerBanner } from '../DisclaimerBanner';

describe('DisclaimerBanner', () => {
  it('renders the mandatory legal disclaimer message', () => {
    render(<DisclaimerBanner />);
    expect(
      screen.getByText(/NyayaPacket AI helps you organize your case\. It is not legal advice\. A lawyer will review your packet\./i)
    ).toBeInTheDocument();
  });
});
