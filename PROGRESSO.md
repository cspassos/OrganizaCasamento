# Progresso — OrganizaCasamento

## Participações especiais em Convidados — 14/11/2026

- Nova aba “Participações especiais” em /pessoas/especiais. A rota anterior /pessoas/padrinhos continua compatível. Dados anteriores preservados sem migração.
- Padrinho, Madrinha, Debutante, Noivinho, Noivinha, Daminha, Pajem, Florista, Porta-alianças, Testemunha e Celebrante, além de participação personalizada.
- Usa o convidado já cadastrado: contatos, confirmação, família e contagem permanecem únicos. Formulário apenas com pessoa pesquisável, tipo de participação e observação opcional. Não reintroduz roupas, horários, ordem de entrada ou gestão de cerimônia.
- Tabela compacta e cartões simples, busca por nome/tipo/WhatsApp, edição de participação ou convidado e remoção somente da participação. Orientação para cadastrar primeiro a pessoa quando a lista está vazia.
- Build aprovado; teste de navegador cobre três tipos, busca, confirmação compartilhada, persistência, remoção sem excluir convidado e total de pessoas inalterado. Os cinco testes do controle simplificado também passaram.

## Revisão do produto: controle simples para o casal

Prioridade revista por solicitação do usuário: controlar o casamento, principalmente o que foi combinado, pago e ainda falta pagar. Gestão operacional de evento não faz parte do fluxo atual. Os registros das etapas anteriores abaixo são histórico, não autorização para recolocar funcionalidades removidas ou ampliar o produto automaticamente.

- Menu reduzido a sete destinos diretos; removidos agrupamentos de planejamento, evento, mesas, equipe e dezenas de páginas futuras. Links antigos de módulos não implementados voltam à visão geral.
- Painel refeito com orçamento, total combinado, pago, falta pagar, saldo disponível e próximas contas; convidados em resumo. Massa temporária recolhida no fim da página.
- Equipe: retirada das rotas a tela operacional de cadastro, escalas, presença e tarefas. As rotas antigas mostram apenas consulta dos cadastros anteriores; despesas individuais já vinculadas continuam no financeiro. Dados preservados, sem alteração da versão do IndexedDB.
- Financeiro: um valor principal por gasto, cadastro direto sem fornecedor/contrato obrigatório, pesquisa de preço separada de dívida. Pagamento com valor da parcela preenchido, ajustes e anexos opcionais. Removidas abas redundantes do fluxo principal; operações históricas seguem disponíveis pelos registros financeiros. Relatórios mantêm PDF/CSV e detalhes completos opcionais.
- Fornecedores: foco em contatos e contratos, tabelas reduzidas e campos extras opcionais. Sem exigir cadastrar cada funcionário. Contratos criam os vencimentos ao salvar como assinado.
- Convidados: novo cadastro por lista de nomes (até 1.000 por operação atômica), além da planilha. Cadastro individual básico; família e contatos extras opcionais. Removidas colunas lado/mesa/faixa etária da listagem principal e acesso principal ao detalhamento de padrinhos.
- Casamento: removidos da edição os detalhes de estilo, tema, cores, capacidade e endereços duplicados. Foto e observações opcionais. Valores anteriores desses campos permanecem nos registros.
- Validação de domínio: 73 testes unitários aprovados, incluindo inclusão atômica e isolamento da lista de nomes. Novo roteiro de navegador em e2e/simple-control.spec.ts cobre gasto/parcelas/pagamento/painel, 101 convidados e isolamento, preservação de equipe antiga em consulta, fornecedor/contrato e relatórios. Capturas desktop e celular em artifacts/controle-simples-*.png.
- Roteiros antigos de interface usam a versão anterior e não foram todos adaptados/executados nesta revisão; não representam o fluxo simplificado. O roteiro vigente está indicado no README.

## Lista de funções dos profissionais

- Substituído o datalist filtrado pelo texto atual por select com todas as funções, incluindo funções personalizadas já usadas neste casamento.
- “Adicionar outra função…” permite digitar uma nova função obrigatória, com limite de 100 caracteres. Edição e cadastro em sequência preservam a escolha.
- Build aprovado e teste de navegador aprovado cobrindo lista completa, seleção de Bartender, cadastro em sequência e função personalizada preservada após recarregar e editar.

## Erros de preenchimento no contrato

- Removida a mensagem genérica que atribuía qualquer campo inválido a fornecedor, título e valor. Agora a validação identifica cada campo necessário, inclusive categoria, tipo de pagamento, entrada, quantidade de parcelas e datas.
- O aviso lista os problemas em linguagem direta, com links para levar ao campo e foco no primeiro problema. Controles inválidos recebem destaque visual.
- Validação considera os campos usados pelo fluxo escolhido: pagamento integral não é bloqueado por valores ocultos de parcelamento; vínculo existente preserva o financeiro; rascunho não exige plano de pagamento.
- Build e três testes de navegador aprovados: assinatura com validação específica de parcelas, pagamento integral e edição com uma única área de rolagem.

## Entrada e parcelas obrigatórias na assinatura do contrato

- O contrato assinado exige escolha explícita entre pagamento integral e entrada/parcelas. No parcelamento, a quantidade precisa ser preenchida antes de salvar. O contrato e os vencimentos são salvos juntos na transação já existente, sem exigir etapa posterior na edição da despesa.
- Seção de pagamento destacada e sempre aberta ao assinar. Pagamento integral usa o vencimento informado; parcelas restantes seguem vencimentos mensais.
- Após salvar, a orientação indica Financeiro → Despesas para consulta, alterações e registro de pagamentos. Removido o convite para configurar parcelas somente após a assinatura. Contratos existentes exibem os vencimentos cadastrados e acesso à despesa, preservando dados e histórico.
- Build aprovado; testes de navegador cobrem bloqueio sem escolha, criação de entrada e cinco parcelas no mesmo salvamento, persistência, rolagem da janela e menu compacto.

## Ações compactas e consistentes nas tabelas

- Todas as tabelas CollectionTable usam um botão “Ações ⋮” por linha e menu Material sobreposto. As opções deixam de aumentar a altura/largura das linhas. A coluna de ações permanece fixa à direita na rolagem horizontal.
- Migrados os comandos de pessoas, famílias, integrantes, padrinhos, convites, modelos, fornecedores, propostas, contratos, pagamentos, equipe, escalas, casamentos, categorias e despesas. Removidos os antigos menus expansíveis dentro das linhas.
- Menu com navegação por teclado, Escape, fechamento ao escolher ação e posicionamento dentro da tela no celular. Configuração de parcelas continua acessível pelo menu do contrato.
- Validação: build aprovado; 72 testes unitários aprovados; testes de navegador focados no menu (altura da linha, teclado, celular e acesso ao financeiro) e configuração de parcelas aprovados. Capturas desktop/mobile conferidas em artifacts/acoes-tabela-*.png. A suíte completa de navegador não foi executada nesta alteração.

## Configuração direta de entrada e parcelas pelo contrato

- A ação “Configurar entrada e parcelas” aparece na linha do contrato, na janela do contrato vinculado e nos próximos passos após salvar.
- Abre formulário dedicado com nome da contratação, vencimento, forma de pagamento, entrada e parcelas, sem exigir descobrir a edição de despesas nem repetir os dados do contrato.
- O botão “Salvar entrada e parcelas” reutiliza as validações financeiras e preserva o bloqueio quando já existem operações. Pagamentos continuam sendo registrados separadamente.
- Build aprovado. Teste de navegador confirmou a conversão de pagamento integral em entrada e cinco parcelas, com persistência após recarregar.

## Janela do contrato e orientação após assinatura

- Corrigida a rolagem dupla: somente o conteúdo da janela rola, com título e ações fixos, inclusive ao expandir os detalhes e em telas menores.
- Contratos assinados exibem próximos passos após salvar: conferir entrada e parcelas, ajustar pela edição da despesa quando não há operações e registrar cada pagamento realizado. Há acesso direto ao financeiro.
- Na edição de contrato já vinculado, o botão “Salvar e ver parcelas e pagamentos” salva alterações antes de abrir a despesa. A opção inicial foi renomeada para “Gerar automaticamente no financeiro”.
- Validação: build de produção e seis testes de navegador de fornecedores/equipe aprovados, incluindo contagem das áreas de rolagem e navegação após salvar.

## Exemplos nos detalhes do contrato

