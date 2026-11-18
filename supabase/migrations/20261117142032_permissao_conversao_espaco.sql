-- Conversor puro: não consulta tabelas nem concede acesso a dados.
-- Permite conferir o contrato JSON de uma linha que o próprio usuário já pode ler.
grant execute on function app_private.documento_espaco(public.espacos_casamento) to authenticated;
