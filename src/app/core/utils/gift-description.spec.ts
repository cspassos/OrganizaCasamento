import { describe, expect, it } from 'vitest';
import { giftDescription } from './gift-description';

describe('gift descriptions pasted from shops', () => {
  it('omits the title and repeated lines, preserving distinct specifications', () => {
    expect(
      giftDescription(
        'Panela\r\nAço inox\n AÇO   INOX \nCapacidade: 5 litros\n\nAço inox',
        'Panela',
      ),
    ).toBe('Aço inox\nCapacidade: 5 litros');
  });
  it('does not substitute another product or change the source text', () => {
    const source = 'Air Fryer 25L\nAir Fryer 25L\nGarantia de 12 meses';
    expect(giftDescription(source, 'Liquidificador')).toBe('Air Fryer 25L\nGarantia de 12 meses');
    expect(source).toBe('Air Fryer 25L\nAir Fryer 25L\nGarantia de 12 meses');
    expect(giftDescription('', 'Presente')).toBe('');
  });
});