- Referência, serviços contratados, condições combinadas e observações agora têm exemplos no campo e orientações que continuam visíveis durante o preenchimento. Proposta de origem também explica o vínculo e que pode ficar vazia.
- Exemplos são apenas sugestões, sem preencher ou salvar dados automaticamente. As condições esclarecem que texto livre não cria parcelas nem registra pagamentos.

## Correção da lista de categorias de fornecedores

- Campo Categoria substituído de input/datalist por select: abre todas as categorias, mesmo quando “Outros” já está preenchido. A lista inclui também categorias personalizadas já cadastradas neste casamento.
- Opção “Adicionar outra categoria…” exibe campo obrigatório para o nome personalizado. Edição e cadastro em sequência preservam a categoria escolhida.
- Teste de navegador cobre a lista completa, escolha padrão, cadastro seguido, categoria personalizada e persistência após recarregar/editar.
- Verificação: build de produção e os cinco testes de navegador de fornecedores/equipe aprovados.

## Etapa 06 — Fornecedores e equipe — 13/11/2026

Implementada após autorização explícita (“Faça”). Etapa 07 não iniciada.

### Funcionalidades

- Fornecedores com categorias sugeridas/editáveis, nome/empresa/serviço, contatos com máscara e validação, endereço, responsável, CPF/CNPJ informativo opcional, situações, notas, anexo e avaliação. Exclusão protegida por propostas, contratos, profissionais e despesas. Lista compacta, filtros, busca por contato/empresa, CSV e cadastro em sequência.
- Várias propostas por fornecedor/serviço, com validade, entrega, condições, itens incluídos, situação e arquivo. Comparação dos selecionados entre páginas, diferenças para o menor preço, consulta e CSV. Selecionar proposta não gera contrato ou pagamento.
- Contratos com rascunho/assinatura/cancelamento, documento e motivo. Rascunho não gera compromisso. Assinatura cria despesa e parcelas ou vincula despesa contratada existente de mesmo valor, preservando parcelas/pagamentos. Gravação idempotente e concorrência entre abas não duplicam obrigações. Cancelamento com pagamento líquido é bloqueado; após regularização no financeiro, cancela contrato/despesa juntos sem apagar histórico. Pagamentos por fornecedor consultam os mesmos dados financeiros.
- Profissionais com função, empresa/fornecedor, contatos, confirmação, responsabilidades e valor combinado. Contagem por função. Separa pagamento individual de equipe incluída em contrato. Estado de pagamento vem do financeiro, sem baixa paralela ou duplicação. Vínculo individual pode reutilizar despesa ou iniciar cadastro preenchido a partir da equipe.
- Escalas com início/fim completos, inclusive após meia-noite, local e checklist de tarefas. Verifica sobreposição por profissional e salva lotes de profissionais atomicamente. Presença permite chegada/saída com data/hora real; impede saída anterior à chegada, datas futuras e exclusão/alteração de horários com presença. Tarefas e registros persistem e sincronizam entre abas.
- Dashboard usa dados reais para fornecedores contratados, rascunhos, equipe, escalas do dia e próximas escalas. Menu ativo aberto nas rotas novas e redirecionamento das antigas. Telas responsivas reutilizam a tabela e o padrão visual das etapas anteriores.

### Persistência e decisões

- IndexedDB versão 5 adiciona `suppliers`, preservando os stores das etapas 01–05. Ledger por casamento contém fornecedores, propostas, contratos, profissionais e escalas. Repositório injetável preparado para substituição futura, sem Supabase/login/servidor.
- Repositórios financeiro e de fornecedores compartilham transação em `suppliers`, `finance` e `weddings`. Validação bidirecional dos vínculos e guarda contra casamento arquivado/trocado, contrato incompatível, despesa duplicada e pagamento individual incompatível. O financeiro continua sendo fonte única de pagamentos. A remoção da massa temporária limpa também esse ledger.
- Anexo de até 1 MB por fornecedor/proposta/contrato; comprovantes permanecem nas operações financeiras. Tarefas gerais/cronograma dependem das etapas correspondentes; tarefas de escala já funcionam. Documentos CPF/CNPJ são informativos, não certificação cadastral.

### Arquivos

Criados: `core/models/suppliers.ts`, `core/utils/suppliers.ts`, `core/utils/csv-download.ts`, `core/repositories/suppliers.repository.ts`, `core/repositories/suppliers-migration.spec.ts`, `core/services/suppliers.ts`, `core/services/suppliers.spec.ts`; componentes `search-picker`, `local-editor-dialog` e `reason-dialog`; páginas/templates/dialogs em `features/suppliers` e `features/team`; `e2e/suppliers.spec.ts`.

Alterados: modelos/serviço/repositório financeiro, repositório IndexedDB, remoção de massa temporária, rotas/navegação/layout, formulário e detalhes de despesas, dashboard, estilos e README. O README inclui roteiro completo para testar os menus da etapa 06.

### Verificação

Build de produção, 72 testes de lógica/persistência (19 arquivos) e 35 testes de navegador aprovados. Cobertura de migração 4→5, criação/vínculo/cancelamento de contratos, preservação de pagamentos, operações atômicas, concorrência entre abas, pagamento individual, isolamento e escalas noturnas/conflitantes. Interface conferida com 512 fornecedores, busca pelo último cadastro/telefone, comparação/CSV, anexo de proposta, seis parcelas financeiras, cancelamento bloqueado com pagamento, avaliação persistida, equipe em sequência/lote, presença/tarefas e celular. Capturas em `artifacts/etapa-06-comparacao.png` e `artifacts/etapa-06-equipe-mobile.png` conferidas visualmente.

Próxima etapa: **07 — Alimentação e estrutura**, somente após autorização.

## Listas grandes, cadastro seguido e seleção em lote — 13/11/2026

Refinamento autorizado das etapas 01–05. Etapa 06 não iniciada.

- Componente compartilhado de tabelas compactas, ordenação de texto/número/real/data, seleção explícita por página ou filtro, paginação com 10/25/50/100 linhas e salto para primeira/última/página digitada. Rolagem horizontal contida para celular, texto longo limitado visualmente e detalhes sob demanda.
- Aplicado a convidados, famílias/integrantes, padrinhos, convites emitidos/modelos salvos/confirmações, casamentos, despesas, pagamentos, parcelas e categorias. Relatórios mantêm as cores e ganham busca por seção e tamanho de página. Galerias/cartões permanecem opcionais e paginados.
- Busca ampliada sem acentos, confirmação de convidados em lote em transação única e proteção contra seleção desatualizada. Cadastro seguido de pessoas/famílias/participação e despesas novas.
- Emissão atômica de vários convites por família, sem duplicar os ativos. Seleção de emitidos para registrar envio/desativar com confirmação e exportar PNG/PDF em um ZIP com progresso/cancelamento; nomes dos arquivos identificam os destinatários. Fotos/modelos do lote compartilham a mesma cópia imutável para evitar multiplicar desnecessariamente o armazenamento.
- Fila de WhatsApp por casamento salva no ledger existente, sem nova versão do banco: seleção de pessoas, agrupamento familiar opcional, revisão de contatos inválidos, modelo/texto escolhido, progresso, retomada após recarregar, pular/encerrar e confirmação manual de cada envio. Abrir conversa/download não altera o registro de envio. Preserva confirmações/recusas e separa lembretes de envio de convite.
- Dependência direta `fflate` para ZIP; sem integração não oficial de WhatsApp ou disparo automático. Testes de lote/transação/retomada adicionados; regressões existentes preservadas no modo de cartões e listas financeiras adaptadas às tabelas.
- Verificação: build de produção aprovado, 60 testes de lógica/persistência e 31 testes de navegador aprovados. Cenários de 125 pessoas, 63 convites familiares, seleção entre páginas e filtros, cadastro seguido, busca por integrante, arquivos PNG no ZIP, fila persistente e isolamento entre casamentos. Capturas de desktop/celular conferidas. Filtros avançados e instruções de planilha ficam recolhidos na visualização compacta para priorizar os resultados.

## Compartilhar o modelo pelo WhatsApp — 13/11/2026

- Tela WhatsApp mostra o modelo selecionado com nome do destinatário e opção de preparar PNG ou PDF. Em aparelhos/navegadores com Web Share de arquivos, Compartilhar convite e mensagem abre o compartilhamento nativo para escolher WhatsApp e conversa. Arquivo preparado em ação anterior para preservar a ativação do clique exigida pelo navegador.
- Alternativa sempre disponível de baixar o arquivo pronto para anexar na conversa. Não é possível anexar automaticamente pelo link de texto wa.me. Cancelamento não acusa falha nem registra envio. Trocar modelo, pessoa/nome ou formato invalida o arquivo anterior para não compartilhar conteúdo desatualizado.
- Alterados página/template de convites, estilos e testes; README atualizado. Cinco testes de navegador de convites aprovados: PNG/PDF, alternativa sem Web Share, arquivo/mensagem enviados à API simulada, cancelamento sem registro de envio e regressão do RSVP/editor.

