# Preparação do Supabase

**Estado: três migrações aplicadas e verificadas no projeto OrganizaCasamento em 16/11/2026. O frontend ainda utiliza IndexedDB.**

Projeto verificado: `luhamomwwsiqxodwjodo` (`https://luhamomwwsiqxodwjodo.supabase.co`). Antes da aplicação, tabelas públicas, migrações, usuários e buckets estavam vazios. Histórico remoto e nomes dos arquivos locais estão sincronizados:

- `20261116184053_wedding_control_foundation`
- `20261116184100_private_wedding_storage`
- `20261116184215_restrict_internal_ddl_trigger`

Verificações concluídas: 23 tabelas com RLS, 87 políticas nas tabelas da aplicação, 4 políticas de Storage e 2 buckets privados. Auditoria de segurança sem avisos após restringir a função interna de DDL `rls_auto_enable()`. Avisos informativos de índices ainda não utilizados são esperados no banco vazio; os índices foram mantidos.

Teste remoto em `tests/rls_smoke.sql` aprovado com duas contas temporárias e rollback integral; confirmação posterior de zero usuários/casamentos/convidados de teste persistidos. Consulta anônima de casamentos pela Data API com chave publicável respondeu HTTP 401. Auth verificado com e-mail habilitado, confirmação de e-mail exigida e login anônimo desabilitado. Não foram alteradas as opções de Auth remotas: URLs finais, SMTP, login Google e recuperação devem ser concluídos durante a implementação do login.

Tipos gerados a partir do banco hospedado em `src/app/core/models/database.types.ts`. Nenhuma chave secreta ou token OAuth foi gravado no projeto.

O conector dedicado é **supabase-organizacasamento**. Não aplicar em outro projeto por causa de uma conexão MCP antiga. Para futuras alterações, inspecionar tabelas e histórico existentes e criar uma nova migração. Não executar reset remoto nem reaplicar as migrações já registradas.

## Estrutura

| Área            | Tabelas                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| Conta           | `profiles`, `user_preferences`                                                                                       |
| Casamento       | `weddings`                                                                                                           |
| Financeiro      | `finance_settings`, `finance_categories`, `expenses`, `installments`, `financial_transactions`, `finance_audit`      |
| Fornecedores    | `suppliers`                                                                                                          |
| Convidados      | `families`, `guests`, `special_participations`                                                                       |
| Convites        | `invitation_designs`, `invitations`, `invitation_guests`, `rsvp_responses`, `invitation_messages`, `whatsapp_queues` |
| Presentes       | `gift_lists`, `gift_items`, `external_gift_lists`                                                                    |
| Compatibilidade | `legacy_snapshots`                                                                                                   |

O escopo inicial é uma conta proprietária por casamento, com quantos casamentos forem necessários. Compartilhamento entre contas do casal requer uma implementação posterior de membros e convites de acesso; não abrir RLS para todos os usuários autenticados.

- UUIDs preservam os identificadores locais. Valores monetários são inteiros em centavos e datas vazias devem virar NULL na importação. Datas de eventos não são timestamps; datas de histórico usam `timestamptz`.
- RLS habilitada nas 23 tabelas, sem acesso `anon`, sem autorização baseada em metadados editáveis do usuário. Políticas de escrita rejeitam casamentos arquivados.
- Referências compostas incluem `wedding_id`, impedindo misturar pessoas, parcelas, pagamentos e outros vínculos de casamentos distintos.
- Nomes de convidados não são únicos: homônimos continuam permitidos.
- Fotos e documentos vão para Storage; tabelas armazenam caminhos. Não colocar base64 nem URLs assinadas permanentes nas tabelas.
- `legacy_snapshots` preserva contratos, propostas, profissionais e escalas antigos para consulta/importação, sem reintroduzir esses cadastros no fluxo simplificado. Campos legados de convidados/participações também têm espaço de preservação.
- Tokens públicos de convites devem ser novos, aleatórios e guardados apenas como hash. Não importar os antigos tokens locais como links públicos. Ainda não há endpoint público de RSVP.

## Arquivos privados

Buckets previstos: `wedding-images` (2 MiB; JPEG/PNG/WebP) e `wedding-documents` (1 MiB; PDF/JPEG/PNG/WebP), ambos privados. Nome de objeto: `<user_uuid>/<wedding_uuid>/<arquivo_aleatorio>`.

Existem políticas de leitura, criação, edição e remoção, incluindo suporte a substituição de arquivo. A integração deverá usar URLs assinadas de duração limitada e remover arquivos pela Storage API antes de excluir definitivamente um casamento. Apagar uma linha SQL não apaga o conteúdo binário no Storage. Não excluir diretamente linhas de `storage.objects`.

## Limite deliberado do financeiro

As tabelas financeiras estão preparadas com acesso de leitura do proprietário, mas a escrita direta pelo cliente está revogada. Antes de trocar o frontend para Supabase, implementar RPCs transacionais para orçamento, contratação, parcelamento, pagamentos, devoluções, ajustes, cancelamento, estorno e auditoria, com bloqueio concorrente e validação de saldos. Não liberar CRUD financeiro direto para contornar isso.

Essa preparação não migra dados locais nem muda o armazenamento atual da aplicação. Os cálculos existentes e os dados no navegador permanecem intactos.

## Configuração e aplicação

Arquivos gerados com Supabase CLI **3.2.0**. `config.toml` representa o ambiente **local**, com URL em localhost:4200, senha mínima de 8 caracteres e login anônimo desabilitado. Ele não altera as opções do painel remoto por si só.

Procedimento para novas configurações e etapas restantes:

1. Inspecionar o esquema existente e histórico de migrações; resolver qualquer conflito antes de aplicar.
2. Aplicar somente novas migrações com a ferramenta autenticada e registrar o mesmo histórico remoto/local. As três migrações listadas acima já foram aplicadas.
3. Executar consultas de verificação, testes RLS e advisors de segurança/performance no projeto real.
4. Conferir Auth: e-mail/senha, confirmação de e-mail, recuperação de senha, SMTP e URLs de redirecionamento. O domínio da Vercel só deve ser configurado quando conhecido. Login Google precisa da configuração OAuth própria, não de uma chave secreta no frontend.
5. Confirmar limites/tipos e acesso privado dos dois buckets via Storage API.
6. Implementar login, adaptadores e RPCs antes da migração dos cadastros reais. Migrar com backup, validação e importação idempotente; nunca apagar IndexedDB automaticamente.

## Testes locais sem Docker

```sh
npm install --prefix artifacts/sql-runtime --no-save --package-lock=false @electric-sql/pglite@0.5.16
node scripts/test-supabase-schema.mjs
```

O teste usa um Postgres/WASM isolado com representações mínimas de `auth` e `storage`, aplica o SQL e testa acesso de duas contas, bloqueio anônimo, vínculos cruzados, arquivamento, quantidades, exclusão em cascata e restrições de escrita financeira. Não substitui os testes dos serviços Auth/Storage, advisors nem testes de integração no Supabase hospedado.
