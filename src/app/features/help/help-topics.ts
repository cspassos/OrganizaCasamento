export interface HelpTopic {
  title: string;
  links: { label: string; path: string }[];
  questions: { title: string; answer: string }[];
}

export const helpTopics: HelpTopic[] = [
  {
    title: 'Primeiros passos e planejamento',
    links: [
      { label: 'Meus casamentos', path: '/casamentos' },
      { label: 'Visão geral', path: '/dashboard' },
    ],
    questions: [
      {
        title: 'Por onde começo?',
        answer:
          'Abra Gerenciar casamentos e escolha Novo casamento. Preencha o nome do casamento e os nomes do casal e salve. Você pode acrescentar data, local, orçamento e estimativa de convidados mais tarde. Na Visão geral, acompanhe o que já foi combinado, o que foi pago e os próximos vencimentos.',
      },
      {
        title: 'Como vejo o histórico do planejamento?',
        answer:
          'Abra Meu casamento e toque em Histórico do planejamento. A página mostra os dados atuais e as versões anteriores dos campos do planejamento. Ao salvar uma alteração nesses campos, a versão anterior fica disponível para consulta.',
      },
      {
        title: 'Como troco de casamento ou consulto um casamento arquivado?',
        answer:
          'Use o seletor Casamento selecionado no menu para alternar entre casamentos ativos. Em Gerenciar casamentos, use Ver arquivados para consultar o histórico ou restaurar um cadastro. Excluir definitivamente apaga o cadastro e seus dados associados.',
      },
    ],
  },
  {
    title: 'Orçamento e previsão de gastos',
    links: [{ label: 'Abrir orçamento', path: '/financeiro/orcamento' }],
    questions: [
      {
        title: 'Qual a diferença entre orçamento, previsão, já combinado e falta pagar?',
        answer:
          'Orçamento é quanto vocês pretendem gastar. A previsão soma os gastos contratados e os preços estimados dos planejados. Já combinado mostra os valores contratados. Falta pagar é o saldo das despesas contratadas após pagamentos e ajustes.',
      },
      {
        title: 'Como simulo o custo total escolhendo apenas alguns gastos?',
        answer:
          'Em Despesas ou Orçamento, abra Previsão de gastos e toque em Escolher gastos. Marque os itens que quer simular. O Total selecionado muda na hora e o total de todos continua visível. Despesas canceladas ficam fora da previsão.',
      },
      {
        title: 'Como defino uma reserva ou um limite por categoria?',
        answer:
          'Na aba Orçamento, ajuste o orçamento geral e a reserva para imprevistos. Em Organizar o orçamento por categoria, você pode cadastrar categorias e definir metas para cada uma. Uma despesa com várias categorias tem seu valor contabilizado na categoria principal.',
      },
    ],
  },
  {
    title: 'Despesas, parcelas e pagamentos',
    links: [
      { label: 'Abrir despesas', path: '/financeiro/despesas' },
      { label: 'Ver contas a pagar', path: '/financeiro/contas' },
      { label: 'Histórico de pagamentos', path: '/financeiro/pagamentos' },
    ],
    questions: [
      {
        title: 'Como cadastro um preço em pesquisa ou um gasto contratado?',
        answer:
          'Em Despesas, toque em Adicionar gasto. Informe quem recebe, a descrição e a categoria. Use Só estou pesquisando o preço para guardar uma estimativa ou Já combinei / contratei para registrar valor e vencimentos. Você pode editar a pesquisa quando fechar a contratação.',
      },
      {
        title: 'Como incluo vários serviços na mesma despesa?',
        answer:
          'Escolha a categoria principal e abra Categorias adicionais. Selecione as categorias que faltam ou crie uma nova ali mesmo. Por exemplo, coloque Buffet como principal e Mesas como adicional para registrar um único valor combinado.',
      },
      {
        title: 'Como configuro a entrada, as parcelas e as datas?',
        answer:
          'Informe a data da entrada, o sinal e quantas parcelas pagam o restante. Com entrada, a primeira parcela precisa vencer na mesma data ou depois. Para pagamento único, deixe a entrada em zero e use uma parcela. Vencimentos individuais podem ser alterados em Parcelas e vencimentos.',
      },
      {
        title: 'Como registro um pagamento, desconto ou devolução?',
        answer:
          'Abra a despesa e toque em Registrar pagamento ou em Registrar na parcela desejada. Confira o valor e a data. O detalhe da despesa também permite consultar os lançamentos e registrar ajustes. Em Contas a pagar, confira parcelas em aberto e vencidas.',
      },
      {
        title: 'Como cancelo ou excluo uma despesa?',
        answer:
          'No detalhe da despesa, toque em Cancelar despesa. Havendo saldo pago, primeiro regularize os pagamentos. Depois do cancelamento, Excluir despesa fica disponível para registros sem histórico de pagamentos ou ajustes e sem vínculo com contrato ou profissional.',
      },
    ],
  },
  {
    title: 'Fornecedores, propostas e relatórios',
    links: [
      { label: 'Abrir fornecedores', path: '/financeiro/fornecedores' },
      { label: 'Comparar orçamentos', path: '/fornecedores/orcamentos' },
      { label: 'Abrir relatórios', path: '/financeiro/relatorios' },
    ],
    questions: [
      {
        title: 'Como cadastro um fornecedor ou comparo propostas?',
        answer:
          'Cadastre um contato em Fornecedores ou informe o nome diretamente ao adicionar um gasto. Em Consultar orçamentos, use Novo orçamento para cadastrar propostas. A tabela mostra cada valor e a soma cadastrada. Ao filtrar, também aparece o subtotal dos resultados. Selecione duas ou mais propostas para comparar condições e valores.',
      },
      {
        title: 'Onde guardo um contrato ou comprovante?',
        answer:
          'No formulário da despesa, abra Contrato, comprovante e observações para anexar um PDF ou imagem. Os contratos cadastrados separadamente podem ser consultados na área de fornecedores.',
      },
      {
        title: 'Como tiro um relatório do casamento?',
        answer:
          'Na aba Relatórios, escolha o tipo de relatório e aplique os filtros disponíveis. Confira a prévia e exporte em PDF ou CSV. Use um relatório de despesas para consultar os gastos e um de pagamentos para conferir os lançamentos.',
      },
    ],
  },
  {
    title: 'Lembretes e anotações',
    links: [{ label: 'Abrir lembretes', path: '/lembretes' }],
    questions: [
      {
        title: 'Como guardo uma tarefa ou uma ideia?',
        answer:
          'Use Novo lembrete para uma tarefa com prazo e Nova anotação para guardar uma ideia ou informação. Você pode marcar um item como importante e concluir ou reabrir lembretes. O sino do menu superior abre essa área.',
      },
    ],
  },
  {
    title: 'Convidados, famílias e participações',
    links: [
      { label: 'Abrir convidados', path: '/pessoas/convidados' },
      { label: 'Ver famílias e grupos', path: '/pessoas/familias' },
      { label: 'Ver participações especiais', path: '/pessoas/padrinhos' },
    ],
    questions: [
      {
        title: 'Como adiciono convidados e acompanhantes?',
        answer:
          'Em Convidados, toque em Adicionar convidados. Você pode incluir vários nomes de uma vez ou usar as opções de cadastro individual e importação de planilha. No menu Ações de um convidado, use Adicionar acompanhante quando necessário.',
      },
      {
        title: 'Como organizo famílias, padrinhos e madrinhas?',
        answer:
          'Use Famílias e grupos para reunir os integrantes de um mesmo convite. Em Participações especiais, registre quem tem um papel na cerimônia, como padrinho ou madrinha.',
      },
      {
        title: 'Onde vejo quem confirmou presença?',
        answer:
          'Consulte a situação na lista de convidados ou abra Confirmações na área de Convites. Para localizar alguém, use a busca pelo nome ou os filtros de presença disponíveis.',
      },
    ],
  },
  {
    title: 'Convites e confirmação de presença',
    links: [{ label: 'Abrir convites', path: '/convites/modelos' }],
    questions: [
      {
        title: 'Como faço e envio um convite?',
        answer:
          'Em Convites, escolha um modelo e personalize os dados. Salve o convite e escolha a pessoa ou família que vai recebê-lo. Você pode baixar uma imagem ou PDF e preparar a mensagem na aba WhatsApp. Confirme o envio no próprio WhatsApp e depois registre-o em Convites enviados.',
      },
      {
        title: 'Como acompanho respostas e compartilho o link de confirmação?',
        answer:
          'Use as abas Convites enviados e Confirmações para acompanhar os envios e respostas. Para enviar um link que funciona no celular dos convidados, gere e compartilhe o link a partir do site publicado. Links do localhost funcionam somente no computador que está rodando o sistema.',
      },
    ],
  },
  {
    title: 'Lista de presentes',
    links: [{ label: 'Abrir lista de presentes', path: '/presentes' }],
    questions: [
      {
        title: 'Como cadastro, compartilho e dou baixa nos presentes?',
        answer:
          'Use Adicionar presente para informar o item, a quantidade desejada e, se quiser, o preço, a foto e o endereço da loja. Em Gerenciar presente, atualize a quantidade recebida. Em Compartilhamento e outras opções, você pode exportar a lista em PDF.',
      },
    ],
  },
  {
    title: 'Conta, dados e uso no celular',
    links: [],
    questions: [
      {
        title: 'Onde ficam meus dados? Como trago cadastros antigos?',
        answer:
          'No site publicado, os dados ficam na sua conta. No modo de teste local, ficam no navegador utilizado. Na versão com login, a opção Trazer meus cadastros anteriores permite conferir e importar dados do navegador ou de um backup JSON.',
      },
      {
        title: 'Como recupero a senha ou vejo mudanças feitas em outro aparelho?',
        answer:
          'Na tela de entrada do site, use a opção de recuperação de senha e siga o link recebido por e-mail. Para ver mudanças salvas em outro aparelho na mesma conta, reabra a tela ou use Atualizar dados quando esse botão estiver disponível.',
      },
      {
        title: 'Como vejo mais informações e ações nas tabelas pelo celular?',
        answer:
          'Deslize a tabela para os lados para ver outras colunas. Toque no menu de três pontos para abrir as ações de um item. Em Despesas, Valor e Já pago ficam nas primeiras colunas.',
      },
    ],
  },
];

export const administrationHelp: HelpTopic = {
  title: 'Administração',
  links: [{ label: 'Abrir administração', path: '/administracao' }],
  questions: [
    {
      title: 'Onde consulto usuários e ajudo na recuperação de acesso?',
      answer:
        'No menu Administração, procure a conta em Usuários do sistema. Ao selecionar o usuário, confira as informações da conta, os casamentos disponíveis e as opções de recuperação de acesso.',
    },
  ],
};