## Etapa 05 — Convites — 13/11/2026

Implementada após autorização explícita (“Faça”). Etapa 06 não iniciada.

### Funcionalidades

- Oito modelos visuais com edição de dados do casamento, mensagem, fontes, cores, imagem/foto, cerimônia/recepção e prévia responsiva. Campos opcionais recolhidos; formulário com validações, aviso de alterações pendentes e upload estilizado. Exemplos não são persistidos sem salvar.
- PNG de 1260 × 1800 e PDF de uma página, 14 × 20 cm, com fontes locais e compressão. Desenho compartilhado entre tela e exportação, limites de texto, quebra/ajuste de linhas, escape de conteúdo e bloqueio de imagens ativas. PDF de teste renderizado e conferido visualmente; aproximadamente 108 KB no cenário de teste.
- Modelos salvos com edição, cópia e exclusão protegida. Emissão por pessoa/família/acompanhantes, com destinatários explícitos e cópia imutável do desenho. Evita dois convites ativos para a mesma família. Links de 32 bytes aleatórios, revogação e histórico de respostas.
- Registro manual de envio com confirmação, sem confundir abertura do WhatsApp/download com envio real. Mantém confirmações e recusas existentes. Mensagens pessoais para convite, lembrete, confirmação, localização e agradecimento; textos editáveis e salvos por ação/casamento, links oficiais wa.me e nenhuma automação de disparo.
- QR Code visual/download para link de teste. Avisos esclarecem que os links/QR e respostas só funcionam no mesmo navegador/perfil/origem. Nenhum falso link público na mensagem padrão do WhatsApp.
- RSVP local em rota separada do layout administrativo: resposta por integrante, recusa/confirmado, restrição alimentar opcional, endereço, Google Maps/Waze. Respostas atualizam Convidados, Padrinhos, Dashboard e central de confirmações. Gravação atômica com validação dos destinatários e do link; sem acesso visual a dados financeiros, contatos ou outros convidados.
- IndexedDB versão 4 adiciona invitations preservando dados anteriores. Contrato injetável InvitationsRepository; alterações de convite/resposta e pessoas na mesma transação. Sincronização entre abas. Remoção da massa temporária também limpa convites pertencentes a ela.

### Arquivos criados

- `src/app/core/models/invitations.ts`, `core/repositories/invitations.repository.ts`, `core/services/invitations.ts`, `core/utils/invitations.ts`, `core/utils/invitation-art.ts`, `core/utils/invitation-export.ts`.
- `src/app/features/invitations/invitation-editor.ts/html`, `invitations-page.ts/html`, `issue-dialog.ts`, `local-rsvp.ts/html`; `shared/components/invitation-preview.ts`.
- Testes `core/services/invitations.spec.ts`, `core/utils/invitations.spec.ts`, `core/repositories/invitations-migration.spec.ts`, `e2e/invitations.spec.ts`; revisão do PDF em `scripts/render-invitation-pdf.mjs`.

### Arquivos alterados

- App/rotas para separar a tela local de convite do layout administrativo, navegação/menu/rodapé, versão do repositório IndexedDB e limpeza da massa temporária.
- Estilos, teste do shell, package.json/package-lock (qrcode e tipos), angular.json para dependências CommonJS conhecidas, README e este progresso.

### Verificação

- Compilação de produção aprovada, sem erros ou avisos de TypeScript; pacote inicial aproximadamente 474 KB. Dependências de produção sem vulnerabilidades no npm audit.
- 55 testes unitários e 26 testes de navegador aprovados. Incluem migração com preservação de pessoas/financeiro, resposta parcial de família, isolamento, resposta indevida/incompleta, cópia do desenho emitido, prevenção de duplicatas, revogação, ausência de envio automático, QR, PNG/PDF, upload de foto, persistência e responsividade. Etapas anteriores continuam passando.
- PDF validado como uma página, 14 × 20 cm, renderizado via PDF.js/Chromium e revisto; PNG também conferido. Capturas: `artifacts/etapa-05-convite.png`, `etapa-05-pdf-pagina-1.png`, `etapa-05-rsvp.png`, `etapa-05-editor-mobile.png`. Dados fictícios de teste.
- Roteiro completo no README, seção Teste manual da etapa 05.

### Pendências intencionais

Etapa 06: fornecedores, orçamentos, contratos e equipe, mediante autorização. Links públicos reais, RSVP em dispositivos diferentes, autenticação, permissões, Supabase/Storage e publicação ficam para a etapa 12. Backup/restauração continuam pendentes. As cópias emitidas são históricas: para alterar desenho ou destinatários, desative a anterior e emita outra.

## Recolher área de planilha — 13/11/2026

- Título Cadastrar vários convidados de uma vez agora é botão com seta que alterna expandir/recolher, sem apagar a prévia ou os dados. Área começa aberta; ação disponível no título inteiro, com aria-expanded e navegação por teclado.
- Alterados página/template de pessoas, estilos e teste existente de importação. Compilação e fluxo de recolher/reabrir/importar aprovados.

## Planilha com instruções claras — 13/11/2026

- Área Cadastrar vários convidados de uma vez, com dois passos explicados: Baixar planilha para preencher (abrir no Excel, uma pessoa por linha e salvar em CSV) e Enviar planilha preenchida (conferir prévia antes de adicionar). Exportação renomeada para Baixar lista de convidados.
- Erros de telefone apresentados em linhas separadas: onde corrigir, campo, conteúdo e instrução com exemplos visuais. Aviso local com título destacado, corpo legível e borda vermelha, evitando um parágrafo inteiro em vermelho. Diálogo com título Confira a planilha antes de continuar.
- Alterados template/página de pessoas, mensagem CSV, estilos, testes e README. Fluxos de envio inválido/válido, seleção de 502 pessoas e exportação verificados no navegador.

## Importação CSV com retorno visível — 13/11/2026

- Investigado o arquivo enviado pelo usuário: telefone/WhatsApp na linha 2 com nove dígitos locais sem iniciar em 9, rejeitado pela validação. O erro aparecia no topo, fora da área visível do importador; nenhum registro era salvo.
- Erros agora abrem diálogo com nome do arquivo, linha/campo, exemplos de formato e orientação de corrigir ou deixar contato vazio. Mensagens de leitura, validação, sucesso e erro aparecem também junto aos botões de importação. Prévia identifica arquivo e necessidade de Confirmar importação.
- Após confirmação, filtros são limpos para exibir os importados. Nenhuma importação parcial nem correção automática de números; arquivo original do usuário preservado. Leitura assíncrona descarta resultados antigos ao mudar casamento/seção; botões bloqueiam operações duplicadas.
- Alterados página/template de pessoas, mensagem de validação CSV, estilos e teste de navegador. 46 testes unitários aprovados e fluxo de reprodução com telefone inválido seguido de arquivo válido confirmado no navegador.

## Padrinhos com cadastro essencial — 13/11/2026

- Formulário principal reduzido a pessoa, participação, entrada em dupla e observações. Trajes, tamanho, chegada, posição, ordem, responsabilidades e lembrança ficam em Mais detalhes (opcional), fechado por padrão, sem apagar valores.
- Cartões mostram nome, participação, lado, dupla, confirmação e telefone quando informado. Demais informações ficam em Ver mais detalhes. Resumo da cerimônia com menos texto.
- Alterados templates de pessoas e estilos. Compilação aprovada; teste de navegador ampliado para editar e reabrir informação opcional preservada, com seção fechada inicialmente.

## Orientação para formar dupla de padrinhos — 13/11/2026

- Par vinculado renomeado para Vai entrar com outro padrinho ou madrinha?, com opção Escolher depois ou entrar sem par. Orientações no próprio campo explicam o primeiro cadastro, a escolha de pessoa disponível e a indisponibilidade quando as outras pessoas já têm par.
- Introdução do formulário explica cadastrar uma pessoa por vez e formar a dupla; README e testes atualizados. Compilação aprovada. Fluxos de navegador verificam a explicação inicial e formar uma dupla ao cadastrar a segunda pessoa.

## Tipo de participação com opções visíveis — 13/11/2026

