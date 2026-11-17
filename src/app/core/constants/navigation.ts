export const mainNavigation = [
  { title: 'Visão geral', icon: 'space_dashboard', path: '/dashboard' },
  { title: 'Gastos e pagamentos', icon: 'account_balance_wallet', path: '/financeiro/despesas' },
  { title: 'Contas a pagar', icon: 'event_note', path: '/financeiro/contas' },
  { title: 'Lembretes e anotações', icon: 'notifications', path: '/lembretes' },
  { title: 'Convidados', icon: 'group', path: '/pessoas/convidados' },
  { title: 'Convites', icon: 'mail', path: '/convites/modelos' },
  { title: 'Lista de presentes', icon: 'card_giftcard', path: '/presentes' },
  { title: 'Meu casamento', icon: 'favorite_border', path: '/casamentos' },
];

// Legacy route names remain stable for saved links and historical records.
export const navigation = [
  {
    title: 'Dashboard',
    icon: 'space_dashboard',
    items: ['Visão geral', 'Indicadores', 'Próximas atividades', 'Alertas'],
  },
  {
    title: 'Planejamento',
    icon: 'event_note',
    items: ['Dados do casamento', 'Calendário', 'Checklist', 'Cronograma', 'Responsáveis'],
  },
  {
    title: 'Financeiro',
    icon: 'account_balance_wallet',
    items: [
      'Orçamento',
      'Despesas',
      'Pagamentos',
      'Parcelamentos',
      'Contas a pagar',
      'Relatórios financeiros',
    ],
  },
  {
    title: 'Pessoas',
    icon: 'group',
    items: [
      'Convidados',
      'Famílias e grupos',
      'Padrinhos e madrinhas',
      'Equipe de trabalho',
      'Organização das mesas',
    ],
  },
  {
    title: 'Convites',
    icon: 'mail',
    items: ['Modelos', 'Criar convite', 'Convites enviados', 'WhatsApp', 'Confirmação de presença'],
  },
  {
    title: 'Fornecedores',
    icon: 'storefront',
    items: ['Cadastro', 'Orçamentos', 'Contratos', 'Pagamentos', 'Avaliações'],
  },
  {
    title: 'Evento',
    icon: 'favorite_border',
    items: [
      'Cerimônia',
      'Recepção',
      'Locais',
      'Buffet',
      'Bebidas',
      'Bolo e doces',
      'Decoração',
      'Música',
      'Fotografia e vídeo',
      'Roupas e beleza',
      'Transporte e hospedagem',
    ],
  },
  {
    title: 'Outros',
    icon: 'inventory_2',
    items: ['Presentes', 'Lista de compras', 'Documentos', 'Pós-casamento', 'Relatórios'],
  },
  {
    title: 'Configurações',
    icon: 'settings',
    items: ['Dados gerais', 'Categorias', 'Preferências', 'Backup e restauração', 'Aparência'],
  },
];
export function routeFor(g: number, i: number) {
  if (g === 5)
    return (
      '/fornecedores/' + ['cadastro', 'orcamentos', 'contratos', 'pagamentos', 'avaliacoes'][i]
    );
  if (g === 3 && i === 3) return '/equipe/profissionais';
  if (g === 4)
    return '/convites/' + ['modelos', 'criar', 'enviados', 'whatsapp', 'confirmacoes'][i];
  if (g === 3 && i < 3) return '/pessoas/' + ['convidados', 'familias', 'padrinhos'][i];
  if (g === 2)
    return (
      '/financeiro/' +
      ['orcamento', 'despesas', 'pagamentos', 'parcelamentos', 'contas', 'relatorios'][i]
    );
  return g === 0 && i === 0 ? '/dashboard' : '/modulo/' + g + '/' + i;
}
