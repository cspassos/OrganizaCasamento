import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { IDBFactory } from 'fake-indexeddb';
import { GiftsService } from './gifts';
import { WeddingsService } from './weddings';
import { GiftItem, emptyGifts, giftUrl, validateGifts, giftQuantities } from '../models/gifts';
import { AppRepository } from '../repositories/app.repository';
import { deleteWeddingData } from '../repositories/delete-wedding';
import { Wedding } from '../models/models';
describe('Lista de presentes', () => {
  const wedding: Wedding = { id: 'w', name: 'Ana e Lucas', date: '', demo: false };
  let active = signal<Wedding | null>(wedding),
    service: GiftsService;
  const item = (id = 'gift'): GiftItem => ({
    id,
    name: 'Jogo de panelas',
    description: 'Aço inox',
    priceCents: 25000,
    url: 'https://loja.example.com/panelas',
    photo: '',
    received: false,
  });
  beforeEach(async () => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    active = signal<Wedding | null>(wedding);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WeddingsService,
          useValue: { active, initialized: Promise.resolve(), error: signal('') },
        },
      ],
    });
    await new AppRepository<Wedding>('weddings').save(wedding);
    service = TestBed.inject(GiftsService);
    await service.initialized;
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  it('normaliza links de lojas e recusa protocolos perigosos', () => {
    expect(giftUrl(' loja.example.com/lista ')).toBe('https://loja.example.com/lista');
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,teste',
      'https://usuario:senha@loja.example.com',
    ])
      expect(() => giftUrl(url)).toThrow();
    expect(giftUrl('')).toBe('');
    expect(() =>
      validateGifts({ ...emptyGifts('w'), items: [{ ...item(), priceCents: -1 }] }),
    ).toThrow();
  });
  it('preserva fotos, links e recebidos sem alterar o financeiro', async () => {
    await service.saveItem('w', item());
    await service.saveSite('w', { id: 'site', name: 'Nossa lista', url: 'loja.example.com/lista' });
    await service.configure('w', 'Nosso novo lar', 'Obrigado pelo carinho.');
    await service.received('w', 'gift', true);
    await service.refresh();
    expect(service.list()?.items[0].received).toBe(true);
    expect(service.list()?.sites[0].url).toBe('https://loja.example.com/lista');
    expect(service.list()?.title).toBe('Nosso novo lar');
    expect(await new AppRepository('finance').list()).toEqual([]);
    await expect(
      service.saveSite('w', { id: 'bad', name: 'Inválido', url: 'javascript:alert(1)' }),
    ).rejects.toThrow();
    expect(service.list()?.sites).toHaveLength(1);
    await service.remove('w', 'item', 'gift');
    expect(service.list()?.items).toHaveLength(0);
  });
  it('conta recebimentos parciais, extras e preserva registros antigos', async () => {
    expect(giftQuantities({ ...item(), received: true })).toEqual({
      quantity: 1,
      received: 1,
      remaining: 0,
    });
    await service.saveItem('w', { ...item(), quantity: 3, receivedQuantity: 0 });
    await service.receiveOne('w', 'gift');
    await service.refresh();
    expect(giftQuantities(service.list()!.items[0])).toEqual({
      quantity: 3,
      received: 1,
      remaining: 2,
    });
    expect(service.list()!.items[0].received).toBe(false);
    await service.receiveOne('w', 'gift');
    await service.receiveOne('w', 'gift');
    await service.receiveOne('w', 'gift');
    expect(giftQuantities(service.list()!.items[0])).toEqual({
      quantity: 3,
      received: 4,
      remaining: 0,
    });
    await expect(service.saveItem('w', { ...item(), quantity: 1.5 })).rejects.toThrow('inteiras');
    await expect(
      service.saveItem('w', { ...item(), quantity: 3, receivedQuantity: -1 }),
    ).rejects.toThrow('inteiras');
    expect(giftQuantities(service.list()!.items[0]).received).toBe(4);
  });
  it('isola casamentos, rejeita formulário antigo e apaga presentes ao excluir casamento', async () => {
    await service.saveItem('w', item());
    const other = { ...wedding, id: 'other' };
    await new AppRepository<Wedding>('weddings').save(other);
    active.set(other);
    expect(service.list()?.items).toHaveLength(0);
    await expect(service.saveItem('w', item('stale'))).rejects.toThrow('mudou');
    await service.saveItem('other', item('othergift'));
    await deleteWeddingData('w');
    await service.refresh();
    expect(service.list()?.items).toHaveLength(1);
    active.set(wedding);
    await expect(service.saveItem('w', item('resurrect'))).rejects.toThrow('excluído');
    expect((await new AppRepository('gifts').list()).map((r) => r.id)).toEqual(['other']);
  });
  it('migra a versão 5 preservando os casamentos e registros existentes', async () => {
    // The version-5 fixture is created in a separate factory to exercise the upgrade path.
    vi.stubGlobal('indexedDB', new IDBFactory());
    await new Promise<void>((resolve) => {
      const q = indexedDB.open('organiza-casamento', 5);
      q.onupgradeneeded = () => {
        for (const s of [
          'preferences',
          'weddings',
          'finance',
          'people',
          'invitations',
          'suppliers',
        ])
          q.result.createObjectStore(s, { keyPath: 'id' });
      };
      q.onsuccess = () => {
        const db = q.result,
          tx = db.transaction('weddings', 'readwrite');
        tx.objectStore('weddings').put(wedding);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
    expect(await new AppRepository('gifts').list()).toEqual([]);
    expect((await new AppRepository<Wedding>('weddings').list())[0].name).toBe(wedding.name);
  });
});
