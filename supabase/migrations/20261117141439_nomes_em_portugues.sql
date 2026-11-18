-- Renomeação sem recriar tabelas, apagar registros ou alterar IDs e permissões.

-- Contratos JSON/RPC são preservados para backups e versões já publicadas.

begin;

set local lock_timeout = '5s';

set local statement_timeout = '60s';

alter table public.profiles rename to perfis;

alter table public.perfis rename column display_name to nome_exibicao;

alter table public.perfis rename column created_at to criado_em;

alter table public.perfis rename column updated_at to atualizado_em;

alter table public.weddings rename to casamentos;

alter table public.casamentos rename column owner_id to proprietario_id;

alter table public.casamentos rename column name to nome;

alter table public.casamentos rename column bride_name to nome_noiva;

alter table public.casamentos rename column groom_name to nome_noivo;

alter table public.casamentos rename column wedding_date to data_casamento;

alter table public.casamentos rename column ceremony_time to horario_cerimonia;

alter table public.casamentos rename column reception_time to horario_recepcao;

alter table public.casamentos rename column ceremony_type to tipo_cerimonia;

alter table public.casamentos rename column style to estilo;

alter table public.casamentos rename column theme to tema;

alter table public.casamentos rename column colors to cores;

alter table public.casamentos rename column color_palette to paleta_cores;

alter table public.casamentos rename column ceremony_description to descricao_cerimonia;

alter table public.casamentos rename column initial_budget_cents to orcamento_inicial_centavos;

alter table public.casamentos rename column estimated_guests to estimativa_convidados;

alter table public.casamentos rename column capacity to capacidade;

alter table public.casamentos rename column city to cidade;

alter table public.casamentos rename column state to estado;

alter table public.casamentos rename column ceremony_venue to local_cerimonia;

alter table public.casamentos rename column ceremony_address to endereco_cerimonia;

alter table public.casamentos rename column reception_venue to local_recepcao;

alter table public.casamentos rename column reception_address to endereco_recepcao;

alter table public.casamentos rename column photo_path to caminho_foto;

alter table public.casamentos rename column notes to observacoes;

alter table public.casamentos rename column archived to arquivado;

alter table public.casamentos rename column temporary_seed to dados_temporarios;

alter table public.casamentos rename column created_at to criado_em;

alter table public.casamentos rename column updated_at to atualizado_em;

alter table public.user_preferences rename to preferencias_usuario;

alter table public.preferencias_usuario rename column selected_wedding_id to casamento_selecionado_id;

alter table public.preferencias_usuario rename column dark to tema_escuro;

alter table public.preferencias_usuario rename column collapsed to menu_recolhido;

alter table public.preferencias_usuario rename column updated_at to atualizado_em;

alter table public.preferencias_usuario rename column data to dados;

alter table public.suppliers rename to fornecedores;

alter table public.fornecedores rename column wedding_id to casamento_id;

alter table public.fornecedores rename column name to nome;

alter table public.fornecedores rename column company to empresa;

alter table public.fornecedores rename column document to documento;

alter table public.fornecedores rename column category to categoria;

alter table public.fornecedores rename column service to servico;

alter table public.fornecedores rename column phone to telefone;

alter table public.fornecedores rename column address to endereco;

alter table public.fornecedores rename column responsible to responsavel;

alter table public.fornecedores rename column status to situacao;

alter table public.fornecedores rename column notes to observacoes;

alter table public.fornecedores rename column attachment_path to caminho_anexo;

alter table public.fornecedores rename column rating to nota;

alter table public.fornecedores rename column review to avaliacao;

alter table public.fornecedores rename column created_at to criado_em;

alter table public.fornecedores rename column updated_at to atualizado_em;

alter table public.finance_settings rename to configuracoes_financeiras;

alter table public.configuracoes_financeiras rename column wedding_id to casamento_id;

alter table public.configuracoes_financeiras rename column budget_cents to orcamento_centavos;

alter table public.configuracoes_financeiras rename column reserve_cents to reserva_centavos;

alter table public.configuracoes_financeiras rename column updated_at to atualizado_em;

alter table public.finance_categories rename to categorias_financeiras;

alter table public.categorias_financeiras rename column wedding_id to casamento_id;

alter table public.categorias_financeiras rename column name to nome;

alter table public.categorias_financeiras rename column budget_cents to orcamento_centavos;

alter table public.categorias_financeiras rename column created_at to criado_em;

alter table public.categorias_financeiras rename column updated_at to atualizado_em;

alter table public.expenses rename to despesas;

alter table public.despesas rename column wedding_id to casamento_id;

alter table public.despesas rename column category_id to categoria_id;

alter table public.despesas rename column supplier_id to fornecedor_id;

alter table public.despesas rename column description to descricao;

alter table public.despesas rename column supplier_name to nome_fornecedor;

alter table public.despesas rename column planned_cents to previsto_centavos;

alter table public.despesas rename column contracted_cents to contratado_centavos;

alter table public.despesas rename column status to situacao;

alter table public.despesas rename column contract_date to data_contrato;

alter table public.despesas rename column due_date to data_vencimento;

alter table public.despesas rename column method to forma_pagamento;

alter table public.despesas rename column notes to observacoes;

alter table public.despesas rename column contract_reference to referencia_contrato;

alter table public.despesas rename column attachment_path to caminho_anexo;

alter table public.despesas rename column created_at to criado_em;

alter table public.despesas rename column updated_at to atualizado_em;

alter table public.installments rename to parcelas;

alter table public.parcelas rename column wedding_id to casamento_id;

alter table public.parcelas rename column expense_id to despesa_id;

alter table public.parcelas rename column number to numero;

alter table public.parcelas rename column label to rotulo;

alter table public.parcelas rename column amount_cents to valor_centavos;

alter table public.parcelas rename column due_date to data_vencimento;

alter table public.parcelas rename column created_at to criado_em;

alter table public.parcelas rename column updated_at to atualizado_em;

alter table public.financial_transactions rename to transacoes_financeiras;

