import { WeddingEntity } from './models';
export interface GiftItem {
  id: string;
  name: string;
  description: string;
  priceCents: number | null;
  url: string;
  photo: string;
  received: boolean;
  quantity?: number;
  receivedQuantity?: number;
}
export interface GiftSite {
  id: string;
  name: string;
  url: string;
}
export function giftQuantities(item: GiftItem) {
  const quantity = item.quantity ?? 1;
  const received = item.receivedQuantity ?? (item.received ? quantity : 0);
  return { quantity, received, remaining: Math.max(0, quantity - received) };
}
export interface GiftList extends WeddingEntity {
  title: string;
  message: string;
  items: GiftItem[];
  sites: GiftSite[];
}
export function emptyGifts(weddingId: string): GiftList {
  return {
    id: weddingId,
    weddingId,
    title: 'Lista de presentes',
    message:
      'Sua presença é nosso maior presente. Se quiser nos presentear, estas são algumas ideias para o nosso novo lar.',
    items: [],
    sites: [],
  };
}
export function giftUrl(value: string): string {
  if (!value.trim()) return '';
  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`,
    );
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      !url.hostname.includes('.') ||
      url.username ||
      url.password
    )
      throw new Error();
    return url.href;
  } catch {
    throw new Error('Informe um link válido da loja ou da lista, como https://loja.com.br/lista.');
  }
}
export function validateGifts(list: GiftList) {
  if (
    list.id !== list.weddingId ||
    !list.title.trim() ||
    list.title.length > 100 ||
    list.message.length > 1200
  )
    throw new Error('Confira o título (até 100 caracteres) e a mensagem (até 1.200).');
  if (list.items.length > 200 || list.sites.length > 20)
    throw new Error('Limite de 200 presentes e 20 listas de lojas por casamento.');
  const ids = new Set<string>();
  for (const item of [...list.items, ...list.sites]) {
    if (!item.id || ids.has(item.id) || !item.name.trim() || item.name.length > 150)
      throw new Error('Informe um nome com até 150 caracteres.');
    ids.add(item.id);
    if (item.url.length > 2000 || (item.url && giftUrl(item.url) !== item.url))
      throw new Error('Confira o link informado.');
  }
  for (const item of list.items) {
    const counts = giftQuantities(item);
    if (
      !Number.isSafeInteger(counts.quantity) ||
      counts.quantity < 1 ||
      counts.quantity > 9999 ||
      !Number.isSafeInteger(counts.received) ||
      counts.received < 0 ||
      counts.received > 9999
    )
      throw new Error(
        'Informe quantidades inteiras: desejada de 1 a 9.999 e recebida de 0 a 9.999.',
      );
    if (
      item.description.length > 1500 ||
      (item.priceCents !== null &&
        (!Number.isSafeInteger(item.priceCents) ||
          item.priceCents < 0 ||
          item.priceCents > 99999999999))
    )
      throw new Error('Confira a descrição e o preço do presente.');
    if (
      typeof item.received !== 'boolean' ||
      (item.photo &&
        (!/^data:image\/jpeg;base64,[A-Za-z\d+/=]+$/.test(item.photo) ||
          item.photo.length > 700000))
    )
      throw new Error('A foto do presente não é válida. Escolha a imagem novamente.');
  }
  if (list.sites.some((s) => !s.url)) throw new Error('Informe o link da lista da loja.');
}
