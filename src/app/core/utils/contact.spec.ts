import { formatPhone, validEmail, validPhone } from './contact';
describe('Contatos brasileiros', () => {
  it('formata fixos, celulares e prefixo brasileiro sem cortar números excedentes', () => {
    expect(formatPhone('1134567890')).toBe('(11) 3456-7890');
    expect(formatPhone('+55 11 99999-8888')).toBe('(11) 99999-8888');
    expect(validPhone('11999998888888')).toBe(false);
    expect(validPhone('123')).toBe(false);
    expect(validPhone('11988887777')).toBe(true);
    expect(validPhone('abc11999998888')).toBe(false);
    expect(validPhone('')).toBe(true);
  });
  it('exige domínio completo e rejeita espaços, arrobas duplicadas e domínio inválido', () => {
    for (const email of [
      'pessoa',
      'pessoa@dominio',
      'a@@exemplo.com',
      'a b@exemplo.com',
      'a@-exemplo.com',
    ])
      expect(validEmail(email)).toBe(false);
    expect(validEmail('ana.souza+casamento@exemplo.com.br')).toBe(true);
    expect(validEmail('')).toBe(true);
  });
});