alter table public.transacoes_financeiras rename column wedding_id to casamento_id;

alter table public.transacoes_financeiras rename column expense_id to despesa_id;

alter table public.transacoes_financeiras rename column installment_id to parcela_id;

alter table public.transacoes_financeiras rename column kind to tipo;

alter table public.transacoes_financeiras rename column amount_cents to valor_centavos;

alter table public.transacoes_financeiras rename column transaction_date to data_transacao;

alter table public.transacoes_financeiras rename column method to forma_pagamento;

alter table public.transacoes_financeiras rename column notes to observacoes;

alter table public.transacoes_financeiras rename column payment_id to pagamento_id;

alter table public.transacoes_financeiras rename column attachment_path to caminho_anexo;

alter table public.transacoes_financeiras rename column voided_at to anulado_em;

alter table public.transacoes_financeiras rename column void_reason to motivo_anulacao;

alter table public.transacoes_financeiras rename column created_at to criado_em;

alter table public.transacoes_financeiras rename column updated_at to atualizado_em;

alter table public.finance_audit rename to auditoria_financeira;

alter table public.auditoria_financeira rename column wedding_id to casamento_id;

alter table public.auditoria_financeira rename column occurred_at to ocorrido_em;

alter table public.auditoria_financeira rename column action to acao;

alter table public.auditoria_financeira rename column entity_id to entidade_id;

alter table public.auditoria_financeira rename column detail to detalhe;

alter table public.families rename to familias;

alter table public.familias rename column wedding_id to casamento_id;

alter table public.familias rename column name to nome;

alter table public.familias rename column notes to observacoes;

alter table public.familias rename column created_at to criado_em;

alter table public.familias rename column updated_at to atualizado_em;

alter table public.guests rename to convidados;

alter table public.convidados rename column wedding_id to casamento_id;

alter table public.convidados rename column name to nome;

alter table public.convidados rename column family_id to familia_id;

alter table public.convidados rename column companion_of to acompanhante_de;

alter table public.convidados rename column phone to telefone;

alter table public.convidados rename column relationship to parentesco;

alter table public.convidados rename column side to lado;

alter table public.convidados rename column child to crianca;

alter table public.convidados rename column age to idade;

alter table public.convidados rename column invitation_sent to convite_enviado;

alter table public.convidados rename column sent_date to data_envio;

alter table public.convidados rename column status to situacao;

alter table public.convidados rename column notes to observacoes;

alter table public.convidados rename column legacy_details to detalhes_legados;

alter table public.convidados rename column created_at to criado_em;

alter table public.convidados rename column updated_at to atualizado_em;

alter table public.special_participations rename to participacoes_especiais;

alter table public.participacoes_especiais rename column wedding_id to casamento_id;

alter table public.participacoes_especiais rename column guest_id to convidado_id;

alter table public.participacoes_especiais rename column partner_id to parceiro_id;

alter table public.participacoes_especiais rename column participation to participacao;

alter table public.participacoes_especiais rename column notes to observacoes;

alter table public.participacoes_especiais rename column legacy_details to detalhes_legados;

alter table public.participacoes_especiais rename column created_at to criado_em;

alter table public.participacoes_especiais rename column updated_at to atualizado_em;

alter table public.invitation_designs rename to modelos_convites;

alter table public.modelos_convites rename column wedding_id to casamento_id;

alter table public.modelos_convites rename column title to titulo;

alter table public.modelos_convites rename column design to modelo;

alter table public.modelos_convites rename column created_at to criado_em;

alter table public.modelos_convites rename column updated_at to atualizado_em;

alter table public.invitations rename to convites;

alter table public.convites rename column wedding_id to casamento_id;

alter table public.convites rename column design_id to modelo_id;

alter table public.convites rename column design_snapshot to copia_modelo;

alter table public.convites rename column token_hash to hash_token;

alter table public.convites rename column active to ativo;

alter table public.convites rename column recipient_label to rotulo_destinatario;

alter table public.convites rename column unit_key to chave_unidade;

alter table public.convites rename column sent_at to enviado_em;

alter table public.convites rename column created_at to criado_em;

alter table public.convites rename column updated_at to atualizado_em;

alter table public.invitation_guests rename to convidados_convite;

alter table public.convidados_convite rename column wedding_id to casamento_id;

alter table public.convidados_convite rename column invitation_id to convite_id;

alter table public.convidados_convite rename column guest_id to convidado_id;

alter table public.convidados_convite rename column name_snapshot to copia_nome;

alter table public.rsvp_responses rename to respostas_presenca;

alter table public.respostas_presenca rename column wedding_id to casamento_id;

alter table public.respostas_presenca rename column invitation_id to convite_id;

alter table public.respostas_presenca rename column guest_id to convidado_id;

alter table public.respostas_presenca rename column attending to comparecera;

alter table public.respostas_presenca rename column notes to observacoes;

alter table public.respostas_presenca rename column responded_at to respondido_em;

alter table public.invitation_messages rename to mensagens_convites;

alter table public.mensagens_convites rename column wedding_id to casamento_id;

alter table public.mensagens_convites rename column action to acao;

alter table public.mensagens_convites rename column message to mensagem;

alter table public.mensagens_convites rename column updated_at to atualizado_em;

alter table public.whatsapp_queues rename to filas_whatsapp;

alter table public.filas_whatsapp rename column wedding_id to casamento_id;

alter table public.filas_whatsapp rename column queue to fila;

alter table public.filas_whatsapp rename column updated_at to atualizado_em;

alter table public.gift_lists rename to listas_presentes;

alter table public.listas_presentes rename column wedding_id to casamento_id;

alter table public.listas_presentes rename column title to titulo;

alter table public.listas_presentes rename column message to mensagem;

alter table public.listas_presentes rename column updated_at to atualizado_em;

alter table public.gift_items rename to itens_presentes;

alter table public.itens_presentes rename column wedding_id to casamento_id;

alter table public.itens_presentes rename column name to nome;

alter table public.itens_presentes rename column description to descricao;

