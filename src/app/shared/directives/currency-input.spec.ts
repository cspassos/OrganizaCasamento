import { parseReais } from './currency-input';
describe('Brazilian currency input', () => {
  it('reads whole reais, cents and formatted values without changing magnitude', () => {
    expect(parseReais('15000')).toBe(15000);
    expect(parseReais('15.000')).toBe(15000);
    expect(parseReais('R$ 15.000,50')).toBe(15000.5);
    expect(parseReais('15000,50')).toBe(15000.5);
    expect(parseReais('15000.50')).toBe(15000.5);
    expect(parseReais('0,01')).toBe(0.01);
  });
  it('keeps empty, invalid and negative values distinct for validation', () => {
    expect(parseReais('')).toBeNull();
    expect(parseReais('abc')).toBeNaN();
    expect(parseReais('15,000,50')).toBeNaN();
    expect(parseReais('-150,00')).toBe(-150);
  });
});
