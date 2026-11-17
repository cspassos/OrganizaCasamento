import { InjectionToken } from '@angular/core';
import { InvitationLedger } from '../models/invitations';
import { PeopleLedger } from '../models/people';
import { Wedding } from '../models/models';
import { IndexedDbRepository, LOCAL_DB_VERSION } from './indexed-db.repository';
import { emptyInvitations, validateInvitations } from '../utils/invitations';
import { emptyPeople, validatePeople } from '../utils/people';
import { cloudBackend, cloudEnabled } from './cloud-backend';
export interface InvitationsRepository {
  list(): Promise<InvitationLedger[]>;
  update(
    weddingId: string,
    transform: (invitations: InvitationLedger, people: PeopleLedger) => void,
  ): Promise<InvitationLedger>;
}
export class LocalInvitationsRepository implements InvitationsRepository {
  private base = new IndexedDbRepository<InvitationLedger>('invitations');
  list() {
    return this.base.list();
  }
  async update(
    weddingId: string,
    transform: (invitations: InvitationLedger, people: PeopleLedger) => void,
  ) {
    if (cloudEnabled)
      return cloudBackend.transact(weddingId, (workspace) => {
        const invitations = workspace.invitations ?? emptyInvitations(weddingId);
        const people = workspace.people ?? emptyPeople(weddingId);
        transform(invitations, people);
        validateInvitations(invitations);
        validatePeople(people);
        workspace.invitations = invitations;
        workspace.people = people;
        return invitations;
      });
    await this.base.list();
    return new Promise<InvitationLedger>((resolve, reject) => {
      const request = indexedDB.open('organiza-casamento', LOCAL_DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result,
          tx = db.transaction(['invitations', 'people', 'weddings'], 'readwrite');
        const inv = tx.objectStore('invitations').get(weddingId),
          persons = tx.objectStore('people').get(weddingId),
          wedding = tx.objectStore('weddings').get(weddingId);
        let remaining = 3,
          result: InvitationLedger,
          failure: unknown;
        const ready = () => {
          if (--remaining) return;
          try {
            if (!(wedding.result as Wedding | undefined) || wedding.result.archived)
              throw new Error('Casamento não encontrado ou arquivado.');
            result = structuredClone(inv.result ?? emptyInvitations(weddingId));
            const people: PeopleLedger = structuredClone(persons.result ?? emptyPeople(weddingId));
            transform(result, people);
            validateInvitations(result);
            validatePeople(people);
            tx.objectStore('invitations').put(result);
            tx.objectStore('people').put(people);
          } catch (e) {
            failure = e;
            tx.abort();
          }
        };
        inv.onsuccess = ready;
        persons.onsuccess = ready;
        wedding.onsuccess = ready;
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        tx.onabort = () => {
          db.close();
          reject(failure ?? tx.error);
        };
        tx.onerror = () => {
          db.close();
          reject(failure ?? tx.error);
        };
      };
    });
  }
}
export const INVITATIONS_REPOSITORY = new InjectionToken<InvitationsRepository>(
  'InvitationsRepository',
  { providedIn: 'root', factory: () => new LocalInvitationsRepository() },
);
