import { InjectionToken } from '@angular/core';
import { InvitationLedger } from '../models/invitations';
import { PeopleLedger } from '../models/people';
import { AppRepository } from './app.repository';
import { emptyInvitations, validateInvitations } from '../utils/invitations';
import { emptyPeople, validatePeople } from '../utils/people';
import { cloudBackend } from './cloud-backend';
export interface InvitationsRepository {
  list(): Promise<InvitationLedger[]>;
  update(
    weddingId: string,
    transform: (invitations: InvitationLedger, people: PeopleLedger) => void,
  ): Promise<InvitationLedger>;
}
export class InvitationsDataRepository implements InvitationsRepository {
  private base = new AppRepository<InvitationLedger>('invitations');
  list() {
    return this.base.list();
  }
  async update(
    weddingId: string,
    transform: (invitations: InvitationLedger, people: PeopleLedger) => void,
  ) {
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
  }
}
export const INVITATIONS_REPOSITORY = new InjectionToken<InvitationsRepository>(
  'InvitationsRepository',
  { providedIn: 'root', factory: () => new InvitationsDataRepository() },
);
