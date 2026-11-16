import { InvitationDesign } from '../models/invitations';
import { formatCalendarDate } from './wedding';
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
function wrap(text: string, width: number) {
  const words = text
    .trim()
    .split(/\s+/)
    .flatMap((word) =>
      word.length > width ? (word.match(new RegExp(`.{1,${width}}`, 'gu')) ?? []) : [word],
    );
  const lines: string[] = [];
  for (const word of words) {
    if (!word) continue;
    const last = lines.at(-1);
    if (last && last.length + word.length + 1 <= width) lines[lines.length - 1] += ' ' + word;
    else lines.push(word);
  }
  return lines;
}
export function invitationSvg(d: InvitationDesign, recipient = '') {
  const description = [
    d.title,
    recipient ? `Convite para ${recipient}` : '',
    `${d.bride} e ${d.groom}`,
    formatCalendarDate(d.date),
    d.time,
    d.venue,
    d.address,
  ]
    .filter(Boolean)
    .join('. ');
  const e = escape,
    accent = e(d.accent),
    font =
      d.font === 'sans' ? 'DM Sans, Arial, sans-serif' : 'Libre Caslon Display, Georgia, serif';
  const fit = (text: string, size: number) =>
    Array.from(text).reduce(
      (sum, c) =>
        sum + (/\s/.test(c) ? 0.25 : /[MW@&]/.test(c) ? 0.95 : /[A-Z]/.test(c) ? 0.7 : 0.48),
      0,
    ) *
      size >
    690
      ? 'textLength="690" lengthAdjust="spacingAndGlyphs"'
      : '';
  const lines = (
    text: string,
    y: number,
    width: number,
    size: number,
    gap: number,
    extra = '',
    height = Infinity,
  ) => {
    const rows = wrap(text, width),
      spacing = Math.min(gap, height / Math.max(1, rows.length - 1));
    const fontSize = spacing < gap ? Math.min(size, spacing * 0.9) : size;
    return rows
      .map(
        (line, i) =>
          `<text x="420" y="${y + i * spacing}" font-size="${fontSize}" ${extra} ${fit(line, fontSize)}>${e(line)}</text>`,
      )
      .join('');
  };
  const leaves = `<g fill="${accent}" opacity=".35"><path d="M65 270Q175 140 145 65Q65 90 65 270ZM75 220Q230 230 210 125Q130 120 75 220ZM80 160Q75 80 220 60Q230 140 80 160Z"/><path d="M775 930Q665 1060 695 1135Q775 1110 775 930ZM765 980Q610 970 630 1075Q710 1080 765 980ZM760 1040Q765 1120 620 1140Q610 1060 760 1040Z"/></g>`;
  let decoration = `<rect x="38" y="38" width="764" height="1124" fill="none" stroke="${accent}" stroke-width="2"/><rect x="50" y="50" width="740" height="1100" fill="none" stroke="${accent}" stroke-width=".7"/>`;
  if (d.style === 'Floral')
    decoration =
      leaves + `<rect x="55" y="55" width="730" height="1090" fill="none" stroke="${accent}"/>`;
  if (d.style === 'Rústico')
    decoration =
      leaves +
      `<rect x="45" y="45" width="750" height="1110" fill="none" stroke="${accent}" stroke-dasharray="4 8"/>`;
  if (d.style === 'Moderno')
    decoration = `<path d="M45 390V45H430M795 810V1155H410" fill="none" stroke="${accent}" stroke-width="12"/><circle cx="710" cy="130" r="42" fill="${accent}" opacity=".18"/>`;
  if (d.style === 'Minimalista')
    decoration = `<path d="M330 85H510M330 1140H510" stroke="${accent}" stroke-width="2"/>`;
  if (d.style === 'Romântico')
    decoration = `<rect x="40" y="40" rx="160" width="760" height="1120" fill="none" stroke="${accent}" stroke-width="2"/><path transform="translate(0,-35)" d="M420 96C375 50 355 125 420 158C485 125 465 50 420 96" fill="${accent}" opacity=".35"/>`;
  if (d.style === 'Elegante')
    decoration += `<path d="M72 90H210M72 90V240M768 1110H630M768 1110V960" stroke="${accent}" stroke-width="4"/>`;
  const names = wrap(d.bride + ' & ' + d.groom, 30),
    nameSize = names.length >= 4 ? Math.min(40, 176 / names.length) : 46,
    nameGap = names.length >= 4 ? Math.min(44, 180 / (names.length - 1)) : 54;
  const nameY = names.length >= 4 ? 235 : 282 - ((names.length - 1) * nameGap) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="1200" viewBox="0 0 840 1200" role="img" aria-label="${e(description)}">
    <rect width="840" height="1200" fill="${e(d.background)}"/>
    ${d.photo ? `<image href="${e(d.photo)}" width="840" height="1200" preserveAspectRatio="xMidYMid slice" opacity=".16"/>` : ''}
    ${decoration}
    <g text-anchor="middle" fill="${e(d.color)}" font-family="${font}"${d.font === 'italic' ? ' font-style="italic"' : ''}>
      ${lines(recipient || 'COM ALEGRIA, CONVIDAMOS VOCÊ', 150, 52, 14, 20, 'letter-spacing="2"', 40)}
      ${names.map((line, i) => `<text x="420" y="${nameY + i * nameGap}" font-size="${nameSize}" ${fit(line, nameSize)}>${e(line)}</text>`).join('')}
      <path d="M345 430H495" stroke="${accent}"/>
      ${lines(d.message, 475, 52, 22, 29, '', 110)}
      <text x="420" y="650" font-size="34" letter-spacing="3">${e(formatCalendarDate(d.date))}</text>
      <text x="420" y="702" font-size="20" letter-spacing="2">${d.time ? 'CERIMÔNIA ÀS ' + e(d.time) : 'HORÁRIO A DEFINIR'}</text>
      ${lines(d.venue || 'Local a definir', 770, 44, 28, 30, '', 60)}
      ${lines(d.address, 870, 60, 19, 25, '', 60)}
      ${d.reception ? lines('Recepção: ' + d.reception + (d.receptionTime ? ' · ' + d.receptionTime : ''), 985, 60, 19, 25, '', 50) : ''}
      <path d="M360 1070H480" stroke="${accent}"/>
      ${lines(d.footer, 1096, 64, 18, 22, '', 44)}
    </g></svg>`;
}
