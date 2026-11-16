import { Component, inject, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { navigation } from '../../core/constants/navigation';
import { Icon } from '../../shared/components/icon';
@Component({
  selector: 'oc-module',
  imports: [RouterLink, Icon],
  template: `<div class="eyebrow">ESTRUTURA DE NAVEGAÇÃO</div>
    <h1>{{ title() }}</h1>
    <p class="muted">{{ group() }} · OrganizaCasamento</p>
    <section class="card empty-state">
      <span class="large-icon"><oc-icon name="construction" /></span
      ><span class="pill">Planejado para uma próxima etapa</span>
      <h2>Um lugar para cada detalhe.</h2>
      <p>
        Esta rota faz parte da estrutura inicial. O cadastro e as operações de
        {{ title().toLowerCase() }} serão implementados na etapa correspondente do projeto.
      </p>
      <a class="button primary" routerLink="/dashboard"
        >Voltar à visão geral <oc-icon name="arrow_forward"
      /></a>
    </section>`,
})
export class ModulePage {
  private params = toSignal(inject(ActivatedRoute).paramMap);
  group = computed(() => navigation[Number(this.params()?.get('group'))]?.title ?? 'Módulo');
  title = computed(
    () =>
      navigation[Number(this.params()?.get('group'))]?.items[Number(this.params()?.get('item'))] ??
      'Página não encontrada',
  );
}
