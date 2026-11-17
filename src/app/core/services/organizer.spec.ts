import { validateOrganizer } from './organizer';
import { OrganizerItem } from '../models/models';
describe('Lembretes e anotações', () => {
  const item: OrganizerItem = {
    id: 'one',
    kind: 'note',
    title: 'Ideia',
    text: 'Detalhes',
    date: '',
    time: '',
    important: false,
    completed: false,
    updatedAt: new Date().toISOString(),
  };
  it('permite nota sem data e exige data real para lembrete', () => {
    expect(() => validateOrganizer([item])).not.toThrow();
    expect(() => validateOrganizer([{ ...item, kind: 'reminder' }])).toThrow();
    expect(() => validateOrganizer([{ ...item, kind: 'reminder', date: '2027-02-30' }])).toThrow();
    expect(() =>
      validateOrganizer([{ ...item, kind: 'reminder', date: '2027-02-28', time: '23:45' }]),
    ).not.toThrow();
  });
  it('rejeita títulos vazios, horários inválidos e ids duplicados', () => {
    expect(() => validateOrganizer([{ ...item, title: '  ' }])).toThrow();
    expect(() => validateOrganizer([{ ...item, time: '25:61' }])).toThrow();
    expect(() => validateOrganizer([item, item])).toThrow();
  });
});
