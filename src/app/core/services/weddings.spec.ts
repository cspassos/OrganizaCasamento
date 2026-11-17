import 'fake-indexeddb/auto';
import { WeddingsService } from './weddings';
import { AppRepository } from '../repositories/app.repository';
import { Wedding } from '../models/models';
import { FinanceDataRepository } from '../repositories/finance.repository';

const wedding = (name: string): Wedding => ({
  id: crypto.randomUUID(),
  name,
  brideName: 'Ana',
  groomName: 'João',
  date: '2027-05-22',
  initialBudget: 40000,
  estimatedGuests: 80,
  capacity: 100,
  demo: false,
});

describe('WeddingsService', () => {
  it('deletes all wedding data, preserves other weddings and rejects stale writes', async () => {
    const store = new WeddingsService();
    await store.initialized;
    const a = wedding('Manter'),
      b = wedding('Excluir');
    await store.save(a);
    await store.save(b);
    for (const name of ['finance', 'people', 'invitations', 'suppliers'] as const) {
      const repository = new AppRepository<{ id: string; weddingId: string }>(name);
      await repository.save({ id: a.id, weddingId: a.id });
      await repository.save({ id: b.id, weddingId: b.id });
    }
    await store.deletePermanently(b.id);
    expect(store.active()?.id).toBe(a.id);
    expect(store.find(b.id)).toBeUndefined();
    await expect(
      new FinanceDataRepository().update(b.id, () => {
        throw new Error('Não deve recriar o financeiro.');
      }),
    ).rejects.toThrow('excluído');
    for (const name of ['finance', 'people', 'invitations', 'suppliers'] as const) {
      const repository = new AppRepository<{ id: string; weddingId: string }>(name);
      const rows = await repository.list();
      expect(rows.some((r) => r.id === b.id)).toBe(false);
      expect(rows.some((r) => r.id === a.id)).toBe(true);
      await expect(repository.update(b.id, () => ({ id: b.id, weddingId: b.id }))).rejects.toThrow(
        'excluído',
      );
    }
    await expect(store.save(b)).rejects.toThrow('excluído');
    await store.deletePermanently(a.id);
    expect(store.active()).toBeNull();
    const reloaded = new WeddingsService();
    await reloaded.initialized;
    expect(reloaded.weddings()).toHaveLength(0);
  });
  beforeEach(async () => {
    const repo = new AppRepository<Wedding>('weddings');
    for (const w of await repo.list()) await repo.remove(w.id);
    await new AppRepository<{ id: string }>('preferences').remove('active-wedding');
  });
  it('keeps weddings independent and restores the selected wedding in a new session', async () => {
    const store = new WeddingsService();
    await store.initialized;
    const a = wedding('Casamento A');
    const b = wedding('Casamento B');
    await store.save(a);
    await store.save(b);
    await store.save({ ...a, initialBudget: 60000 });
    expect(store.weddings()).toHaveLength(2);
    expect(store.find(b.id)?.initialBudget).toBe(40000);
    expect(store.active()?.id).toBe(a.id);
    const reloaded = new WeddingsService();
    await reloaded.initialized;
    expect(reloaded.active()?.id).toBe(a.id);
    expect(reloaded.find(a.id)?.initialBudget).toBe(60000);
  });
  it('archives without deleting and selects a remaining wedding', async () => {
    const store = new WeddingsService();
    await store.initialized;
    const a = wedding('A'),
      b = wedding('B');
    await store.save(a);
    await store.save(b);
    await store.setArchived(b.id, true);
    expect(store.active()?.id).toBe(a.id);
    expect(store.archived().map((w) => w.id)).toContain(b.id);
    await store.setArchived(a.id, true);
    expect(store.active()).toBeNull();
    await store.setArchived(b.id, false);
    expect(store.active()?.initialBudget).toBe(b.initialBudget);
  });
  it('does not persist invalid records or invalid selections', async () => {
    const store = new WeddingsService();
    await store.initialized;
    await expect(store.save({ ...wedding('Inválido'), initialBudget: -100 })).rejects.toThrow();
    await expect(store.select('missing')).rejects.toThrow();
    expect(store.weddings()).toHaveLength(0);
  });
  it('keeps records unchanged when IndexedDB rejects a write', async () => {
    const store = new WeddingsService();
    await store.initialized;
    const spy = vi
      .spyOn(AppRepository.prototype, 'save')
      .mockRejectedValueOnce(new Error('QuotaExceededError'));
    await expect(store.save(wedding('Sem espaço'))).rejects.toThrow('QuotaExceededError');
    expect(store.weddings()).toHaveLength(0);
    expect(store.busy()).toBe(false);
    spy.mockRestore();
  });
});