alter table public.itens_presentes rename column price_cents to preco_centavos;

alter table public.itens_presentes rename column product_url to url_produto;

alter table public.itens_presentes rename column photo_path to caminho_foto;

alter table public.itens_presentes rename column quantity to quantidade;

alter table public.itens_presentes rename column received_quantity to quantidade_recebida;

alter table public.itens_presentes rename column created_at to criado_em;

alter table public.itens_presentes rename column updated_at to atualizado_em;

alter table public.external_gift_lists rename to listas_presentes_externas;

alter table public.listas_presentes_externas rename column wedding_id to casamento_id;

alter table public.listas_presentes_externas rename column name to nome;

alter table public.listas_presentes_externas rename column updated_at to atualizado_em;

alter table public.legacy_snapshots rename to registros_legados;

alter table public.registros_legados rename column wedding_id to casamento_id;

alter table public.registros_legados rename column module to modulo;

alter table public.registros_legados rename column payload to conteudo;

alter table public.registros_legados rename column imported_at to importado_em;

alter table public.wedding_workspaces rename to espacos_casamento;

alter table public.espacos_casamento rename column wedding_id to casamento_id;

alter table public.espacos_casamento rename column owner_id to proprietario_id;

alter table public.espacos_casamento rename column wedding to casamento;

alter table public.espacos_casamento rename column finance to financeiro;

alter table public.espacos_casamento rename column people to pessoas;

alter table public.espacos_casamento rename column suppliers to fornecedores;

alter table public.espacos_casamento rename column invitations to convites;

alter table public.espacos_casamento rename column gifts to presentes;

alter table public.espacos_casamento rename column revision to revisao;

alter table public.espacos_casamento rename column import_hash to hash_importacao;

alter table public.espacos_casamento rename column created_at to criado_em;

alter table public.espacos_casamento rename column updated_at to atualizado_em;

alter table public.app_administrators rename to administradores_aplicativo;

alter table public.administradores_aplicativo rename column user_id to usuario_id;

alter table public.administradores_aplicativo rename column must_change_password to deve_alterar_senha;

alter table public.administradores_aplicativo rename column created_at to criado_em;

alter table public.administration_audit rename to auditoria_administracao;

alter table public.auditoria_administracao rename column administrator_id to administrador_id;

alter table public.auditoria_administracao rename column target_user_id to usuario_alvo_id;

alter table public.auditoria_administracao rename column action to acao;

alter table public.auditoria_administracao rename column created_at to criado_em;

create or replace function app_private.documento_espaco(p_espaco public.espacos_casamento)
returns jsonb language sql stable security invoker set search_path='' as $documento$
select jsonb_build_object('wedding_id',p_espaco.casamento_id,'owner_id',p_espaco.proprietario_id,'wedding',p_espaco.casamento,'finance',p_espaco.financeiro,'people',p_espaco.pessoas,'suppliers',p_espaco.fornecedores,'invitations',p_espaco.convites,'gifts',p_espaco.presentes,'revision',p_espaco.revisao,'import_hash',p_espaco.hash_importacao,'created_at',p_espaco.criado_em,'updated_at',p_espaco.atualizado_em);
$documento$;
revoke all on function app_private.documento_espaco(public.espacos_casamento) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION app_private.administration_accounts(p_query text, p_page integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with matched as (
    select u.id, u.email, u.created_at, u.email_confirmed_at, u.last_sign_in_at,
      exists(select 1 from public.administradores_aplicativo a where a.usuario_id=u.id) as administrator,
      (select count(*) from public.espacos_casamento w where w.proprietario_id=u.id) as weddings
    from auth.users u
    where position(lower(left(coalesce(p_query,''),200)) in lower(coalesce(u.email,'')))>0
  ), page as (
    select * from matched order by created_at desc, id
    limit 25 offset greatest(0,least(coalesce(p_page,1),100000)-1)*25
  ) select jsonb_build_object('total',(select count(*) from matched),'users',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb));
$function$
;