- Campo com datalist substituído por select com Padrinho, Madrinha, Testemunha e Outra participação. A última abre descrição obrigatória; valores personalizados existentes são preservados na edição.
- Alterados formulário de participação e teste de navegador. Compilação aprovada; testes cobrem escolher Madrinha, listar as quatro opções, salvar participação personalizada e reabrir com o mesmo valor.

## Busca de convidados no cadastro de padrinhos — 13/11/2026

- Seletor substituído por autocomplete reutilizável `shared/components/guest-picker.ts`, com busca por nome sem acentos, telefone/WhatsApp e família. Opções mostram família, contato e lado dos noivos para distinguir homônimos. Lista limitada a 30 resultados visíveis, com orientação de refinar; todos os convidados continuam pesquisáveis.
- Seleção persiste por ID interno. Ao digitar outra busca a seleção anterior é invalidada; texto livre não permite salvar. Padrinhos já vinculados continuam excluídos dos candidatos; edição mantém a pessoa selecionada. Angular Material fornece navegação por teclado e semântica de autocomplete.
- Alterados formulário de participação, estilos, README e testes. Compilação aprovada. Cinco fluxos de navegador de pessoas aprovados, incluindo cenário com 502 convidados, dois José Silva em famílias diferentes, busca por telefone e persistência da pessoa escolhida. Captura `artifacts/etapa-04-busca-padrinhos.png`.

## Destaque de Limpar filtros — 13/11/2026

- Botão de convidados com fundo verde-sálvia, texto de 14px em destaque, ícone de limpar filtros, conteúdo centralizado e altura alinhada aos campos. A ação de limpar permanece a mesma. Alterados template de pessoas e estilos.

## Excluir pessoa com acompanhantes — 13/11/2026

- Pessoa com acompanhantes agora abre confirmação específica com todos os nomes, quantidade, Cancelar e Excluir pessoa e acompanhantes. Remove somente os nomes revisados, preservando outros integrantes e a família.
- Exclusão atômica; vínculos de padrinhos/madrinhas bloqueiam todo o lote com motivo visível. Mudança da lista entre confirmação e gravação exige nova revisão; nenhuma exclusão parcial.
- Criado `delete-person-dialog.ts`; alterados serviço/página de pessoas, testes e README. 46 testes unitários e fluxo no navegador aprovados, incluindo cancelamento, persistência, preservação de terceiros, bloqueio por padrinho e lista desatualizada.

## Motivo visível ao bloquear exclusão — 13/11/2026

- Exclusões de pessoas/famílias bloqueadas por vínculos mostram diálogo de aviso, com botão Entendi, além da mensagem na página. Aviso permanece visível mesmo ao excluir um cartão longe do topo.
- Quando existem acompanhantes, mensagem informa a pessoa principal, os nomes vinculados e como editar o campo Acompanhante de antes de tentar excluir novamente. Nenhuma exclusão automática de dependentes.
- Criado diálogo reutilizável `notice-dialog.ts`; alterados página/serviço de pessoas e teste de navegador. Compilação, 45 testes unitários e fluxo de bloqueio no navegador aprovados.

## Formulário de convidado simplificado — 13/11/2026

- Removidos do formulário Grupo, Restrições alimentares e Necessidades de acessibilidade, conforme preferência do usuário. Família ocupa a linha completa; demais campos mantidos. Modelo e controles internos preservam valores existentes ao editar/duplicar, sem migração ou perda de dados. Alterados template e teste de pessoas; compilação aprovada.

## Máscara e validação de contatos — 13/11/2026

- Telefone/WhatsApp com diretiva reutilizável de máscara para fixo/celular brasileiro, normalização de +55, preservação de números excedentes para acusar erro e edição com cursor. Campos opcionais, com validação quando preenchidos e mensagens por campo. E-mail com domínio completo, validação compartilhada e mensagem visível.
- Serviço de cadastro e importação CSV validam contatos e formatam telefones ao salvar; contatos legados inválidos não bloqueiam alterações de outras pessoas. Padrinhos compartilham a edição do convidado e recebem a mesma máscara.
- Criados `core/utils/contact.ts`, teste do utilitário e `shared/directives/phone-input.ts`; alterados formulário de pessoa, serviço/utilitário de pessoas, estilos, testes de navegador e README. 45 testes unitários e quatro testes de navegador de pessoas aprovados, incluindo máscara, rejeição de contato inválido, persistência e duplicação.

## Menu sincronizado com a página — 13/11/2026

- Grupo da página atual fica sempre aberto e destacado, com item ativo identificado por `aria-current`. Abrir outro grupo para explorar não fecha o grupo atual; ao navegar, o menu acompanha a nova rota. Acesso direto, F5, histórico, detalhes financeiros e cadastro de casamento têm seus grupos correspondentes.
- Alterados layout TypeScript/template e testes de navegação. Três testes de layout aprovados, incluindo acesso direto a Famílias, atualização, mudança de seção, voltar e formulário de casamento. Teste de persistência de tema agora aguarda a transação IndexedDB antes de recarregar.

## Etapa 01 — implementada para avaliação em 12/11/2026

Registro histórico da etapa 01. A etapa 02 foi autorizada pelo usuário e está descrita abaixo.

### Implementado

- Angular 21 standalone, TypeScript estrito, SCSS e Material.
- Nove grupos completos no menu, rotas individuais e lazy loading.
- Layout responsivo, drawer móvel, menu recolhível e temas claro/escuro.
- Preferências persistentes, repositório IndexedDB versionado e modelos iniciais.
- Dashboard explicitamente demonstrativo, indicadores derivados dos exemplos, gráfico e atalhos.
- Componentes reutilizáveis, foco visível, atalho ao conteúdo, fechamento por Escape e mensagens de erro.

### Arquivos

Criados: `src/app/core/**`, `src/app/layout/**`, `src/app/shared/components/**`, `src/app/features/**`, `src/app/data/mocks/**`, `e2e/layout.spec.ts`, `playwright.config.ts` e este documento.

Adaptados: `src/main.ts`, `src/styles.scss`, `src/index.html`, `src/app/app.ts`, `src/app/app.routes.ts`, `src/app/app.spec.ts`, `package.json`, `package-lock.json`, `.gitignore`, `README.md`. Templates iniciais da CLI removidos.

### Verificação

- Compilação de produção aprovada.
- Três testes unitários aprovados: shell/menu, rotas únicas, persistência/edição/exclusão IndexedDB entre instâncias.
- Dois testes de navegador aprovados: dashboard, rotas, tema após recarregar, drawer móvel e ausência de overflow em 390 px. Sem erros de execução capturados no fluxo desktop.
- Capturas: `artifacts/dashboard-desktop.png` e `artifacts/dashboard-mobile.png`.
- Auditoria npm: 16 avisos moderados transitivos nas ferramentas de desenvolvimento do Angular CLI. Revisar atualizações antes de publicar; nenhuma correção incompatível forçada.

### Pendências intencionais

Etapa 02: cadastro e seleção de casamentos independentes e indicadores com dados reais. Depois: financeiro, pessoas, convites, fornecedores, demais módulos, componentes específicos, formulários, Chart.js, FullCalendar, relatórios e backup/restauração. Todos os destinos ainda não implementados apresentam sua condição de planejamento.

Supabase, autenticação e publicação não foram implementados.

## Etapa 02 — casamento e dashboard — 12/11/2026

Implementada após autorização do usuário. Registro histórico; a etapa 03 foi autorizada posteriormente e está descrita abaixo.

### Funcionalidades

- Cadastro e edição com Reactive Forms: todos os dados gerais, foto, locais separados, orçamento inicial e estimativa de convidados.
- Lista pesquisável, seleção persistente, arquivamento confirmado e restauração sem perda de dados.
- UUID por casamento e isolamento dos registros por identificador. Preferências de aparência preservadas em registro separado da seleção.
- Validação de datas reais, horários 24h, nomes, números não negativos, quantidades inteiras e capacidade do local. Foto validada por formato, tamanho e decodificação.
- Confirmação de alterações não salvas e mensagens de carregamento, erro e sucesso.
- Dashboard real com identificação, data, contagem regressiva, foto, orçamento e estimativas do casamento ativo. Alertas derivados dos campos ainda não preenchidos.
- Demonstração da etapa 01 preservada como opção explícita. Sem persistir dados fictícios e sem apresentar estimativas como despesas ou pagamentos.
- Cabeçalho e seletor conectados ao casamento ativo; destinos de indicadores, atividades e alertas ligados ao dashboard.
- Fontes e ícones locais com licenças, eliminando dependência externa de apresentação durante o uso.

### Arquivos criados e alterados

