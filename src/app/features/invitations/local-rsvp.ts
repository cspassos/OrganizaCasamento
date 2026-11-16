import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InvitationsService } from '../../core/services/invitations';
import { InvitationPreview } from '../../shared/components/invitation-preview';
import { mapsUrl } from '../../core/utils/invitations';
type LocalView = Awaited<ReturnType<InvitationsService['localView']>>;
@Component({
  selector: 'oc-local-rsvp',
  imports: [FormsModule, RouterLink, InvitationPreview],
  templateUrl: './local-rsvp.html',
})
export class LocalRsvp implements OnDestroy {
  store = inject(InvitationsService);
  private route = inject(ActivatedRoute);
  private token = this.route.snapshot.paramMap.get('token') ?? '';
  view = signal<LocalView | null>(null);
  answers = signal<{ guestId: string; name: string; choice: string; diet: string }[]>([]);
  loading = signal(true);
  error = signal('');
  saved = signal(false);
  saving = signal(false);
  private alive = true;
  constructor() {
    void this.load();
  }
  ngOnDestroy() {
    this.alive = false;
  }
  async load() {
    try {
      const view = await this.store.localView(this.token);
      if (!this.alive) return;
      this.view.set(view);
      this.answers.set(
        view.members.map((g) => ({
          guestId: g.id,
          name: g.name,
          choice: g.status === 'Confirmado' ? 'yes' : g.status === 'Não comparecerá' ? 'no' : '',
          diet: g.diet,
        })),
      );
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível abrir o convite.');
    } finally {
      this.loading.set(false);
    }
  }
  update(id: string, key: 'choice' | 'diet', value: string) {
    this.answers.update((rows) => rows.map((a) => (a.guestId === id ? { ...a, [key]: value } : a)));
    this.saved.set(false);
  }
  maps(app: 'google' | 'waze') {
    return mapsUrl(this.view()?.issue.design.address ?? '', app);
  }
  async save() {
    this.error.set('');
    if (this.answers().some((a) => !['yes', 'no'].includes(a.choice))) {
      this.error.set(
        'Escolha quem vai comparecer e quem não poderá ir. Responda por todas as pessoas listadas.',
      );
      return;
    }
    this.saving.set(true);
    try {
      await this.store.respond(
        this.token,
        this.answers().map((a) => ({
          guestId: a.guestId,
          attending: a.choice === 'yes',
          diet: a.diet,
        })),
      );
      this.saved.set(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível salvar as respostas.');
    } finally {
      this.saving.set(false);
    }
  }
}
