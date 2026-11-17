# Administração

`/` é a apresentação pública. `/acesso/entrar` continua sendo o login. `/administracao` exige sessão e participação em `app_administrators`, conferida no servidor a cada chamada. Metadados editáveis do usuário e o endereço de e-mail não concedem privilégio.

O administrador inicial foi criado pela API oficial do Auth, com o endereço solicitado pelo proprietário. A senha inicial não está no repositório, na migração ou no navegador da aplicação. A primeira entrada exige uma nova senha com ao menos 12 caracteres, letras e números; a função bloqueia consultas e recuperação de outras contas enquanto essa troca não ocorre.

Administradores podem buscar contas com paginação, consultar os casamentos e gerar um link de recuperação de uso único para o titular escolher a própria senha. A senha atual nunca é retornada. A geração do link exige clique explícito e não envia mensagens automaticamente. Links são sensíveis e devem ser compartilhados apenas com o titular após verificar sua identidade.

As consultas de contas e gerações de recuperação são registradas em `administration_audit`, sem gravar senhas ou links de recuperação. A consulta de casamentos é de suporte, em modo leitura; a propriedade dos dados e as regras de isolamento das contas continuam preservadas. O administrador também pode acessar normalmente as funções do próprio casamento.

## Publicação da função

Publicar `supabase/functions/administration/index.ts`, `handler.ts` e `deno.json` como função `administration`. `verify_jwt=false` é intencional: o handler valida o bearer token com `auth.getUser` e consulta a permissão administrativa antes de usar a credencial de serviço. Essa credencial vem do ambiente nativo da Edge Function e nunca é enviada ao frontend. Chamadas sem sessão ou sem permissão recebem 401/403. Origens de produção e desenvolvimento são explícitas no handler.

A configuração usada uma única vez para criar o primeiro administrador foi retirada da função hospedada. Não existe rota pública de bootstrap ou autoatribuição de administrador.

## Verificações

- Testes de handler: sessão ausente/inválida, origem externa, tentativa de privilégio por user_metadata, bloqueio da senha inicial, recuperação e auditoria.
- SQL com rollback: usuários comuns e administradores autenticados não podem chamar o diretório privilegiado diretamente, conceder papéis ou alterar o flag inicial; o navegador não lê a auditoria.
- Playwright: apresentação pública, ajuda, fotos, menu móvel, login normal, primeiro acesso administrativo, consulta e geração explícita de recuperação.
- Login real da conta inicial e bloqueio de consultas antes da nova senha conferidos, sem mudar a senha escolhida pelo proprietário.

O advisor do Supabase ainda informa que a detecção de senhas vazadas do Auth está desativada. Esse ajuste depende das configurações de Auth/plano no painel e não é alterado pelas migrações de banco. Referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