Criados: `src/app/features/weddings/wedding-list.{ts,html}`, `src/app/features/weddings/wedding-form.{ts,html}`, `src/app/core/services/weddings.ts`, `src/app/core/services/weddings.spec.ts`, `src/app/core/utils/wedding.ts`, `src/app/core/utils/wedding.spec.ts`, `src/app/core/guards/unsaved-wedding.ts`, `src/app/shared/components/confirm-dialog.ts`, `src/app/features/dashboard/demo-dashboard.{ts,html}`, `e2e/weddings.spec.ts`, `scripts/vendor-fonts.mjs`, `public/fonts/**`.

Alterados: modelos, dashboard, layout, rotas, configuração do router, mensagem de módulos futuros, estilos, HTML inicial, `angular.json` (fontes locais), testes de layout, configuração Playwright, README e este documento.

### Verificações

- Compilação de produção sem erros.
- 11 testes unitários aprovados, incluindo datas, valores, capacidade, isolamento, persistência de seleção, arquivamento e falha de gravação.
- 6 testes de navegador aprovados: navegação, tema, criação, edição, reload, troca de casamentos, validação, confirmação, arquivamento/restauração, foto, formulário móvel e layout escuro em 320 px.
- Capturas da etapa em `artifacts/etapa-02-*.png`.

### Decisões e limites

Data opcional com entrada em DD/MM/AAAA e persistência ISO sem fuso, capacidade zero como não definida, campos adicionais compatíveis com o esquema IndexedDB 1 existente. Arquivamento substitui exclusão física para preservar dados. Foto limitada a 2 MB. Seleção e cadastro são gravações distintas; falha ao selecionar após salvar informa que o cadastro já foi preservado.

Estimativas não são contagens de convidados cadastrados. Financeiro completo e respectivos indicadores pertencem à etapa 03; pessoas à etapa 04. Não há sincronização automática entre abas ou dispositivos, backup, Supabase, login ou publicação. Instruções manuais no README. Aguardar avaliação antes de iniciar a etapa 03.

### Ajustes solicitados na avaliação da etapa 02

- Data com calendário Angular Material em pt-BR, abertura pelo campo ou ícone, digitação DD/MM/AAAA ou oito dígitos e persistência ISO sem alteração de fuso.
- Tipo de cerimônia com select de opções visíveis; Personalizada permite descrição adicional. Tipos antigos preservados.
- Paleta com nome e até oito seletores visuais de cor, inclusão, alteração e remoção, preservados após recarregar.
- Criado `src/app/shared/components/date-picker.ts` e teste `e2e/wedding-controls.spec.ts`. Alterados formulário, modelos, utilitários, estilos e documentação.
- Verificação: 11 testes unitários e 7 testes de navegador aprovados. Teste novo cobre calendário, data sem barras, opções de cerimônia e persistência das cores e da descrição.
- Captura: `artifacts/etapa-02-calendario-paleta.png`.

### Formatação monetária

- Campo de orçamento com formato brasileiro `R$ 15.000,00` ao abrir e ao sair da edição. Aceita reais inteiros, vírgula decimal e colagem de valores formatados, mantendo o número no IndexedDB.
- Diretiva reutilizável `src/app/shared/directives/currency-input.ts`, testes de conversão e fluxo de gravação/reabertura em `e2e/currency.spec.ts`.
- Valores monetários demonstrativos também exibem duas casas decimais. Quantidades de pessoas continuam números inteiros.

### Refinamentos de preenchimento

- Estilo e tema com exemplos e explicações junto aos campos, sem preencher dados automaticamente.
- Paleta inicialmente sem cores e sem amostra predefinida. Ação Escolher cores para abrir o editor e Deixar sem cores para limpar nome e seleções. Estado vazio persiste após salvar e recarregar.
- Orçamento formatado em reais a cada digitação, mantendo o cursor na parte inteira; vírgula permite editar os centavos. Digitar `15000` resulta em `R$ 15.000,00` imediatamente. Colagem e edição de valores existentes preservadas.
- Compilação aprovada, 13 testes unitários e 8 testes de navegador, incluindo digitação tecla a tecla e paleta vazia após reabertura.

## Etapa 03 — financeiro — 12/11/2026

Implementada após autorização expressa. A etapa 04 não foi iniciada.

### Entregue

- Orçamento geral, reserva e metas por categoria; cadastro, edição e exclusão protegida de categorias.
- Despesas previstas/contratadas/canceladas, edição, consulta, pesquisa, filtros e paginação; fornecedor por nome, referência de contrato e anexo local.
- Entrada e parcelamento mensal com distribuição exata de centavos. Datas e calendários em pt-BR e valores formatados durante a digitação.
- Pagamentos parciais, quitação integral/antecipada, descontos, juros, multas, devoluções vinculadas e correção de operações com motivo e histórico preservados.
- Proteções contra excesso de pagamento, devoluções indevidas, parcelas duplicadas e alterações de principal com histórico.
- Contas a pagar, vencidas, quitadas, próximos sete dias e edição individual de vencimentos.
- Indicadores reais no dashboard e no financeiro; Chart.js para categorias, valores previstos/contratados/pagos e evolução mensal.
- Sete relatórios com período/categoria/situação, exportação CSV e PDF, totais compartilhados com o restante do sistema.
- Persistência IndexedDB versão 2, atualização incremental sem perder casamentos/preferências e mutação atômica do agregado financeiro por casamento. Contrato FinanceRepository por token, independente dos componentes.
- Telas responsivas, estados vazios e mensagens de erro/sucesso. Nenhum dado financeiro demonstrativo inserido na base real.

### Arquivos principais

Criados: `src/app/core/models/finance.ts`, `src/app/core/repositories/finance.repository.ts`, `src/app/core/services/finance.ts`, `src/app/core/utils/finance.ts`, `src/app/core/utils/finance-reports.ts`, respectivos testes, `src/app/features/finance/**`, `src/app/shared/components/finance-chart.ts`, `src/app/shared/components/attachment.ts`, `e2e/finance.spec.ts`, `scripts/render-finance-pdf.mjs`.

Alterados: repositório IndexedDB, rotas, constantes de navegação, layout, dashboard, componente de calendário, estilos, `angular.json`, dependências e lockfile, teste de navegação, README e este documento.

### Qualidade e testes

- Compilação de produção aprovada, sem erros de TypeScript.
- 27 testes unitários: inclui cálculos financeiros, arredondamento, datas, pagamentos parciais, devoluções, ajustes, correções, quitação antecipada, cancelamento, isolamento entre casamentos, relatórios, migração e concorrência.
- 11 testes de navegador cobrindo funcionalidades existentes e o novo financeiro, inclusive exportação, persistência, duas bases independentes, comprovantes de cálculo e responsividade em 390 px.
- PDF exportado e renderizado para inspeção; texto e valor R$ 2.000,00 conferidos automaticamente. Capturas em `artifacts/etapa-03-*`.
- Auditoria npm mantém os 16 avisos moderados transitivos já registrados nas ferramentas do CLI, sem alertas altos/críticos. PDF.js de verificação fixado em versão fora da faixa vulnerável identificada.

### Limites e próxima etapa

Fornecedores e contratos têm referência textual/anexo nesta etapa; vínculos por ID aguardam a etapa 06. Há um anexo por despesa e por operação, até 1 MB. Cancelamento substitui exclusão física para preservar o histórico. Relatórios não são um backup completo. Não há login, Supabase, sincronização de dispositivos ou publicação.

O financeiro agora atualiza entre telas e abas do mesmo endereço, conforme refinamento abaixo. A transação atômica impede sobrescritas silenciosas de gravações financeiras concorrentes. Um cadastro aberto para outro casamento não pode ser salvo no selecionado por engano.

Aguardar avaliação antes da etapa 04 — convidados, famílias e padrinhos/madrinhas.

### Revisão após teste do usuário — 13/11/2026

