# E-mails da conta

Modelos em português para confirmação de cadastro, recuperação e aviso de senha alterada. Os links são preenchidos pelo Supabase; não substituir `{{ .ConfirmationURL }}` por um endereço fixo.

## Situação da publicação

Os arquivos estão prontos. A conexão de banco disponível nesta sessão não permite atualizar as configurações do Auth. Portanto, estes textos **ainda não foram aplicados no projeto hospedado**.

Para aplicar com acesso administrativo autorizado, execute `node scripts/configure-auth-emails.mjs --apply`, com `SUPABASE_ACCESS_TOKEN` disponível apenas no ambiente. O script verifica o resultado e não imprime o token. Sem `--apply`, apenas mostra os campos que serão alterados.

Também podem ser aplicados no painel Authentication → Emails: copie o assunto de `auth-config.json` e o HTML correspondente. Habilite a notificação de senha alterada.

O `supabase/config.toml` configura somente o ambiente de desenvolvimento do Supabase. Ele não publica modelos no serviço hospedado. O envio para clientes em produção também depende do SMTP e remetente configurados no painel; não basta conectar o banco.

## Dados e acesso

A aplicação de produção usa somente Supabase para cadastros, arquivos e preferências. Não há login Google/Gmail. Um endereço Gmail pode ser usado como e-mail comum, com senha e confirmação de propriedade da caixa postal.

O código IndexedDB fica isolado em `src/testing`, usado exclusivamente pela configuração de testes. A única leitura de dados antigos em produção é a importação explícita em `/importar-dados`, com backup antes de importar. Os dados antigos não são apagados automaticamente, para evitar perda antes da migração. A sessão de autenticação permanece no navegador para manter o usuário conectado; ela não é armazenamento de cadastros.