CREATE OR REPLACE FUNCTION app_private.can_read_invitation_image(p_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(select 1 from public.convites i join public.casamentos w on w.id=i.casamento_id
    where i.ativo and not w.arquivado and i.copia_modelo->'photo'->'__oc_file'->>'path'=p_name
    and i.hash_token=encode(sha256(convert_to(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-invitation-token',''),'UTF8')),'hex'))
$function$
;

CREATE OR REPLACE FUNCTION app_private.check_balances(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists(select 1 from public.despesas e where e.casamento_id=p_id and e.situacao<>'planned'
    and e.contratado_centavos<>(select coalesce(sum(i.valor_centavos),0) from public.parcelas i where i.casamento_id=p_id and i.despesa_id=e.id)) then
    raise exception 'A soma das parcelas deve ser igual ao valor contratado.' using errcode='22023';
  end if;
  if exists(select 1 from public.parcelas i left join lateral (
    select coalesce(sum(case when t.tipo in ('interest','fine') then t.valor_centavos when t.tipo='discount' then -t.valor_centavos else 0 end),0) adjustment,
    coalesce(sum(case when t.tipo='payment' then t.valor_centavos when t.tipo='refund' then -t.valor_centavos else 0 end),0) paid
    from public.transacoes_financeiras t where t.casamento_id=p_id and t.parcela_id=i.id and t.anulado_em is null
    ) b on true where i.casamento_id=p_id and (b.paid<0 or i.valor_centavos+b.adjustment<0 or b.paid>i.valor_centavos+b.adjustment)) then
    raise exception 'A operação ultrapassa o saldo disponível da parcela.' using errcode='22023';
  end if;
  if exists(select 1 from public.transacoes_financeiras t where t.casamento_id=p_id and t.tipo='refund' and t.anulado_em is null
    and not exists(select 1 from public.transacoes_financeiras p where p.casamento_id=p_id and p.id=t.pagamento_id and p.tipo='payment' and p.anulado_em is null and p.parcela_id=t.parcela_id)) then
    raise exception 'A devolução precisa estar vinculada a um pagamento válido.' using errcode='22023';
  end if;
  if exists(select 1 from public.transacoes_financeiras p where p.casamento_id=p_id and p.tipo='payment' and p.anulado_em is null
    and p.valor_centavos<(select coalesce(sum(r.valor_centavos),0) from public.transacoes_financeiras r where r.casamento_id=p_id and r.pagamento_id=p.id and r.tipo='refund' and r.anulado_em is null)) then
    raise exception 'A devolução ultrapassa o pagamento.' using errcode='22023';
  end if;
  if exists(select 1 from public.transacoes_financeiras t join public.despesas e on e.casamento_id=p_id and e.id=t.despesa_id
    where t.casamento_id=p_id and (e.situacao='planned' or (t.tipo in ('payment','refund') and t.data_transacao>current_date))) then
    raise exception 'Confira a situação do gasto e a data do pagamento.' using errcode='22023';
  end if;
  if exists(select 1 from public.despesas e where e.casamento_id=p_id and e.situacao='cancelled' and 0<>(select coalesce(sum(case when t.tipo='payment' then t.valor_centavos when t.tipo='refund' then -t.valor_centavos else 0 end),0) from public.transacoes_financeiras t where t.casamento_id=p_id and t.despesa_id=e.id and t.anulado_em is null)) then
    raise exception 'Devolva ou desfaça os pagamentos antes de cancelar o gasto.' using errcode='22023';
  end if;
end; $function$
;

CREATE OR REPLACE FUNCTION app_private.commit_workspace(p_id uuid, p_version bigint, p_data jsonb, p_metadata_only boolean, p_import_hash text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare previous public.espacos_casamento; w jsonb; next_revision bigint; old_data jsonb;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode='42501'; end if;
  -- Serialize new rows as well as updates, including concurrent initial imports.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into previous from public.espacos_casamento where casamento_id=p_id for update;
  if found then
    if previous.proprietario_id<>auth.uid() then raise exception 'Cadastro indisponível.' using errcode='42501'; end if;
    if p_import_hash is not null and previous.hash_importacao=p_import_hash then return previous.revisao; end if;
    if p_import_hash is not null or p_version is distinct from previous.revisao then
      raise exception 'Os dados mudaram. Atualize antes de salvar.' using errcode='40001';
    end if;
    old_data:=app_private.documento_espaco(previous);
    if (previous.casamento->>'archived')::boolean and not p_metadata_only then
      raise exception 'Restaure o casamento antes de alterar.' using errcode='22023';
    end if;
    if p_metadata_only and (p_data-array['wedding','revision','owner_id','wedding_id','created_at','updated_at','import_hash'])
      is distinct from (old_data-array['wedding','revision','owner_id','wedding_id','created_at','updated_at','import_hash']) then
      raise exception 'A alteração deve preservar os demais cadastros.' using errcode='22023';
    end if;
  elsif p_version is not null then
    raise exception 'Cadastro removido. Atualize antes de salvar.' using errcode='40001';
  end if;
  perform app_private.validate_workspace(p_id,p_data,old_data);
  w:=p_data->'wedding'; next_revision:=coalesce(previous.revisao,0)+1;
  insert into public.casamentos(id,proprietario_id,nome,nome_noiva,nome_noivo,data_casamento,horario_cerimonia,horario_recepcao,
    tipo_cerimonia,estilo,tema,cores,paleta_cores,descricao_cerimonia,orcamento_inicial_centavos,estimativa_convidados,capacidade,
    cidade,estado,local_cerimonia,endereco_cerimonia,local_recepcao,endereco_recepcao,caminho_foto,observacoes,arquivado,criado_em)
  values(p_id,auth.uid(),w->>'name',coalesce(w->>'brideName',''),coalesce(w->>'groomName',''),nullif(w->>'date','')::date,
    nullif(w->>'ceremonyTime','')::time,nullif(w->>'receptionTime','')::time,coalesce(w->>'ceremonyType',''),coalesce(w->>'style',''),
    coalesce(w->>'theme',''),coalesce(w->>'colors',''),array(select jsonb_array_elements_text(coalesce(w->'colorPalette','[]'))),
    coalesce(w->>'ceremonyDescription',''),round(coalesce((w->>'initialBudget')::numeric,0)*100)::bigint,
    coalesce((w->>'estimatedGuests')::integer,0),coalesce((w->>'capacity')::integer,0),coalesce(w->>'city',''),coalesce(w->>'state',''),
    coalesce(w->>'ceremonyVenue',''),coalesce(w->>'ceremonyAddress',''),coalesce(w->>'receptionVenue',''),coalesce(w->>'receptionAddress',''),
    w->'photo'->'__oc_file'->>'path',coalesce(w->>'notes',''),coalesce((w->>'archived')::boolean,false),coalesce((w->>'createdAt')::timestamptz,now()))
  on conflict(id) do update set nome=excluded.nome,nome_noiva=excluded.nome_noiva,nome_noivo=excluded.nome_noivo,data_casamento=excluded.data_casamento,
    horario_cerimonia=excluded.horario_cerimonia,horario_recepcao=excluded.horario_recepcao,tipo_cerimonia=excluded.tipo_cerimonia,estilo=excluded.estilo,
    tema=excluded.tema,cores=excluded.cores,paleta_cores=excluded.paleta_cores,descricao_cerimonia=excluded.descricao_cerimonia,
    orcamento_inicial_centavos=excluded.orcamento_inicial_centavos,estimativa_convidados=excluded.estimativa_convidados,capacidade=excluded.capacidade,cidade=excluded.cidade,estado=excluded.estado,
    local_cerimonia=excluded.local_cerimonia,endereco_cerimonia=excluded.endereco_cerimonia,local_recepcao=excluded.local_recepcao,
    endereco_recepcao=excluded.endereco_recepcao,caminho_foto=excluded.caminho_foto,observacoes=excluded.observacoes,arquivado=excluded.arquivado
  where public.casamentos.proprietario_id=auth.uid();
  if not found then raise exception 'Cadastro indisponível.' using errcode='42501'; end if;
  perform app_private.project_workspace(p_id,p_data);
  perform app_private.check_balances(p_id);
  insert into public.espacos_casamento(casamento_id,proprietario_id,casamento,financeiro,pessoas,fornecedores,convites,presentes,revisao,hash_importacao)
  values(p_id,auth.uid(),w,nullif(p_data->'finance','null'),nullif(p_data->'people','null'),nullif(p_data->'suppliers','null'),
    nullif(p_data->'invitations','null'),nullif(p_data->'gifts','null'),next_revision,p_import_hash)
  on conflict(casamento_id) do update set casamento=excluded.casamento,financeiro=excluded.financeiro,pessoas=excluded.pessoas,fornecedores=excluded.fornecedores,
    convites=excluded.convites,presentes=excluded.presentes,revisao=excluded.revisao,atualizado_em=now();
  return next_revision;
end; $function$
;

CREATE OR REPLACE FUNCTION app_private.invitation_respond(p_token text, p_answers jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare invitation public.convites; workspace public.espacos_casamento; dados jsonb; issue jsonb; answer jsonb; updated_guests jsonb; updated_issues jsonb;
begin
  perform app_private.invitation_view(p_token);
  select * into invitation from public.convites where hash_token=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended(invitation.casamento_id::text,0));
  -- Recheck after taking the same lock as owner writes (including deactivation).
  perform app_private.invitation_view(p_token);
  select * into workspace from public.espacos_casamento where casamento_id=invitation.casamento_id for update;
  if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)<>(select count(*) from public.convidados_convite where casamento_id=invitation.casamento_id and convite_id=invitation.id)
    or jsonb_array_length(p_answers)<>(select count(distinct value->>'guestId') from jsonb_array_elements(p_answers)) then
    raise exception 'Responda uma vez por cada pessoa deste convite.' using errcode='22023'; end if;
  for answer in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(answer->'attending') is distinct from 'boolean' or length(coalesce(answer->>'diet',''))>500
      or not exists(select 1 from public.convidados_convite where casamento_id=invitation.casamento_id and convite_id=invitation.id and convidado_id=(answer->>'guestId')::uuid) then
      raise exception 'Resposta inválida para este convite.' using errcode='22023'; end if;
  end loop;
  select jsonb_agg(case when a is null then g else g||jsonb_build_object('status',case when (a->>'attending')::boolean then 'Confirmado' else 'Não comparecerá' end,'diet',btrim(coalesce(a->>'diet',''))) end order by n)
    into updated_guests from jsonb_array_elements(workspace.pessoas->'guests') with ordinality convidados(g,n)
    left join lateral (select value a from jsonb_array_elements(p_answers) where value->>'guestId'=g->>'id') answers on true;
  select jsonb_agg(case when i->>'id'=invitation.id::text then
    case when i->'responses'->-1->'answers'=p_answers then i else jsonb_set(i,'{responses}',coalesce(i->'responses','[]')||jsonb_build_array(jsonb_build_object('at',now(),'answers',p_answers))) end
    else i end order by n) into updated_issues from jsonb_array_elements(workspace.convites->'issues') with ordinality issues(i,n);
  dados:=app_private.documento_espaco(workspace);
  dados:=jsonb_set(dados,'{people,guests}',updated_guests);
  dados:=jsonb_set(dados,'{invitations,issues}',updated_issues);
  perform app_private.project_workspace(invitation.casamento_id,dados);
  update public.espacos_casamento set pessoas=dados->'people',convites=dados->'invitations',revisao=revisao+1,atualizado_em=now() where casamento_id=invitation.casamento_id;
end;$function$
;

CREATE OR REPLACE FUNCTION app_private.invitation_view(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
  if p_token !~ '^[a-f0-9]{64}$' then raise exception 'Convite não encontrado.' using errcode='22023'; end if;
  select jsonb_build_object('issue',jsonb_build_object('id',i.id,'weddingId',i.casamento_id,'design',i.copia_modelo,
    'recipientLabel',i.rotulo_destinatario,'active',true),'members',
    (select jsonb_agg(jsonb_build_object('id',g.id,'name',g.nome,'status',g.situacao,'diet',coalesce(g.detalhes_legados->>'diet','')) order by g.nome)
    from public.convidados_convite ig join public.convidados g on g.casamento_id=i.casamento_id and g.id=ig.convidado_id
    where ig.casamento_id=i.casamento_id and ig.convite_id=i.id)) into result
  from public.convites i join public.casamentos w on w.id=i.casamento_id
  where i.hash_token=encode(sha256(convert_to(p_token,'UTF8')),'hex') and i.ativo and not w.arquivado;
  if result is null or result->'members'='null'::jsonb then raise exception 'Convite não encontrado ou desativado.' using errcode='22023'; end if;
  return result;
end;$function$
;

CREATE OR REPLACE FUNCTION app_private.preference(p_key text, p_value jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode='42501'; end if;
  if p_key not in ('appearance','active-wedding') then raise exception 'Preferência inválida.' using errcode='22023'; end if;
  if p_key='active-wedding' and nullif(p_value->>'weddingId','') is not null and not exists(select 1 from public.casamentos where id=(p_value->>'weddingId')::uuid and proprietario_id=auth.uid()) then
    raise exception 'Casamento indisponível.' using errcode='42501'; end if;
  insert into public.preferencias_usuario(id,dados) values(auth.uid(),case when p_value is null then '{}'::jsonb else jsonb_build_object(p_key,p_value) end)
  on conflict(id) do update set dados=case when p_value is null then public.preferencias_usuario.dados-p_key else jsonb_set(public.preferencias_usuario.dados,array[p_key],p_value) end;
  update public.preferencias_usuario set casamento_selecionado_id=nullif(dados->'active-wedding'->>'weddingId','')::uuid,
    tema_escuro=coalesce((dados->'appearance'->>'dark')::boolean,false),menu_recolhido=coalesce((dados->'appearance'->>'collapsed')::boolean,false) where id=auth.uid();
end;$function$
;

CREATE OR REPLACE FUNCTION app_private.project_workspace(p_id uuid, p_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
set constraints all deferred;
delete from public.respostas_presenca where casamento_id=p_id;
delete from public.convidados_convite where casamento_id=p_id;
delete from public.convites where casamento_id=p_id;
delete from public.modelos_convites where casamento_id=p_id;
delete from public.participacoes_especiais where casamento_id=p_id;
delete from public.convidados where casamento_id=p_id;
delete from public.familias where casamento_id=p_id;
delete from public.transacoes_financeiras where casamento_id=p_id;
delete from public.parcelas where casamento_id=p_id;
delete from public.auditoria_financeira where casamento_id=p_id;
delete from public.despesas where casamento_id=p_id;
delete from public.categorias_financeiras where casamento_id=p_id;
delete from public.fornecedores where casamento_id=p_id;
delete from public.itens_presentes where casamento_id=p_id;
delete from public.listas_presentes_externas where casamento_id=p_id;
delete from public.listas_presentes where casamento_id=p_id;
delete from public.configuracoes_financeiras where casamento_id=p_id;
delete from public.mensagens_convites where casamento_id=p_id;
delete from public.filas_whatsapp where casamento_id=p_id;
delete from public.registros_legados where casamento_id=p_id;
insert into public.fornecedores(casamento_id,id,nome,empresa,documento,categoria,servico,telefone,whatsapp,email,endereco,responsavel,situacao,observacoes,nota,avaliacao,criado_em) select p_id,nullif(j->>'id','')::uuid,coalesce(j->>'name', ''),coalesce(j->>'company', ''),coalesce(j->>'document', ''),coalesce(j->>'category', 'Outros'),coalesce(j->>'service', ''),coalesce(j->>'phone', ''),coalesce(j->>'whatsapp', ''),coalesce(j->>'email', ''),coalesce(j->>'address', ''),coalesce(j->>'responsible', ''),coalesce(j->>'status', 'prospecting'),coalesce(j->>'notes', ''),coalesce(nullif(j->>'rating','')::bigint,0),coalesce(j->>'review', ''),coalesce(nullif(j->>'createdAt','')::timestamptz,now()) from jsonb_array_elements(coalesce(nullif(p_data->'suppliers'->'suppliers','null'::jsonb),'[]'::jsonb)) j;
insert into public.categorias_financeiras(casamento_id,id,nome,orcamento_centavos) select p_id,nullif(j->>'id','')::uuid,coalesce(j->>'name', ''),coalesce(nullif(j->>'budgetCents','')::bigint,0) from jsonb_array_elements(coalesce(nullif(p_data->'finance'->'categories','null'::jsonb),'[]'::jsonb)) j;
insert into public.despesas(casamento_id,id,categoria_id,fornecedor_id,descricao,nome_fornecedor,previsto_centavos,contratado_centavos,situacao,data_contrato,data_vencimento,forma_pagamento,observacoes,referencia_contrato,criado_em) select p_id,nullif(j->>'id','')::uuid,nullif(j->>'categoryId','')::uuid,nullif(j->>'supplierId','')::uuid,coalesce(j->>'description', ''),coalesce(j->>'supplier', ''),coalesce(nullif(j->>'plannedCents','')::bigint,0),coalesce(nullif(j->>'contractedCents','')::bigint,0),coalesce(j->>'status', 'planned'),nullif(j->>'contractDate','')::date,nullif(j->>'dueDate','')::date,coalesce(j->>'method', ''),coalesce(j->>'notes', ''),coalesce(j->>'contractReference', ''),coalesce(nullif(j->>'createdAt','')::timestamptz,now()) from jsonb_array_elements(coalesce(nullif(p_data->'finance'->'expenses','null'::jsonb),'[]'::jsonb)) j;
insert into public.parcelas(casamento_id,id,despesa_id,numero,rotulo,valor_centavos,data_vencimento) select p_id,nullif(j->>'id','')::uuid,nullif(j->>'expenseId','')::uuid,coalesce(nullif(j->>'number','')::bigint,0),coalesce(j->>'label', ''),coalesce(nullif(j->>'amountCents','')::bigint,0),nullif(j->>'dueDate','')::date from jsonb_array_elements(coalesce(nullif(p_data->'finance'->'installments','null'::jsonb),'[]'::jsonb)) j;
insert into public.transacoes_financeiras(casamento_id,id,despesa_id,parcela_id,tipo,valor_centavos,data_transacao,forma_pagamento,observacoes,pagamento_id,anulado_em,motivo_anulacao,criado_em) select p_id,nullif(j->>'id','')::uuid,nullif(j->>'expenseId','')::uuid,nullif(j->>'installmentId','')::uuid,coalesce(j->>'kind', ''),coalesce(nullif(j->>'amountCents','')::bigint,0),nullif(j->>'date','')::date,coalesce(j->>'method', ''),coalesce(j->>'notes', ''),nullif(j->>'paymentId','')::uuid,nullif(j->>'voidedAt','')::timestamptz,nullif(j->>'voidReason',''),coalesce(nullif(j->>'createdAt','')::timestamptz,now()) from jsonb_array_elements(coalesce(nullif(p_data->'finance'->'transactions','null'::jsonb),'[]'::jsonb)) j;
insert into public.auditoria_financeira(casamento_id,id,ocorrido_em,acao,entidade_id,detalhe) select p_id,nullif(j->>'id','')::uuid,(j->>'at')::timestamptz,coalesce(j->>'action', ''),coalesce(j->>'entityId', ''),coalesce(j->>'detail', '') from jsonb_array_elements(coalesce(nullif(p_data->'finance'->'audit','null'::jsonb),'[]'::jsonb)) j;
insert into public.familias(casamento_id,id,nome,observacoes) select p_id,nullif(j->>'id','')::uuid,coalesce(j->>'name', ''),coalesce(j->>'notes', '') from jsonb_array_elements(coalesce(nullif(p_data->'people'->'families','null'::jsonb),'[]'::jsonb)) j;
insert into public.convidados(casamento_id,id,nome,familia_id,acompanhante_de,telefone,whatsapp,email,parentesco,lado,crianca,idade,convite_enviado,data_envio,situacao,observacoes,detalhes_legados) select p_id,nullif(j->>'id','')::uuid,coalesce(j->>'name', ''),nullif(j->>'familyId','')::uuid,nullif(j->>'companionOf','')::uuid,coalesce(j->>'phone', ''),coalesce(j->>'whatsapp', ''),coalesce(j->>'email', ''),coalesce(j->>'relationship', ''),coalesce(j->>'side', 'Ambos'),coalesce((j->>'child')::boolean,false),nullif(j->>'age','')::integer,coalesce((j->>'invitationSent')::boolean,false),nullif(j->>'sentDate','')::date,coalesce(j->>'status', 'Ainda nÃ£o convidado'),coalesce(j->>'notes', ''),j - array['id','weddingId','name','familyId','companionOf','phone','whatsapp','email','relationship','side','child','age','invitationSent','sentDate','status','notes'] from jsonb_array_elements(coalesce(nullif(p_data->'people'->'guests','null'::jsonb),'[]'::jsonb)) j;
insert into public.participacoes_especiais(casamento_id,id,convidado_id,parceiro_id,participacao,observacoes,detalhes_legados) select p_id,nullif(j->>'id','')::uuid,nullif(j->>'guestId','')::uuid,nullif(j->>'partnerId','')::uuid,coalesce(j->>'participation', ''),coalesce(j->>'notes', ''),j - array['id','weddingId','guestId','partnerId','participation','notes'] from jsonb_array_elements(coalesce(nullif(p_data->'people'->'godparents','null'::jsonb),'[]'::jsonb)) j;
insert into public.modelos_convites(casamento_id,id,titulo,modelo) select p_id,nullif(j->>'id','')::uuid,coalesce(j->>'title', ''),j from jsonb_array_elements(coalesce(nullif(p_data->'invitations'->'designs','null'::jsonb),'[]'::jsonb)) j;
insert into public.convites(casamento_id,id,modelo_id,copia_modelo,hash_token,ativo,rotulo_destinatario,chave_unidade,enviado_em,criado_em) select p_id,nullif(j->>'id','')::uuid,case when exists(select 1 from public.modelos_convites d where d.casamento_id=p_id and d.id=nullif(j->>'designId','')::uuid) then nullif(j->>'designId','')::uuid else null end,j->'design',encode(sha256(convert_to(j->>'token','UTF8')),'hex'),coalesce((j->>'active')::boolean,true),coalesce(j->>'recipientLabel', ''),coalesce(j->>'unitKey', ''),nullif(j->>'sentAt','')::timestamptz,coalesce(nullif(j->>'createdAt','')::timestamptz,now()) from jsonb_array_elements(coalesce(nullif(p_data->'invitations'->'issues','null'::jsonb),'[]'::jsonb)) j;
insert into public.itens_presentes(casamento_id,id,nome,descricao,preco_centavos,url_produto,caminho_foto,quantidade,quantidade_recebida) select p_id,nullif(j->>'id','')::uuid,coalesce(j->>'name', ''),coalesce(j->>'description', ''),nullif(j->>'priceCents','')::bigint,coalesce(j->>'url', ''),j->'photo'->'__oc_file'->>'path',coalesce(nullif(j->>'quantity','')::bigint,1),coalesce(nullif(j->>'receivedQuantity','')::integer,case when (j->>'received')::boolean then coalesce((j->>'quantity')::integer,1) else 0 end) from jsonb_array_elements(coalesce(nullif(p_data->'gifts'->'items','null'::jsonb),'[]'::jsonb)) j;
insert into public.listas_presentes_externas(casamento_id,id,nome,url) select p_id,nullif(j->>'id','')::uuid,coalesce(j->>'name', ''),coalesce(j->>'url', '') from jsonb_array_elements(coalesce(nullif(p_data->'gifts'->'sites','null'::jsonb),'[]'::jsonb)) j;
if p_data->'finance' <> 'null'::jsonb and p_data ? 'finance' then
insert into public.configuracoes_financeiras(casamento_id,orcamento_centavos,reserva_centavos) values(p_id,nullif(p_data->'finance'->>'budgetCents','')::bigint,coalesce((p_data->'finance'->>'reserveCents')::bigint,0));end if;
if p_data->'gifts' <> 'null'::jsonb and p_data ? 'gifts' then
insert into public.listas_presentes(casamento_id,titulo,mensagem) values(p_id,coalesce(p_data->'gifts'->>'title','Lista de presentes'),coalesce(p_data->'gifts'->>'message',''));end if;
insert into public.registros_legados(casamento_id,modulo,conteudo) select p_id,'supplier_history',p_data->'suppliers' where p_data->'suppliers' <> 'null'::jsonb;
insert into public.mensagens_convites(casamento_id,acao,mensagem) select p_id,key,value from jsonb_each_text(coalesce(nullif(p_data->'invitations'->'messages','null'::jsonb),'{}'::jsonb));
insert into public.filas_whatsapp(casamento_id,fila) select p_id,p_data->'invitations'->'whatsappQueue' where jsonb_typeof(p_data->'invitations'->'whatsappQueue')='object';
insert into public.convidados_convite(casamento_id,convite_id,convidado_id,copia_nome)
select p_id,(issue->>'id')::uuid,(recipient->>'guestId')::uuid,recipient->>'name'
from jsonb_array_elements(coalesce(nullif(p_data->'invitations'->'issues','null'::jsonb),'[]'::jsonb)) issue
cross join lateral jsonb_array_elements(issue->'recipients') recipient
where exists(select 1 from public.convidados g where g.casamento_id=p_id and g.id=(recipient->>'guestId')::uuid);
insert into public.respostas_presenca(casamento_id,convite_id,convidado_id,comparecera,observacoes,respondido_em)
select p_id,(issue->>'id')::uuid,(answer->>'guestId')::uuid,(answer->>'attending')::boolean,coalesce(answer->>'diet',''),(response->>'at')::timestamptz
from jsonb_array_elements(coalesce(nullif(p_data->'invitations'->'issues','null'::jsonb),'[]'::jsonb)) issue
cross join lateral jsonb_array_elements(issue->'responses') response
cross join lateral jsonb_array_elements(response->'answers') answer
where exists(select 1 from public.convidados_convite g where g.casamento_id=p_id and g.convite_id=(issue->>'id')::uuid and g.convidado_id=(answer->>'guestId')::uuid);
set constraints all immediate;
end;$function$
;

CREATE OR REPLACE FUNCTION app_private.remove_workspace(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  if auth.uid() is null or not exists(select 1 from public.casamentos where id=p_id and proprietario_id=auth.uid()) then
    raise exception 'Casamento indisponível.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  delete from public.casamentos where id=p_id and proprietario_id=auth.uid();
  update public.preferencias_usuario set dados=dados-'active-wedding' where id=auth.uid() and dados->'active-wedding'->>'weddingId'=p_id::text;
end;$function$
;

CREATE OR REPLACE FUNCTION app_private.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin new.atualizado_em := now(); return new; end;
$function$
;

CREATE OR REPLACE FUNCTION app_private.validate_workspace(p_id uuid, p_data jsonb, p_old jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare domain text; collection text; item jsonb; previous jsonb; replacement jsonb;
begin
  if jsonb_typeof(p_data) is distinct from 'object' or (p_data->'wedding'->>'id')::uuid is distinct from p_id
    or coalesce((p_data->'wedding'->>'demo')::boolean,false)
    or coalesce((p_data->'wedding'->>'temporarySeed')::boolean,false) then
    raise exception 'Cadastro de casamento inválido.' using errcode='22023';
  end if;
  foreach domain in array array['finance','people','suppliers','invitations','gifts'] loop
    item:=p_data->domain;
    if item is null or item='null'::jsonb then continue; end if;
    if jsonb_typeof(item)<>'object' or (item->>'id')::uuid is distinct from p_id
      or (item->>'weddingId')::uuid is distinct from p_id then
      raise exception 'Os dados pertencem a outro casamento.' using errcode='22023';
    end if;
    for collection in select key from jsonb_each(item) where jsonb_typeof(value)='array' loop
      for replacement in select value from jsonb_array_elements(item->collection) loop
        if jsonb_typeof(replacement)='object' and replacement ? 'weddingId'
          and (replacement->>'weddingId')::uuid is distinct from p_id then
          raise exception 'Registro de outro casamento.' using errcode='22023';
        end if;
      end loop;
    end loop;
  end loop;
  -- A previously recorded financial operation may only be voided, with a reason.
  for previous in select value from jsonb_array_elements(coalesce(nullif(p_old->'finance'->'transactions','null'::jsonb),'[]')) loop
    select value into replacement from jsonb_array_elements(coalesce(nullif(p_data->'finance'->'transactions','null'::jsonb),'[]')) where value->>'id'=previous->>'id';
    if replacement is null or replacement-array['voidedAt','voidReason'] is distinct from previous-array['voidedAt','voidReason']
      or (coalesce(previous->>'voidedAt','')<>'' and replacement is distinct from previous) then
      raise exception 'Operações registradas devem ser preservadas. Use Desfazer operação.' using errcode='22023';
    end if;
  end loop;
  for previous in select value from jsonb_array_elements(coalesce(nullif(p_old->'finance'->'audit','null'::jsonb),'[]')) loop
    if not coalesce(p_data->'finance'->'audit','[]') @> jsonb_build_array(previous) then
      raise exception 'O histórico financeiro deve ser preservado.' using errcode='22023';
    end if;
  end loop;
end; $function$
;

create view public.user_preferences with (security_invoker=true) as select id as id,casamento_selecionado_id as selected_wedding_id,tema_escuro as dark,menu_recolhido as collapsed,atualizado_em as updated_at,dados as data from public.preferencias_usuario;

revoke all on public.user_preferences from public,anon,authenticated,service_role;

grant select on public.user_preferences to authenticated;

comment on view public.user_preferences is 'Alias temporário para versões publicadas anteriores à tradução. Dados e permissões permanecem na tabela em português.';

create view public.wedding_workspaces with (security_invoker=true) as select casamento_id as wedding_id,proprietario_id as owner_id,casamento as wedding,financeiro as finance,pessoas as people,fornecedores as suppliers,convites as invitations,presentes as gifts,revisao as revision,hash_importacao as import_hash,criado_em as created_at,atualizado_em as updated_at from public.espacos_casamento;

revoke all on public.wedding_workspaces from public,anon,authenticated,service_role;

grant select on public.wedding_workspaces to authenticated;

comment on view public.wedding_workspaces is 'Alias temporário para versões publicadas anteriores à tradução. Dados e permissões permanecem na tabela em português.';

create view public.app_administrators with (security_invoker=true) as select usuario_id as user_id,deve_alterar_senha as must_change_password,criado_em as created_at from public.administradores_aplicativo;

revoke all on public.app_administrators from public,anon,authenticated,service_role;

grant select on public.app_administrators to authenticated;

grant select,insert,update,delete on public.app_administrators to service_role;

comment on view public.app_administrators is 'Alias temporário para versões publicadas anteriores à tradução. Dados e permissões permanecem na tabela em português.';

create view public.administration_audit with (security_invoker=true) as select id as id,administrador_id as administrator_id,usuario_alvo_id as target_user_id,acao as action,criado_em as created_at from public.auditoria_administracao;

revoke all on public.administration_audit from public,anon,authenticated,service_role;

grant select,insert on public.administration_audit to service_role;

comment on view public.administration_audit is 'Alias temporário para versões publicadas anteriores à tradução. Dados e permissões permanecem na tabela em português.';

notify pgrst, 'reload schema';

commit;
