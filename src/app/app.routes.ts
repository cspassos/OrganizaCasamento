import { Routes } from '@angular/router';
import { unsavedWeddingGuard } from './core/guards/unsaved-wedding';
import { MainLayout } from './layout/main-layout';
import { authGuard } from './core/guards/auth';
import { administrationGuard } from './core/guards/administration';
const applicationRoutes: Routes = [
  {
    path: 'presentes',
    loadComponent: () => import('./features/gifts/gifts-page').then((m) => m.GiftsPage),
  },
  { path: 'fornecedores/cadastro', redirectTo: 'financeiro/fornecedores', pathMatch: 'full' },
  {
    path: 'fornecedores/:section',
    canMatch: [
      (_route, segments) =>
        ['cadastro', 'orcamentos', 'contratos', 'pagamentos', 'avaliacoes'].includes(
          segments[1]?.path,
        ),
    ],
    loadComponent: () => import('./features/suppliers/suppliers-page').then((m) => m.SuppliersPage),
  },
  { path: 'fornecedores', redirectTo: 'fornecedores/cadastro', pathMatch: 'full' },
  {
    path: 'equipe/:section',
    canMatch: [(_route, segments) => ['profissionais', 'escalas'].includes(segments[1]?.path)],
    loadComponent: () => import('./features/suppliers/previous-team').then((m) => m.PreviousTeam),
  },
  { path: 'equipe', redirectTo: 'equipe/profissionais', pathMatch: 'full' },
  { path: 'pessoas/equipe', redirectTo: 'equipe/profissionais', pathMatch: 'full' },
  { path: 'modulo/3/3', redirectTo: 'equipe/profissionais', pathMatch: 'full' },
  { path: 'modulo/5/0', redirectTo: 'fornecedores/cadastro', pathMatch: 'full' },
  { path: 'modulo/5/1', redirectTo: 'fornecedores/orcamentos', pathMatch: 'full' },
  { path: 'modulo/5/2', redirectTo: 'fornecedores/contratos', pathMatch: 'full' },
  { path: 'modulo/5/3', redirectTo: 'fornecedores/pagamentos', pathMatch: 'full' },
  { path: 'modulo/5/4', redirectTo: 'fornecedores/avaliacoes', pathMatch: 'full' },
  {
    path: 'convites/criar',
    loadComponent: () =>
      import('./features/invitations/invitation-editor').then((m) => m.InvitationEditor),
    canDeactivate: [unsavedWeddingGuard],
  },
  {
    path: 'convites/modelos/:id/editar',
    loadComponent: () =>
      import('./features/invitations/invitation-editor').then((m) => m.InvitationEditor),
    canDeactivate: [unsavedWeddingGuard],
  },
  {
    path: 'convites/:section',
    canMatch: [
      (_route, segments) =>
        ['modelos', 'enviados', 'whatsapp', 'confirmacoes'].includes(segments[1]?.path),
    ],
    loadComponent: () =>
      import('./features/invitations/invitations-page').then((m) => m.InvitationsPage),
  },
  { path: 'convites', redirectTo: 'convites/modelos', pathMatch: 'full' },
  { path: 'modulo/4/0', redirectTo: 'convites/modelos', pathMatch: 'full' },
  { path: 'modulo/4/1', redirectTo: 'convites/criar', pathMatch: 'full' },
  { path: 'modulo/4/2', redirectTo: 'convites/enviados', pathMatch: 'full' },
  { path: 'modulo/4/3', redirectTo: 'convites/whatsapp', pathMatch: 'full' },
  { path: 'modulo/4/4', redirectTo: 'convites/confirmacoes', pathMatch: 'full' },
  {
    path: 'pessoas/:section',
    loadComponent: () => import('./features/people/people-page').then((m) => m.PeoplePage),
  },
  { path: 'pessoas', redirectTo: 'pessoas/convidados', pathMatch: 'full' },
  { path: 'modulo/3/0', redirectTo: 'pessoas/convidados', pathMatch: 'full' },
  { path: 'modulo/3/1', redirectTo: 'pessoas/familias', pathMatch: 'full' },
  { path: 'modulo/3/2', redirectTo: 'pessoas/padrinhos', pathMatch: 'full' },
  {
    path: 'financeiro/despesas/nova',
    loadComponent: () => import('./features/finance/expense-form').then((m) => m.ExpenseForm),
    canDeactivate: [unsavedWeddingGuard],
  },
  {
    path: 'financeiro/despesas/:id/editar',
    loadComponent: () => import('./features/finance/expense-form').then((m) => m.ExpenseForm),
    canDeactivate: [unsavedWeddingGuard],
  },
  {
    path: 'financeiro/despesas/:id',
    loadComponent: () => import('./features/finance/expense-detail').then((m) => m.ExpenseDetail),
  },
  {
    path: 'financeiro/:section',
    loadComponent: () => import('./features/finance/finance-page').then((m) => m.FinancePage),
  },
  { path: 'financeiro', redirectTo: 'financeiro/orcamento', pathMatch: 'full' },
  { path: 'modulo/2/0', redirectTo: 'financeiro/orcamento', pathMatch: 'full' },
  { path: 'modulo/2/1', redirectTo: 'financeiro/despesas', pathMatch: 'full' },
  { path: 'modulo/2/2', redirectTo: 'financeiro/pagamentos', pathMatch: 'full' },
  { path: 'modulo/2/3', redirectTo: 'financeiro/parcelamentos', pathMatch: 'full' },
  { path: 'modulo/2/4', redirectTo: 'financeiro/contas', pathMatch: 'full' },
  { path: 'modulo/2/5', redirectTo: 'financeiro/relatorios', pathMatch: 'full' },
  {
    path: 'casamentos',
    loadComponent: () => import('./features/weddings/wedding-list').then((m) => m.WeddingList),
  },
  {
    path: 'casamentos/novo',
    loadComponent: () => import('./features/weddings/wedding-form').then((m) => m.WeddingForm),
    canDeactivate: [unsavedWeddingGuard],
  },
  {
    path: 'casamentos/:id/editar',
    loadComponent: () => import('./features/weddings/wedding-form').then((m) => m.WeddingForm),
    canDeactivate: [unsavedWeddingGuard],
  },
  { path: 'modulo/1/0', redirectTo: 'casamentos', pathMatch: 'full' },
  { path: 'modulo/8/0', redirectTo: 'casamentos', pathMatch: 'full' },
  { path: 'modulo/0/1', redirectTo: 'dashboard#indicadores', pathMatch: 'full' },
  { path: 'modulo/0/2', redirectTo: 'dashboard#atividades', pathMatch: 'full' },
  { path: 'modulo/0/3', redirectTo: 'dashboard#alertas', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'modulo/:group/:item',
    redirectTo: 'dashboard',
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
export const routes: Routes = [
  {
    path: 'administracao',
    canActivate: [authGuard, administrationGuard],
    loadComponent: () =>
      import('./features/administration/administration-page').then((m) => m.AdministrationPage),
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'acesso/:action',
    loadComponent: () => import('./features/auth/auth-page').then((m) => m.AuthPage),
  },
  {
    path: 'importar-dados',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/import-local-page').then((m) => m.ImportLocalPage),
  },
  {
    path: 'convite/:token',
    loadComponent: () => import('./features/invitations/local-rsvp').then((m) => m.LocalRsvp),
  },
  { path: '', component: MainLayout, canActivate: [authGuard], children: applicationRoutes },
];