- Parcelas vencidas com saldo em aberto destacadas em vermelho, incluindo vencimento, valores, borda e indicação Vencida. O destaque some após a quitação; despesas canceladas não são marcadas como vencidas.
- Escolha de anexos redesenhada em componente compartilhado, com ícones, descrição dos formatos, seleção/troca de arquivo, nome e remoção. Mesmo componente nas despesas e operações.
- Atualização financeira ao navegar e voltar à janela/aba, além de comunicação entre abas pelo BroadcastChannel. Mensagens transmitem somente o identificador do casamento; os dados são lidos do IndexedDB.
- Proteção contra leitura antiga de atualização sobrescrever um pagamento recém-salvo. Registro já confirmado não é tratado como falha caso uma notificação entre abas falhe.
- Histórico de pagamentos identifica casamento e quantidade de operações filtradas, com ação Limpar filtros. Confirmação no detalhe oferece acesso direto ao histórico.
- Teste reproduz dois pagamentos de R$ 2.000,00: total R$ 4.000,00 no detalhe e orçamento, com duas operações no histórico, inclusive em outras abas abertas e após recarregar.
- Novos testes de anexos e de atualização concorrente. Verificações: 28 testes unitários; 13 testes de navegador no conjunto completo.
- Arquivos: serviço financeiro e testes, componente de anexos, detalhe da despesa, contas, histórico de pagamentos, estilos, teste financeiro e documentação.

### Identificação das parcelas pagas — 13/11/2026

- Parcelas com saldo zero exibem Pago em verde e não mostram o botão Registrar. Os pagamentos existentes não foram alterados nem redistribuídos.
- Ao registrar pagamento, parcelas pagas ficam desabilitadas no seletor; a primeira parcela em aberto é selecionada. Devoluções e ajustes continuam permitindo selecionar parcelas já pagas.
- Tentativa de pagamento duplicado informa que a parcela já está paga; excesso de valor informa o saldo e a parcela correspondente.
- Testes adicionais de pagamento duplicado, indicação Pago e seleção de parcelas/devoluções. Conjunto: 29 testes unitários e 14 testes de navegador.

### Relatórios detalhados e motivo visível — 13/11/2026

- Modal de desfazer com label destacado, campo maior, borda, fundo, exemplo de preenchimento e contador de caracteres; motivo permanece obrigatório e registrado.
- Novo relatório financeiro completo, aberto por padrão na central. Relatório de despesas também passa a incluir dados integrais de cada registro, parcelas, todas as operações e auditoria.
- Resumo de orçamento/reserva, previsto, contratado ajustado, pagamentos brutos, devoluções, pago líquido, aberto, vencido, a vencer, contagem de parcelas e ajustes. Valores gerais do casamento identificados separadamente dos acumulados do recorte.
- Detalhamento com datas, fornecedor, categoria, formas de pagamento, referência do contrato, observações, nomes dos arquivos, identificadores, registro das operações, motivos/datas das correções e pagamentos originais de devoluções.
- CSV com metadados, resumo e todas as tabelas; PDF paginado com cabeçalhos repetidos e destaque de Pago/Vencida. Exportações incluem todas as linhas, sem depender da paginação da tela. Arquivos de anexos são identificados, sem embutir seus conteúdos.
- Componente de tabela reutilizável com paginação, seções expansíveis e apresentação responsiva. Servidor de testes isolado na porta 4300.
- Arquivos criados: `core/utils/finance-report-details.ts`, `core/utils/finance-report-pdf.ts`, `core/utils/finance-report-details.spec.ts`, `shared/components/report-table.ts`, `e2e/detailed-reports.spec.ts`. Alterados: construtor de relatórios/CSV, central de relatórios, modal de correção, estilos, testes, renderizador de PDF, configuração Playwright e documentação.
- Verificação: 32 testes unitários e 15 testes de navegador. PDF completo de teste renderizado em sete páginas, com dados de pagamento, devolução, juros, multa, desconto, operação desfeita e observações extensas para revisão visual.

### Relatórios sem informações técnicas — 13/11/2026

- Categorias sem despesas no recorte e sem orçamento definido deixam de aparecer nas tabelas de relatório. Categorias com meta definida continuam visíveis para acompanhar o planejamento.
- Identificadores internos removidos de despesas, parcelas, operações, devoluções e trilhas de alterações na tela, CSV e PDF. Referências agora usam descrição da despesa, parcela, tipo/valor/data do pagamento e nome da categoria. Referência de contrato informada pelo usuário é preservada.
- Identificadores continuam apenas na persistência e nas relações internas; nenhum cadastro ou pagamento é alterado.
- Testes atualizados para garantir ausência de UUIDs nas saídas e exclusão das categorias não utilizadas. Conjunto: 33 testes unitários e 15 testes de navegador.

## Etapa 04 — Pessoas — 13/11/2026

### Ajustes em famílias e cadastro rápido

- Correção final conforme solicitação explícita: copiar todos os campos, deixando somente Nome completo vazio. Novo UUID continua garantindo cadastro independente. Lado dos noivos e confirmação receberam valores explícitos nas opções para selecionar corretamente dados iniciais do formulário. Teste no navegador verifica Noivo, confirmação, contatos, idade, restrições, acessibilidade, mesa e observações. Compilação e 43 testes unitários aprovados.

- Refinamento após feedback: duplicação agora preenche também nome, criança/idade, restrições, acessibilidade e observações. Nome recebe foco e seleção para troca imediata; título Duplicar integrante e instrução explícita de salvar. Apenas confirmação e envio do convite são reiniciados. Substitui a cópia limitada descrita no registro inicial abaixo.

- Botão Nova família ou grupo alinhado com a pesquisa; ações de integrantes alinhadas com o seletor de confirmação, com adaptação para celular.
- Duplicar integrante abre um novo cadastro com família, contatos, grupo, relação, lado e mesa preenchidos. Nome vazio e UUID novo; confirmação, envio, idade, restrições, acessibilidade e observações não são copiados. A pessoa original permanece intacta; salvar continua obrigatório e os alertas de contatos compartilhados são preservados.
- Alterados utilitário de pessoas, página/formulário de pessoas e estilos. Teste de navegador adicional confirma cópia dos campos compartilhados, limpeza dos individuais e manutenção da confirmação original. Compilação, 43 testes unitários e três fluxos de navegador de pessoas aprovados.

### Recurso temporário solicitado — massa até a etapa 03

- Botões Criar/Usar/Remover massa de teste no Dashboard e na lista de casamentos. Um casamento fictício independente, com dados gerais e 12 despesas em todas as situações financeiras, parcelas, pagamentos, ajustes, devolução e histórico. Datas relativas ao dia da criação.
- Sem convidados ou padrinhos pré-cadastrados, para testar a etapa 04. Remoção confirmada limpa apenas o casamento marcado e seus registros financeiro/pessoas, preservando cadastros reais e restaurando a seleção anterior quando aplicável. Identificação temporária preservada após edição do cadastro; criação/remoção atômicas, sem duplicação.
- Criados `data/mocks/temporary-seed.ts`, `core/services/temporary-data.ts`, `shared/components/temporary-data-panel.ts`, teste unitário da massa e `e2e/temporary-data.spec.ts`. Alterados modelo/serviço de casamentos, Dashboard, lista de casamentos, README e seletor de status no teste de casamentos.
- Compilação de produção e 43 testes unitários aprovados. Teste de navegador cobre criar, editar, remover, preservar casamento real e recriar a massa. Nenhuma etapa adicional foi iniciada.

Implementada após autorização explícita do usuário (“Faça”). A etapa 05 não foi iniciada.

- Convidados: cadastro completo, edição, consulta, exclusão confirmada, filtros, paginação, crianças, acompanhantes como pessoas reais, contatos, restrições, acessibilidade, referência de mesa e situação do convite/confirmação.
- Famílias e grupos: cadastro, integrantes, convite compartilhado e confirmação individual, inclusive parcial. Exclusão protegida enquanto houver integrantes. Vínculos de acompanhantes consistentes ao mover famílias.
- Padrinhos e madrinhas: reutilização de convidados sem dupla contagem, participações individuais/pares simétricos, contatos e confirmação compartilhados, trajes, chegada, responsabilidades, presentes, posição e ordem de entrada. Exclusão da participação mantém a pessoa.
- CSV: modelo, importação com prévia/validação/alertas, confirmação explícita, exportação de todas as pessoas filtradas, proteção de fórmulas, datas brasileiras e ausência de IDs técnicos. Contatos compartilhados permitidos após alerta. Importação inválida não grava parcialmente.
- Dashboard com indicadores reais e gráfico de confirmações, recusas, pendentes, padrinhos, casais e convites previstos; alerta de capacidade e pessoas sem resposta. Estimativa inicial continua separada.
- IndexedDB versão 3 adiciona `people` sem apagar casamentos, preferências ou financeiro. Repositório injetável, agregado por casamento, gravações atômicas, validação de referências, atualização entre abas da mesma origem e tratamento de erro. Formulário com confirmação de descarte e aviso ao recarregar.

### Arquivos criados e alterados

