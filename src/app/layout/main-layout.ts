import { Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { Icon } from '../shared/components/icon';
import { PreferencesService } from '../core/services/preferences';
import { mainNavigation, navigation, routeFor } from '../core/constants/navigation';
import { WeddingsService } from '../core/services/weddings';
import { FormsModule, NgModel } from '@angular/forms';
@Component({
  selector: 'oc-layout',
  imports: [RouterLink, RouterOutlet, Icon, MatButtonModule, FormsModule],
  templateUrl: './main-layout.html',
  host: { '(document:keydown.escape)': 'mobile.set(false)' },
})
export class MainLayout {
  private router = inject(Router);
  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
  );
  activeLocation = computed(() => {
    const url = this.currentUrl() ?? '/dashboard';
    const path = url.split(/[?#]/)[0].split('/');
    if (path[1] === 'casamentos') return { group: 1, item: 0 };
    if (path[1] === 'equipe') return { group: 3, item: 3 };
    if (path[1] === 'fornecedores')
      return {
        group: 5,
        item: Math.max(
          0,
          ['cadastro', 'orcamentos', 'contratos', 'pagamentos', 'avaliacoes'].indexOf(path[2]),
        ),
      };
    if (path[1] === 'convites')
      return {
        group: 4,
        item:
          path[2] === 'modelos' && path[3]
            ? 1
            : Math.max(
                0,
                ['modelos', 'criar', 'enviados', 'whatsapp', 'confirmacoes'].indexOf(path[2]),
              ),
      };
    if (path[1] === 'financeiro')
      return {
        group: 2,
        item: Math.max(
          0,
          ['orcamento', 'despesas', 'pagamentos', 'parcelamentos', 'contas', 'relatorios'].indexOf(
            path[2],
          ),
        ),
      };
    if (path[1] === 'pessoas')
      return {
        group: 3,
        item: Math.max(0, ['convidados', 'familias', 'padrinhos'].indexOf(path[2])),
      };
    if (path[1] === 'modulo') return { group: Number(path[2]), item: Number(path[3]) };
    return {
      group: 0,
      item: Math.max(
        0,
        ['', 'indicadores', 'atividades', 'alertas'].indexOf(url.split('#')[1] ?? ''),
      ),
    };
  });
  isGroupOpen(index: number) {
    return index === this.activeLocation().group || index === this.expanded();
  }
  constructor() {
    effect(() => this.expanded.set(this.activeLocation().group));
  }
  pageTitle = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const s = this.router.url.split(/[?#]/)[0].split('/');
        if (s[1] === 'fornecedores')
          return (
            (
              {
                cadastro: 'Fornecedores',
                orcamentos: 'Comparar orçamentos',
                contratos: 'Contratos',
                pagamentos: 'Pagamentos por fornecedor',
                avaliacoes: 'Avaliações dos fornecedores',
              } as Record<string, string>
            )[s[2]] ?? 'Fornecedores'
          );
        if (s[1] === 'equipe') return 'Cadastros anteriores de equipe';
        if (s[1] === 'convites')
          return s[2] === 'modelos' && s[3]
            ? 'Editar convite'
            : ((
                {
                  modelos: 'Modelos de convites',
                  criar: 'Criar convite',
                  enviados: 'Convites enviados',
                  whatsapp: 'WhatsApp',
                  confirmacoes: 'Confirmação de presença',
                } as Record<string, string>
              )[s[2]] ?? 'Convites');
        if (s[1] === 'pessoas')
          return (
            (
              {
                convidados: 'Convidados',
                familias: 'Famílias e grupos',
                padrinhos: 'Participações especiais',
                especiais: 'Participações especiais',
              } as Record<string, string>
            )[s[2]] ?? 'Pessoas'
          );
        if (s[1] === 'presentes') return 'Lista de presentes';
        if (s[1] === 'financeiro')
          return s[2] === 'despesas' && s[3]
            ? s[3] === 'nova'
              ? 'Adicionar gasto'
              : s[4] === 'editar'
                ? 'Editar gasto'
                : 'Detalhes da despesa'
            : ((
                {
                  orcamento: 'Orçamento',
                  despesas: 'Despesas',
                  pagamentos: 'Pagamentos',
                  parcelamentos: 'Parcelamentos',
                  contas: 'Contas a pagar',
                  relatorios: 'Relatórios financeiros',
                  fornecedores: 'Fornecedores',
                } as Record<string, string>
              )[s[2]] ?? 'Financeiro');
        if (s[1] === 'casamentos')
          return s[2] === 'novo'
            ? 'Novo casamento'
            : s[3] === 'editar'
              ? 'Editar casamento'
              : 'Meus casamentos';
        return s[1] === 'modulo'
          ? (navigation[Number(s[2])]?.items[Number(s[3])] ?? 'Visão geral')
          : 'Visão geral';
      }),
    ),
  );
  openGroup(index: number) {
    if (this.prefs.collapsed()) {
      this.prefs.toggleSidebar();
      this.expanded.set(index);
    } else this.expanded.set(this.expanded() === index ? -1 : index);
  }
  prefs = inject(PreferencesService);
  weddings = inject(WeddingsService);
  selectionError = signal('');
  async selectWedding(id: string, field: NgModel) {
    try {
      await this.weddings.select(id);
      this.selectionError.set('');
    } catch {
      this.selectionError.set('Não foi possível trocar o casamento. Tente novamente.');
      field.control.setValue(this.weddings.active()?.id ?? '', { emitEvent: false });
    }
  }
  nav = mainNavigation;
  menuDestination(path: string) {
    return path === '/casamentos' && this.weddings.active()
      ? `/casamentos/${this.weddings.active()!.id}/editar`
      : path;
  }
  selectedPath(path: string) {
    const current = (this.currentUrl() ?? '').split(/[?#]/)[0];
    if (path === '/financeiro/contas') return current.startsWith('/financeiro/contas');
    if (path === '/financeiro/despesas')
      return current.startsWith('/financeiro/') && !current.startsWith('/financeiro/contas');
    if (path === '/pessoas/convidados') return current.startsWith('/pessoas/');
    return path === '/dashboard'
      ? current === path
      : current.startsWith(path.split('/').slice(0, 2).join('/'));
  }
  routeFor = routeFor;
  mobile = signal(false);
  expanded = signal(0);
  info = signal(false);
}
