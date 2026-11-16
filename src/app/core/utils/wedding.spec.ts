import {
  calendarDaysUntil,
  formatCalendarDate,
  isCalendarDate,
  parseDisplayDate,
  validateWedding,
} from './wedding';
import { Wedding } from '../models/models';
const valid: Wedding = {
  id: 'test',
  name: 'Ana e João',
  brideName: 'Ana',
  groomName: 'João',
  date: '2028-02-29',
  initialBudget: 50000,
  estimatedGuests: 80,
  capacity: 100,
  demo: false,
};

describe('Wedding rules', () => {
  it('validates actual calendar dates and leap years', () => {
    expect(isCalendarDate('2028-02-29')).toBe(true);
    for (const date of ['2027-02-29', '2027-04-31', '2027-13-01', '22/05/2027', '0001-01-01'])
      expect(isCalendarDate(date)).toBe(false);
    expect(formatCalendarDate('2027-05-22')).toBe('22/05/2027');
    expect(formatCalendarDate('')).toBe('Data a definir');
    expect(parseDisplayDate('22/05/2027')).toBe('2027-05-22');
    expect(parseDisplayDate('29/02/2027')).toBe('');
    expect(parseDisplayDate('2027-05-22')).toBe('');
  });
  it('counts dates by calendar day, including today and past dates', () => {
    const today = new Date(2027, 4, 22, 23, 59);
    expect(calendarDaysUntil('2027-05-23', today)).toBe(1);
    expect(calendarDaysUntil('2027-05-22', today)).toBe(0);
    expect(calendarDaysUntil('2027-05-21', today)).toBe(-1);
    expect(calendarDaysUntil('', today)).toBeNull();
  });
  it('rejects invalid amounts, fractional guest counts and capacity overflow', () => {
    expect(validateWedding(valid)).toBeNull();
    expect(validateWedding({ ...valid, initialBudget: -1 })).toBeTruthy();
    expect(validateWedding({ ...valid, initialBudget: NaN })).toBeTruthy();
    expect(validateWedding({ ...valid, estimatedGuests: 1.5 })).toBeTruthy();
    expect(validateWedding({ ...valid, estimatedGuests: 101 })).toContain('capacidade');
    expect(validateWedding({ ...valid, capacity: 0 })).toBeNull();
  });
  it('accepts undefined date and custom ceremonies but rejects empty names and invalid times', () => {
    expect(
      validateWedding({ ...valid, date: '', ceremonyType: 'Celebração personalizada' }),
    ).toBeNull();
    expect(validateWedding({ ...valid, name: '   ' })).toBeTruthy();
    expect(validateWedding({ ...valid, ceremonyTime: '25:01' })).toBeTruthy();
    expect(validateWedding({ ...valid, photo: 'data:image/svg+xml;base64,abc' })).toBeTruthy();
  });
});
