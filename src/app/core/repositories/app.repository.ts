import { Repository } from '../models/models';
import { cloudBackend, CloudStore } from './cloud-backend';
export class AppRepository<T extends { id: string }> implements Repository<T> {
  constructor(private store: CloudStore) {}
  list() {
    return cloudBackend.list<T>(this.store);
  }
  save(value: T) {
    return cloudBackend.save(this.store, value);
  }
  remove(id: string) {
    return cloudBackend.remove(this.store, id);
  }
  update(id: string, transform: (old: T | undefined) => T) {
    return cloudBackend.update(this.store, id, transform);
  }
}