- Criados: `core/models/people.ts`, `core/repositories/people.repository.ts`, `core/services/people.ts`, `core/utils/people.ts`, `features/people/people-page.ts`, `features/people/people-page.html`, `features/people/person-dialog.ts` e `features/people/person-dialog.html` (sob `src/app`).
- Testes criados: `core/utils/people.spec.ts`, `core/services/people.spec.ts`, `core/repositories/people-migration.spec.ts` e `e2e/people.spec.ts`.
- Alterados: repositório IndexedDB, rotas, navegação, layout/cabeçalho/rodapé, Dashboard, componente de gráfico (suporte a contagem sem moeda), estilos e fixture de relatório compatível com o banco atualizado. README e este progresso atualizados.

### Verificação e teste manual

- Compilação de produção aprovada; 42 testes unitários e 17 testes de navegador aprovados. Incluem migração com preservação dos dados, isolamento de casamentos, pares, acompanhantes, importação, confirmação parcial, persistência e regressão das etapas anteriores.
- Capturas em `artifacts/etapa-04-convidados-mobile.png`, `artifacts/etapa-04-familia.png` e `artifacts/etapa-04-cadastro-convidado.png`.
- Passo a passo completo no README, seção **Teste manual da etapa 04**.

### Pendências intencionais

Etapa 05: editor/modelos de convites, WhatsApp e simulação local de RSVP. Equipe fica na etapa 06 e organização gráfica/capacidade das mesas na etapa 08; o campo de mesa desta etapa é apenas uma referência textual. Relatórios gerais/PDF de pessoas permanecem para a central da etapa 10; esta etapa oferece CSV de convidados. Backup/restauração, login, Supabase, links públicos e publicação continuam pendentes.

## Revisão do controle simples — 14/11/2026

Solicitação atendida: itens 2 a 6 da revisão.

- Gastos cancelados exibem R$ 0,00 em aberto, sem próximo vencimento e com aviso explícito de ausência de dívida. Valores originais e operações permanecem no histórico; cálculos do histórico não foram apagados.
- Lista de gastos mostra a próxima parcela com saldo, avançando após pagamento e voltando quando uma devolução reabre saldo. Gasto quitado ou cancelado não apresenta vencimento pendente.
- Inclusão por lista de nomes confere repetições na própria lista e nos convidados existentes, ignorando acentos, caixa e espaços. Exige confirmação para manter homônimos e verifica novamente no momento de salvar, sem importação parcial.
- Botão Baixar lista em PDF em Convidados e Participações especiais. Inclui todos os resultados do filtro, independentemente da página da tabela, com cabeçalhos repetidos e páginas numeradas, sem identificadores internos.
- Testes antigos adaptados aos menus diretos, campos opcionais, ações em menu e participações especiais. Testes de criação de profissionais/escalas substituídos por fluxos do produto simplificado; rotas antigas continuam somente consulta. Nenhum teste ignorado.
- Novo roteiro manual: TESTES-REVISAO.md. README aponta para a suíte completa atual.
- Verificação final: 76 testes unitários, 50 testes de navegador (zero falhas, zero ignorados), compilação de produção aprovada. Cobertura inclui cálculos, contratos e parcelas, anexos, importação, confirmação, isolamento de casamentos, persistência, tabelas grandes, teclado e celular. PDFs de 103 convidados, lista filtrada e participações renderizados e revisados visualmente em todas as sete páginas.
- Testes executados em servidor/perfis isolados na porta 4300; dados de desenvolvimento da porta 4200 preservados.

## Contatos, gastos e contratos — fluxo simplificado (16/11/2026)

- Gastos e pagamentos é o local central para preços pesquisados, valores combinados, parcelas e pagamentos; fornecedor e contrato não são obrigatórios.
- Fornecedores agora apresenta Contatos dos fornecedores, sem cartões/coluna de totais financeiros nem aba que imitava uma segunda central de pagamentos. A página e o cadastro explicam que guardar um contato não gera cobrança.
- Ações do contato: Adicionar gasto com fornecedor/categoria preenchidos; Ver gastos deste fornecedor abre a lista central filtrada, com retorno para todos os gastos. Contatos ainda em pesquisa abrem um gasto como pesquisa de preço.
- Contratos continuam opcionais, com explicação própria. Ao assinar, a pergunta sobre o gasto já existente fica visível, permitindo reaproveitar as mesmas parcelas e pagamentos.
- Correção de data ao converter uma pesquisa em contratação: se ainda não houver data, o formulário adota hoje ao salvar.

## Cadastro único do gasto e fornecedor — 16/11/2026

- Fornecedor ou quem vai receber passou a ser obrigatório no gasto. O campo permite buscar um contato ou digitar um nome novo, incluindo cartório, loja e pessoa física. Não existe cadastro prévio obrigatório.
- O repositório grava contato, gasto e parcelas na mesma transação IndexedDB. Nome já existente é reaproveitado, considerando caixa, acentos e espaços. Se houver erro, nenhum contato ou gasto parcial fica salvo. Contratação atualiza o contato para Já contratei.
- Contrato/comprovante fica no próprio gasto como anexo opcional. A consulta Ver dados do fornecedor reúne contatos, gastos vinculados, anexos desses gastos e documentos dos contratos antigos. Os documentos não são copiados nem criam outro compromisso.
- Retirados a aba Contratos e o atalho Novo contrato das ações normais do fornecedor. Cadastros antigos continuam acessíveis em Contratos cadastrados anteriormente, sem apagar documentos, pagamentos, parcelas ou vínculos.
- Preservados os dados adicionais antigos de empresa, CPF/CNPJ, responsável e endereço em consulta recolhida.
- Salvar e adicionar outro limpa o fornecedor anterior. Campos legados de gasto continuam editáveis; novos cadastros exigem quem recebe.
- Revisão visual no computador e em 390px. Botões do gasto no celular ficam no fim do formulário, sem sobrepor os campos.
- Verificação: 78 testes unitários; suíte completa com 52 testes de navegador sem falhas, seguida de seis testes dos fluxos financeiros, anexos, cadastro unificado e celular após o ajuste visual final. Compilação de produção aprovada. Dados do usuário na porta 4200 não foram alterados.

## Exclusão definitiva de casamento — 16/11/2026

- Incluída Excluir definitivamente nas ações da tabela e nos cartões, para casamentos ativos ou arquivados. Arquivar/Restaurar continua preservando dados.
- Confirmação identifica o casamento e descreve todos os dados removidos, a impossibilidade de desfazer e a preservação dos demais casamentos. A exclusão só ocorre após confirmar no aplicativo.
- Remoção de weddings, finance, people, invitations, suppliers e preferências vinculadas em uma única transação; seleção muda para outro casamento ativo ou fica vazia. Marcador temporário da massa é atualizado.
- Marcador sem dados pessoais impede que formulários de abas antigas recriem o casamento ou seus registros após apagar; proteção no repositório genérico e na transação conjunta financeiro/fornecedores.
- Verificação: 79 testes unitários, 53 testes de navegador sem falhas ou ignorados, compilação de produção aprovada. Inclui cancelar confirmação, excluir com gasto/fornecedor/convidado, preservar outro casamento, excluir o último arquivado por cartão, persistência e rejeição de gravação antiga.
- Nenhum casamento do usuário na porta 4200 foi removido durante o desenvolvimento.

## Fornecedores dentro de Gastos e pagamentos — 16/11/2026

- Aba Fornecedores incluída na mesma área de Orçamento, Despesas, Contas a pagar e Relatórios. A página de contatos é reaproveitada sem cabeçalho ou navegação duplicados.
- Item independente Fornecedores retirado do menu lateral. Gastos e pagamentos fica destacado quando a aba está aberta.
- Endereço antigo /fornecedores/cadastro redireciona para /financeiro/fornecedores, preservando os cadastros. Contratos anteriores continuam acessíveis pela seção recolhida.
- Verificação: compilação de produção e 53 testes de navegador aprovados, sem falhas nem ignorados. Teste específico cobre redirecionamento, aba selecionada, menu lateral e consulta dos mesmos gastos/documentos.

## Alterações rápidas na tabela de convidados — 16/11/2026

- Colunas Confirmação e Convite enviado agora têm seleção na própria linha, com identificação acessível pelo nome da pessoa e gravação imediata.
- Alterações bloqueiam os controles enquanto salvam e mostram mensagem de sucesso/erro. Se falhar, o controle volta ao valor salvo.
- Marcar envio registra a data, sem modificar confirmação nem contatos. Desmarcar limpa a data. Repetir Sim preserva a data original.
- Componente de tabela aceita templates por coluna, mantendo valores de texto para ordenação, busca, paginação e exportações.
- Verificação: 80 testes unitários, nove testes dos fluxos de pessoas/listas grandes e teste específico de edição na tabela, envio independente da confirmação e persistência após recarregar. Compilação de produção aprovada.

