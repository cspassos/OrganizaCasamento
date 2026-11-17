import 'fake-indexeddb/auto';
import { AppRepository } from './app.repository';
import { Wedding } from '../models/models';

describe('IndexedDB repositories', () => {
  it('persists, updates and removes weddings across repository instances', async () => {
    const repo = new AppRepository<Wedding>('weddings');
    const value: Wedding = {
      id: crypto.randomUUID(),
      name: 'Teste',
      date: '2027-05-22',
      demo: false,
    };
    await repo.save(value);
    const second = new AppRepository<Wedding>('weddings');
    expect(await second.list()).toContainEqual(value);
    await second.save({ ...value, name: 'Atualizado' });
    expect((await repo.list()).find((w) => w.id === value.id)?.name).toBe('Atualizado');
    await repo.remove(value.id);
    expect((await second.list()).some((w) => w.id === value.id)).toBe(false);
  });
});
