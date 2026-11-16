import { InjectionToken } from '@angular/core';
import { Repository } from '../models/models';
import { PeopleLedger } from '../models/people';
import { IndexedDbRepository } from './indexed-db.repository';
export interface PeopleRepository extends Repository<PeopleLedger> {
  update(
    id: string,
    transform: (value: PeopleLedger | undefined) => PeopleLedger,
  ): Promise<PeopleLedger>;
}
export const PEOPLE_REPOSITORY = new InjectionToken<PeopleRepository>('PeopleRepository', {
  providedIn: 'root',
  factory: () => new IndexedDbRepository<PeopleLedger>('people'),
});
