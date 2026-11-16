# OrganizaCasamento

Aplicação para o casal acompanhar o orçamento, os gastos, os pagamentos, os convidados, os convites e a lista de presentes do casamento.

## Estado atual

Angular 21, TypeScript, SCSS e Angular Material. Os dados são armazenados localmente no navegador com IndexedDB. Ainda não há login, integração com Supabase ou publicação em produção.

- **Visão geral:** orçamento, valores combinados, pagamentos e próximos vencimentos.
- **Gastos e pagamentos:** pesquisa de preços, gastos contratados, entrada e parcelas, pagamentos, ajustes e relatórios. Fornecedores ficam nas abas dessa área; contrato e comprovantes são anexos opcionais.
- **Contas a pagar:** parcelas pendentes e vencidas, com destaque para atrasos.
- **Convidados:** cadastro individual, lista de nomes, importação CSV, famílias, acompanhantes, confirmação e participações especiais. Busca, tabelas, ações em lote e exportação PDF/CSV.
- **Convites:** modelos, imagens/PDFs, preparação de mensagem para WhatsApp e controle dos envios e respostas.
- **Lista de presentes:** foto, descrição, preço por unidade, link da loja e quantidades desejadas/recebidas. Listas de pendentes e recebidos e PDF compartilhável com links clicáveis.
- **Meu casamento:** dados do casal, foto, data, local, orçamento e gerenciamento de casamentos separados.

Os controles temporários de massa de teste criam um casamento fictício separado. Registros antigos de contratos e equipe são preservados, com consultas de compatibilidade fora do fluxo principal simplificado.

## Executar localmente

Requisitos: Node.js compatível com Angular 21 (Node 20.19 ou superior na série 20, ou versões compatíveis das séries 22/24) e npm.

```sh
npm ci
npm start
```

Abra `http://localhost:4200`. Não são necessárias credenciais ou variáveis de ambiente nesta versão.

## Validação

```sh
npm test -- --watch=false
npm run build
npx playwright install chromium
npx playwright test --workers=4
```

Os testes de navegador iniciam uma instância isolada em `http://127.0.0.1:4300`, com dados de teste próprios. Não utilizam os cadastros do navegador em `localhost:4200`.

O build fica em `dist/organiza-casamento/`. Scripts de renderização de PDFs estão em `scripts/`; evidências locais dos testes ficam em `artifacts/`. Essas saídas não são versionadas.

## Estrutura

- `src/app/core/`: modelos, cálculos, repositórios e serviços.
- `src/app/features/`: telas de casamento, financeiro, pessoas, convites, fornecedores e presentes.
- `src/app/shared/`: componentes e diretivas reutilizáveis.
- `src/app/layout/`: navegação e estrutura visual.
- `e2e/`: testes de navegador com Playwright.
- `public/fonts/`: fontes locais e respectivas licenças.
- `TESTES-REVISAO.md`: roteiros de conferência manual e ajustes de fluxo.
- `PROGRESSO.md`: histórico de implementação. Descrições antigas refletem a interface da época; o resumo acima representa o fluxo atual.

IndexedDB versão 6, com stores `preferences`, `weddings`, `finance`, `people`, `invitations`, `suppliers` e `gifts`. A remoção definitiva de um casamento exclui os registros vinculados; arquivar mantém os dados.

## Limitações atuais

- Os dados pertencem a este navegador e não sincronizam entre dispositivos. Limpar os dados do site pode apagá-los.
- Links locais de convites não são links públicos para convidados em outros aparelhos.
- O WhatsApp abre mensagens e arquivos para revisão; o envio é confirmado pela pessoa no aplicativo.
- A lista de presentes compartilhada em PDF é uma cópia do momento da exportação. Não reserva produtos nem atualiza arquivos já enviados.
- A leitura automática de dados de produtos em lojas ainda não está implementada.

## Git e dados locais

O `.gitignore` mantém fora do repositório `node_modules`, build, caches, relatórios, evidências de testes, arquivos `.env`, chaves privadas, configuração MCP local e arquivos da Vercel. O `package-lock.json`, os testes, o código e as licenças das fontes são versionados.

O repositório contém o sistema; os casamentos cadastrados no IndexedDB não fazem parte do Git. Antes de migrar para Supabase, preparar backup e importação dos dados existentes.

Próximos passos: Supabase com controle de acesso, login, migração dos dados locais e publicação na Vercel.
