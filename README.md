# OrganizaCasamento

Aplicação para acompanhar o orçamento, os gastos, os pagamentos, os convidados, os convites e os presentes do casamento.

## Estado atual

Angular 21, TypeScript, SCSS e Angular Material, com login por e-mail/senha e dados no Supabase. Cada conta acessa seus próprios casamentos. O site ainda não foi publicado na Vercel.

- **Visão geral:** orçamento, valores combinados, pagamentos e próximos vencimentos.
- **Gastos e pagamentos:** pesquisa de preços, gastos contratados, entrada e parcelas, pagamentos, ajustes e relatórios. Fornecedores ficam nas abas dessa área; contrato e comprovantes são anexos opcionais.
- **Contas a pagar:** parcelas pendentes e vencidas, com destaque para atrasos.
- **Convidados:** cadastro individual, lista de nomes, importação CSV, famílias, acompanhantes, confirmação e participações especiais. Busca, tabelas, ações em lote e exportação PDF/CSV.
- **Convites:** modelos, imagens/PDFs, preparação de mensagem para WhatsApp e controle dos envios e respostas.
- **Lista de presentes:** foto, descrição, preço por unidade, link da loja e quantidades desejadas/recebidas. PDF compartilhável com links clicáveis.
- **Meu casamento:** dados do casal, foto, data, local, orçamento e casamentos separados.

Registros antigos de contratos e equipe são preservados fora do fluxo simplificado. A massa temporária local fica disponível apenas na configuração de testes.

## Executar

Requisitos: Node.js compatível com Angular 21 (20.19 ou superior na série 20, ou séries 22/24 compatíveis) e npm.

```sh
npm ci
# Copie .env.example para .env.local e preencha URL/chave publicável.
npm start
```

Abra `http://localhost:4200` e crie sua conta. Configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` em `.env.local` ou no ambiente de build. Nunca use chave secreta/service_role no frontend. `npm start` e `npm run build` geram a configuração pública a partir dessas variáveis.

No Supabase → Authentication → URL Configuration, use Site URL `http://localhost:4200` e permita `http://localhost:4200/**` e `http://127.0.0.1:4200/**` nos Redirect URLs. Quando publicar, configure o domínio definitivo. O `config.toml` local não altera o Auth remoto.

Após entrar, **Trazer meus cadastros anteriores** permite baixar backup e importar casamentos deste navegador ou de um backup JSON. A importação confere os dados salvos e mantém os originais. Também está acessível pelo botão de informações da barra superior. Nenhum cadastro antigo é apagado automaticamente.

## Validação

```sh
npm test -- --watch=false
npm run build
npx playwright install chromium
npx playwright test --workers=4
npx playwright test --config playwright.cloud.config.ts --workers=1
```

Os testes anteriores usam a configuração `testing` com IndexedDB isolado na porta 4300. Os testes da interface em modo Supabase usam a porta 4301 com HTTP simulado, sem enviar e-mails nem criar contas reais. SQL/RLS/RPCs são testados separadamente no Postgres e no projeto real com rollback. Não utilizam os cadastros em `localhost:4200`.

O build fica em `dist/organiza-casamento/`. Evidências ficam em `artifacts/`, sem versionamento.

## Estrutura

- `src/app/core/`: modelos, cálculos, repositórios, Auth e serviços.
- `src/app/features/`: telas dos módulos, acesso e importação.
- `src/app/shared/`: componentes e diretivas reutilizáveis.
- `e2e/`: testes das funcionalidades existentes no ambiente local isolado.
- `e2e-cloud/`: testes da integração da interface com Supabase simulado.
- `supabase/`: migrações, testes SQL e detalhes da integração.
- `public/fonts/`: fontes locais e respectivas licenças.
- `TESTES-REVISAO.md`: roteiros de conferência.
- `PROGRESSO.md`: histórico. Descrições antigas refletem a interface da época.

No uso normal, os repositórios usam Supabase e Storage privado, com transações e revisão por casamento. IndexedDB versão 6 permanece como fonte de importação e no ambiente de testes. Excluir um casamento remove seus registros; arquivar os preserva.

## Limitações

- É necessário ter internet para ler/salvar. Não há gravação offline nem fallback silencioso para IndexedDB. Outra aba/aparelho é atualizado ao reabrir/atualizar a tela; não há assinatura Realtime.
- O site precisa ser publicado para os links de convites funcionarem em outros aparelhos. `localhost` continua acessível somente na própria máquina.
- Login por e-mail/senha implementado. Google OAuth, SMTP próprio, Vercel e compartilhamento de um casamento entre contas são etapas separadas. A entrega real dos e-mails deve ser validada após configurar os retornos do Auth.
- WhatsApp prepara mensagens/arquivos para revisão; o envio é confirmado pela pessoa no aplicativo.
- A lista de presentes em PDF é uma cópia do momento da exportação. Não reserva produtos nem atualiza arquivos já enviados. A leitura automática de produtos de lojas não está implementada.

## Git e banco

`.gitignore` exclui dependências, build, caches, evidências, backups, arquivos `.env`, chaves privadas, configuração MCP local e Vercel. `.env.local` e `src/environments/cloud.generated.ts` são ignorados. O repositório contém código, testes, lockfile e licenças, não os cadastros.

O projeto Supabase OrganizaCasamento (`luhamomwwsiqxodwjodo`) possui 24 tabelas com RLS, RPCs transacionais, importação idempotente e buckets privados. Tipos gerados em `src/app/core/models/database.types.ts`; detalhes em `supabase/README.md`.

**Novos cadastros usam Supabase; os antigos só passam a ser usados na nuvem após a importação.** Para isso, entre na conta correta e escolha os casamentos no navegador original. Criar a estrutura não transfere automaticamente o IndexedDB.
