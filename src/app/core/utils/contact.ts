export function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  return (digits.length === 12 || digits.length === 13) && digits.startsWith('55')
    ? digits.slice(2)
    : digits;
}
export function formatPhone(value: string): string {
  const d = phoneDigits(value);
  if (!d || d.length > 11) return d;
  if (d.length <= 2) return '(' + d;
  const local = d.slice(2),
    split = d.length === 11 ? 5 : 4;
  return `(${d.slice(0, 2)}) ${local.slice(0, split)}${local.length > split ? '-' + local.slice(split) : ''}`;
}
export function validPhone(value: string): boolean {
  if (!value.trim()) return true;
  if (/[^\d\s()+.-]/.test(value)) return false;
  return /^(?:[1-9]\d)(?:[2-5]\d{7}|9\d{8})$/.test(phoneDigits(value));
}
export function validEmail(value: string): boolean {
  const email = value.trim();
  if (!email) return true;
  return (
    email.length <= 254 &&
    email.split('@')[0].length <= 64 &&
    /^(?!\.)(?!.*\.\.)[a-z\d.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,63}$/i.test(
      email,
    )
  );
}
