import {
  newDesign,
  invitationToken,
  renderMessage,
  whatsappUrl,
  recipientGroup,
  validateDesign,
} from './invitations';
import { invitationSvg } from './invitation-art';
import { emptyPeople, newGuest } from './people';
describe('Convites, renderização e mensagens', () => {
  const wedding = {
    id: 'w',
    name: 'Casamento',
    date: '2027-09-20',
    brideName: 'Ana',
    groomName: 'João',
    demo: false,
  };
  it('escapa texto no SVG e rejeita imagem ativa ou cor injetada', () => {
    const d = newDesign(wedding);
    d.bride = '<script>alert(1)</script>';
    const svg = invitationSvg(d);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(() => validateDesign({ ...d, photo: 'data:image/svg+xml;base64,AAAA' })).toThrow(
      'imagem',
    );
    expect(() => validateDesign({ ...d, color: 'red" onload="alert(1)' })).toThrow('cores');
  });
  it('agrupa acompanhantes sem família no mesmo convite e gera tokens opacos', () => {
    const p = emptyPeople('w'),
      main = { ...newGuest('w'), name: 'Ana' };
    p.guests.push(main, { ...newGuest('w'), name: 'Beto', companionOf: main.id });
    expect(recipientGroup(p, p.guests[1].id).members).toHaveLength(2);
    const a = invitationToken(),
      b = invitationToken();
    expect(a).toHaveLength(64);
    expect(a).not.toBe(b);
  });
  it('substitui dados pessoais na mensagem e gera URL oficial sem abrir ou marcar envio', () => {
    const g = { ...newGuest('w'), name: 'Maria & José', phone: '(11) 99999-8888' },
      d = newDesign(wedding);
    const message = renderMessage('Olá, {nome}! {noivos}, {data}. {link}', g, d),
      url = new URL(whatsappUrl(g.phone, message));
    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe('/5511999998888');
    expect(url.searchParams.get('text')).toContain('Maria & José');
    expect(message).toContain('20/09/2027');
    expect(message).not.toContain('localhost');
  });
});