## Família na inclusão por lista de nomes — 16/11/2026

- Campo Família (opcional) em Adicionar lista de convidados. Permite selecionar uma família cadastrada ou manter Sem família — convidados individuais.
- Todos os nomes da inclusão recebem a família selecionada, compartilham o convite e mantêm confirmação individual. A escolha começa vazia a cada nova lista.
- Serviço valida a existência da família na transação antes de adicionar pessoas, evitando vínculos inválidos e inclusão parcial se a família tiver sido excluída. Avisos de nomes repetidos continuam funcionando.
- Verificação de navegador inclui seleção da família, três integrantes, persistência ao recarregar e uma segunda inclusão individual.

## Busca de família na lista de convidados — 16/11/2026

- Seleção de família substituída por busca digitável no modal de inclusão por nomes. Resultados limitados a 30 por vez, com orientação para refinar a busca.
- Mantida opção Sem família — convidados individuais. Nome digitado exige selecionar um resultado ou limpar o campo, evitando inclusão individual por engano.
- Componente de busca reaproveitado, com rótulo de limpeza configurável. Teste de navegador aprovado com 101 famílias, busca, nome inexistente, vínculo dos três integrantes, persistência e segunda inclusão individual. Compilação aprovada.

## Lista de convidados com menos controles — 16/11/2026

- Fluxo principal mostra busca, um botão Adicionar convidados e tabela. Botão da janela de inclusão passou a Adicionar à lista.
- PDF, CSV, cadastro individual, visualização, filtros e importação por planilha reunidos em Filtros e outras opções, recolhido por padrão. Mensagens e prévia de importação continuam visíveis fora da área recolhida.
- Indicadores menores, contagem de resultados sem repetição e retirada do aviso de uso da tabela na visão compacta. Quantidade por página só aparece quando há mais de 25 registros; navegação só quando há outras páginas.
- Alteração em lote é ativada por Selecionar vários convidados. Sem caixa de 0 selecionados por padrão. Ativar seleção muda para tabela e recolhe as opções; ações de aplicar confirmação aparecem após selecionar pessoas.
- Edição de confirmação e convite enviado permanece na linha; recursos e dados existentes preservados.
- Verificação visual no computador e celular de 390px sem transbordamento. Compilação, 81 testes unitários e 55 testes de navegador aprovados, sem falhas nem ignorados. Roteiros automatizados atualizados para abrir opções quando necessário.

## Padrinhos, madrinhas e filtro de participação — 16/11/2026

- Ação Definir participação na própria linha do convidado, abrindo a pessoa já selecionada. Reaproveita a participação existente ao editar, sem duplicar convidados.
- Campo opcional de par com busca em participações de padrinho/madrinha disponíveis. Explicação orienta cadastrar primeiro a primeira pessoa e escolher o par na segunda. Vínculo recíproco reaproveita a transação existente; mudança para outro tipo de participação desvincula o par.
- Tipo e nome do par aparecem abaixo do nome em Convidados e no resumo da participação especial.
- Filtro Participação em Filtros e outras opções, tanto na lista de convidados quanto nas participações especiais. Busca por texto de convidados também considera a participação. Filtros aplicam-se às exportações existentes e são identificados na descrição do PDF.
- Verificação: 81 testes unitários, 12 testes de navegador e compilação aprovados. Teste adicional define madrinha e padrinho diretamente da tabela, forma o par por busca, confere reciprocidade, filtra cada participação e confirma persistência e contagem sem duplicação.

## Lista de presentes — 16/11/2026

- Nova área no menu, com presentes por casamento: nome, descrição, foto opcional, preço aproximado em reais e link da loja. Listas externas podem ser vinculadas por endereço, sem recadastrar produtos.
- Compartilhamento por PDF com fotos e links clicáveis, compartilhamento nativo quando compatível e alternativa de download. Opção de copiar mensagem com os links. Título e mensagem personalizáveis.
- Presentes recebidos ficam fora dos próximos compartilhamentos, com opção de consulta e retorno à lista. Busca, paginação e descrições longas recolhidas mantêm a tela compacta.
- IndexedDB atualizado para versão 6 preservando registros; exclusão de casamento e remoção de massa temporária incluem presentes. Gravações verificam casamento ativo, arquivamento e exclusão; links e imagens são validados. Não altera o financeiro.
- Limite atual: dados locais; PDF é uma cópia estática, sem reserva pública nem atualização de arquivos já enviados.
- Verificação concluída: 85 testes unitários, 58 testes de navegador (sem falhas, ignorados ou instabilidade) e build aprovados. Revisão visual em computador e celular de 390px, sem transbordamento. Três páginas do PDF renderizadas e conferidas; links, fotos, acentos e exclusão dos recebidos validados.
- Roteiro de uso em TESTES-REVISAO.md. Artefatos de QA em artifacts; renderização alternativa via scripts/render-gifts-review.cjs.

## Descrições repetidas na lista de presentes — 16/11/2026

- Apresentação e PDF removem linhas repetidas de descrições coladas, considerando diferenças de espaços e maiúsculas. O título do próprio presente não é repetido como descrição.
- Texto original preservado no formulário para revisão; descrições de outro produto não são substituídas por suposição.
- Verificação: 87 testes unitários, 2 testes de navegador e build aprovados. Teste de exportação inclui descrição com título e linha duplicados e confere uma única ocorrência no PDF. Todas as três páginas geradas foram renderizadas e inspecionadas.

## Quantidades e listas de presentes — 16/11/2026

- Quantidade desejada e recebida por presente, com ação Registrar 1 recebido e edição para corrigir contagens. Recebimentos acima da meta são preservados sem saldo negativo.
- Visões Falta receber, Já recebidos e Todos, com recebimentos parciais nas duas primeiras, resumo de unidades e contadores por cartão.
- Compatibilidade com registros antigos (1 unidade; estado recebido preservado), sem apagar dados ou alterar o financeiro. Validação de inteiros e gravação atômica dos incrementos.
- PDF e mensagem mostram apenas presentes pendentes e sua quantidade restante, com preço por unidade e links preservados.
- Verificação: 88 testes unitários, 3 testes de navegador e build aprovados. Casos de recebimento parcial, completo, extra, correção, persistência, isolamento e PDF cobertos. Roteiro em TESTES-REVISAO.md.

## Edição direta de presentes — 16/11/2026

- Retirado o botão Vincular lista de loja do fluxo principal. Vínculos já salvos continuam disponíveis, sem apagar dados existentes.
- Botão Editar presente visível diretamente no cartão. Permite mudar nome, descrição, preço, link, foto e quantidades sem abrir Gerenciar presente.
- Verificação: 3 testes de navegador e build aprovados, incluindo edição direta, persistência e preservação de listas externas antigas.

## Cartões de presentes uniformes — 16/11/2026

- Mesma altura e largura por coluna, com área de imagem fixa e proporção preservada sem recortar o produto.
- Espaços reservados para títulos, preços e quantidades; botões de loja e edição alinhados na base. Descrições longas têm área própria com rolagem, sem aumentar o cartão.
- Título completo disponível ao passar o cursor e no formulário de edição. Ações adicionais abrem dentro do cartão.
- Verificação visual no computador e celular, 3 testes de navegador e build aprovados.

## Cartões de presentes compactos — 16/11/2026

- Reduzida a altura de 780 para 500px, com foto de 180px e espaçamentos menores, mantendo cartões e ações alinhados.
- Resumo de recebimento mais leve; descrições recolhidas e abertas sob demanda dentro do cartão. Edição e acesso à loja continuam visíveis.
- Revisão visual no computador e celular de 390px. 3 testes de navegador e build aprovados.

## Primeiro versionamento no Git — 16/11/2026

- Repositório organizado com README atualizado, fontes e licenças, testes, documentação e lockfile de dependências.
- .gitignore exclui dependências, build, caches, resultados e evidências dos testes, downloads gerados, variáveis de ambiente, chaves, configuração MCP local e diretório da Vercel.
- .gitattributes padroniza finais de linha do código e trata os assets como binários. Configuração antiga de debug do Karma retirada; projeto usa Vitest.
- Validação anterior ao envio: 88 testes unitários, 59 testes de navegador (sem falhas ou ignorados), build e verificação do diff aprovados. Nenhum dado do navegador foi alterado.
