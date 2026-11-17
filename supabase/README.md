# Supabase integrado

Projeto: `luhamomwwsiqxodwjodo` (`https://luhamomwwsiqxodwjodo.supabase.co`). Migrações aplicadas e verificadas em 16/11/2026:

- `20261116184053_wedding_control_foundation`
- `20261116184100_private_wedding_storage`
- `20261116184215_restrict_internal_ddl_trigger`
- `20261116193756_cloud_workspace_transactions`

## Persistência e segurança

São 24 tabelas com RLS por proprietário. `wedding_workspaces` preserva os agregados usados pelas regras existentes (casamento, financeiro, pessoas, fornecedores, convites e presentes). Cada gravação sincroniza as tabelas relacionais na mesma transação. Isso mantém IDs e dados legados sem reintroduzir contratos/equipe no fluxo simplificado.

Clientes leem apenas seus registros. Escritas passam por RPCs; CRUD direto nas tabelas de negócio está revogado. Funções públicas são `SECURITY INVOKER`; operações privilegiadas ficam em `app_private` e conferem explicitamente `auth.uid()`. Não usam metadados editáveis para autorização.

- `save_workspace`: bloqueio por casamento, revisão otimista, projeção relacional e validação financeira. Impede mistura de casamentos, parcelas divergentes, excesso de pagamento/devolução e remoção do histórico. Operações podem ser desfeitas com motivo; não apagadas.
- `import_workspace`: mesma validação, preserva UUIDs e usa hash de origem para repetição sem duplicação. Não sobrescreve um casamento já existente de outra origem.
- `save_preference`: grava preferências da própria conta sem perder outra preferência concorrente.
- `delete_workspace`: verifica proprietário e exclui em cascata. O cliente remove os arquivos pela Storage API depois. Se a rede interromper a limpeza, podem restar arquivos privados órfãos; não apagar linhas de `storage.objects` via SQL.

Escopo: uma conta proprietária por casamento. Compartilhar entre contas exige uma implementação futura de membros/permissões. A mesma conta já pode acessar em outro aparelho.

## Arquivos

Buckets privados: `wedding-images` (2 MiB; JPEG/PNG/WebP) e `wedding-documents` (1 MiB; PDF/JPEG/PNG/WebP). Caminho: `<user_uuid>/<wedding_uuid>/<sha256>.<extensão>`.

Agregados guardam referências, não base64. O adaptador carrega os binários autenticados em memória para compatibilidade de fotos, anexos e PDFs existentes. Uploads podem preceder a criação do casamento; leitura e limpeza ficam restritas ao prefixo do proprietário. Falhas não são apresentadas como sucesso nem salvas localmente.

## Convites

`view_invitation` e `respond_invitation` aceitam o token aleatório de 256 bits, inclusive sem login. A consulta retorna apenas desenho, nomes e respostas dos destinatários, sem contatos, outros convidados ou financeiro. Desativar o convite ou arquivar o casamento bloqueia acesso/respostas. Respostas usam o mesmo bloqueio/revisão das gravações do proprietário.

A tabela relacional guarda o hash do token. O agregado privado do proprietário mantém o token para permitir copiar o link novamente; nenhuma leitura anônima desse agregado é permitida. Tokens locais existentes já são aleatórios de 256 bits e permanecem nos convites selecionados para importação.

Fotos são acessíveis com o token somente se o caminho coincide com a foto daquele convite ativo. Demais arquivos continuam privados. Gere links a partir de `https://organizacasamento.vercel.app`; links antigos de `localhost` não podem ser usados por outras pessoas.

## Auth e configuração

E-mail/senha, criação de conta, confirmação, recuperação, troca de senha e saída implementados com `supabase-js` **2.99.3**, fixado no lockfile. Rotas privadas exigem sessão. Sair/trocar de conta recarrega o aplicativo para limpar dados em memória.

Configure `.env.local` a partir de `.env.example`: somente URL e chave **publicável**. Nunca usar service_role, chave secreta ou token de gerenciamento no frontend.

No painel remoto, conferir Authentication → URL Configuration:

- Site URL: `https://organizacasamento.vercel.app`.
- Redirect URLs: `https://organizacasamento.vercel.app/acesso/confirmar` e `https://organizacasamento.vercel.app/acesso/nova-senha`.
- Mantenha `http://localhost:4200/**` e `http://127.0.0.1:4200/**` para desenvolvimento.

O conector não permite editar configurações remotas do Auth. A confirmação dessas URLs e o teste de entrega de e-mail estão pendentes de ação no painel. Não foram enviados e-mails de teste. SMTP próprio e Google OAuth não configurados. O frontend está publicado na Vercel. `config.toml` representa apenas o Supabase local.

## Importação

Após entrar, abrir `/importar-dados` no navegador/endereço original. Escolher casamentos, baixar backup JSON e importar. Casamentos demonstrativos/massa temporária são excluídos da seleção. Também é possível abrir um backup JSON exportado nessa tela.

Cada importação valida dados, envia fotos/documentos ao Storage e compara os agregados lidos do servidor, independentemente da ordem das chaves JSON. O original no IndexedDB é preservado. Concluídos não são duplicados ao repetir. A migração real só ocorre quando o usuário entra e a executa.

## Verificação

```sh
npm install --prefix artifacts/sql-runtime --no-save --package-lock=false @electric-sql/pglite@0.5.16
node scripts/test-supabase-schema.mjs
node scripts/test-cloud-workspaces.mjs
npm test -- --watch=false
npx playwright test --workers=4
npx playwright test --config playwright.cloud.config.ts --workers=1
npm run build
```

O primeiro SQL testa o estágio de fundação. O segundo aplica todas as migrações no Postgres/WASM e verifica transações, saldos, RLS, revisão, importação e RSVP. Gera `tests/cloud_smoke.sql`, executado também no banco real em uma única transação com rollback. `tests/rls_smoke.sql` documenta a verificação histórica anterior à revogação do CRUD e não valida as permissões atuais.

Testes de interface usam HTTP simulado para não criar contas/enviar e-mails. SQL real confirma as funções hospedadas, mas não substitui a conferência final de e-mail/sessão e upload com conta real após configurar Auth. Advisors de segurança executados após migração: nenhum aviso.
