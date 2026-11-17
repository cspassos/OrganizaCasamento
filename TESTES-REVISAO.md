# Conferência da interface simplificada

Este roteiro substitui as instruções antigas que mencionavam campos removidos e gestão de equipe.

Ao adicionar um gasto, preencha **Fornecedor ou quem vai receber**: escolha um contato existente ou digite um novo nome. O contato será salvo junto com o gasto. Para anexar o contrato ou comprovante, expanda **Contrato, comprovante e observações (opcional)**. Não é necessário criar um contrato separado. Em **Fornecedores → Ações → Ver dados**, confira os gastos e baixe os anexos desse contato.

## 1. Gasto cancelado

1. Entre em **Gastos e pagamentos → Adicionar gasto**.
2. Cadastre um gasto de R$ 1.000,00 como já combinado e salve.
3. No detalhe, clique em **Cancelar despesa** e confirme.
4. Confira a mensagem **Gasto cancelado — não há valor a pagar** e o valor em aberto de R$ 0,00.
5. Volte à lista. O registro deve continuar identificado como cancelado, sem próximo vencimento e sem dívida em aberto.
6. Confira o relatório financeiro: o histórico permanece e esse gasto não soma aos compromissos ativos.

## 2. Próxima parcela

1. Cadastre outro gasto: valor R$ 12.000,00, entrada R$ 2.000,00 e cinco parcelas restantes.
2. Escolha datas diferentes para a entrada e a primeira parcela restante e salve.
3. No detalhe, registre somente o pagamento da entrada de R$ 2.000,00.
4. Volte à lista: **Próximo vencimento** deve mostrar a primeira parcela que ainda falta pagar.
5. Pague a próxima parcela e confira que a data avança novamente. Após quitar tudo, deve aparecer um traço no vencimento.

## 3. Nomes repetidos

1. Em **Convidados**, clique em **Adicionar convidados**.
2. Cole o mesmo nome duas vezes, um por linha, e clique em **Adicionar à lista**.
3. Confira o aviso: nenhum cadastro deve ser criado antes da sua decisão.
4. Para corrigir, altere a lista e tente novamente.
5. Se forem pessoas diferentes, marque **São pessoas diferentes. Quero adicionar todos os nomes.** e confirme.
6. Repita usando um nome já cadastrado. A conferência também deve reconhecer diferenças de maiúsculas, acentos e espaços.

## 4. Listas para imprimir

1. Em **Convidados**, abra **Filtros e outras opções → Baixar PDF para imprimir**.
2. Abra o arquivo: confira nome do casamento, quantidade, nomes, famílias, confirmações e contatos.
3. Faça uma busca e baixe novamente. O PDF deve conter todos os resultados do filtro, inclusive os que estão em outras páginas da tabela.
4. Abra a aba **Participações especiais** e use **Filtros e outras opções → Baixar PDF para imprimir** para imprimir as pessoas e suas participações.
5. Use a impressão do leitor de PDF, se quiser uma cópia em papel.

## 5. Conferência geral

- Em **Fornecedores → Contratos**, ao assinar, configure entrada e parcelas no próprio formulário. Salvar novamente não deve duplicar o gasto.
- Em **Contas a pagar**, confira contas vencidas em vermelho e valores restantes após pagamentos parciais.
- Use busca, ordenação, paginação e ações nas tabelas; teste também com mais de 100 registros.
- Troque o casamento selecionado e confira o isolamento dos dados.
- Recarregue a página para verificar persistência.
- No celular, confira menu, formulários, mensagens, botões e rolagem lateral das tabelas.

Automação: `npm test -- --watch=false`, `npx playwright test` e `npm run build`.

## Excluir um casamento

Em **Meus casamentos → Ações → Excluir definitivamente**, a confirmação explica que gastos, pagamentos, parcelas, convidados, convites, fornecedores, contratos e anexos desse casamento serão apagados deste navegador. A ação não pode ser desfeita. Outros casamentos são preservados. **Arquivar** continua disponível para guardar os dados e poder restaurar depois. A exclusão funciona também na lista de arquivados e na visualização de cartões.

## Padrinhos, madrinhas e pares

1. Em Convidados, abra Ações → Definir participação na pessoa desejada.
2. Escolha Padrinho ou Madrinha e salve. Ela permanece sendo o mesmo convidado.
3. Ao definir a participação da outra pessoa, use Par na cerimônia (opcional) para buscar e escolher quem já foi adicionado. O vínculo aparece para os dois.
4. Em Filtros e outras opções → Participação, escolha Padrinho ou Madrinha. O filtro está disponível em Convidados e Participações especiais.
5. Recarregue para conferir que o par continua vinculado e que o número de convidados não aumentou.

## Lista de presentes

1. Selecione um casamento e abra **Lista de presentes**.
2. Clique em **Adicionar presente**. Informe nome, descrição, preço opcional, foto e link de uma loja. Salve e recarregue: os dados devem permanecer.
3. Use **Vincular lista de loja** para informar o nome e endereço de uma lista externa. **Abrir lista na loja** deve abrir esse endereço.
4. Clique em **Compartilhar lista**. Se o aparelho não oferecer compartilhamento de arquivos, será baixado um PDF. Abra-o e confira fotos, descrições, preços e links clicáveis. A confirmação do envio ocorre no aplicativo escolhido.
5. Em **Compartilhamento e outras opções**, personalize título e mensagem. Baixe novamente e confira o texto.
6. No cartão de um presente, abra **Gerenciar presente → Já recebemos este presente**. Ele deve sumir da lista disponível e do próximo PDF. Ative **Mostrar presentes recebidos** para consultá-lo ou devolvê-lo à lista.
7. Pesquise um nome. Em descrições longas, use **Ver descrição do presente**. Com mais de 12 resultados, confira a paginação.
8. Troque de casamento: a lista deve ficar separada. Os totais financeiros não devem mudar ao cadastrar presentes.

Compartilhamento local por PDF/mensagem; não há reserva pública nem atualização automática de arquivos enviados.

## Quantidades dos presentes

1. Em Lista de presentes → Adicionar presente, informe Quantidade que queremos (ex.: 6) e Quantidade já recebida (ex.: 0).
2. Ao ganhar uma unidade, clique em Registrar 1 recebido no cartão. Confira Recebemos 1 de 6 e Faltam 5.
3. Use as opções Falta receber, Já recebidos e Todos. Presentes parcialmente recebidos aparecem nas duas primeiras; os completos ficam em Já recebidos e Todos.
4. Para corrigir um registro ou mudar a meta, abra Gerenciar presente → Editar e altere as duas quantidades. É permitido receber mais unidades que a meta; o total recebido é preservado e a falta fica em zero.
5. Recarregue e confira a persistência. O PDF e a mensagem com links mostram apenas os presentes que ainda faltam, com a quantidade restante. Baixe novamente após atualizar os recebimentos.
6. Presentes antigos sem quantidade são considerados 1 unidade; os já marcados como recebidos continuam recebidos.

## Login e transferência dos cadastros antigos — Supabase

Este roteiro usa o sistema normal em `http://localhost:4200`. Os roteiros históricos anteriores pressupõem que você já entrou e selecionou o casamento. A massa temporária local agora fica restrita à configuração de testes.

1. No painel Supabase → Authentication → URL Configuration, confira Site URL `http://localhost:4200` e Redirect URLs `http://localhost:4200/**` e `http://127.0.0.1:4200/**`. Salve. Sem isso, e-mails podem levar a outro endereço.
2. Reinicie o servidor com `npm start`. Abra o sistema e clique em **Ainda não tenho conta**.
3. Informe seu e-mail e senha, repita a senha e clique em **Criar minha conta**. Confirme pelo e-mail. O serviço de e-mails precisa estar configurado para permitir o destinatário; o SMTP padrão do Supabase tem restrições.
4. Volte e entre. Confira a tela **Trazer meus cadastros anteriores**. Abra no mesmo navegador e endereço dos cadastros antigos (localhost e 127.0.0.1 têm bases distintas).
5. Escolha os casamentos que pertencem à sua conta. Clique em **1. Baixar backup**, guarde o arquivo e só depois em **2. Importar os selecionados**. Espere a confirmação de conferência. Os originais não são apagados.
6. Clique em **Ir para meu casamento**. Confira convidados, gastos, parcelas, pagamentos, fotos e presentes. Recarregue e confira novamente. Não crie novamente registros já importados.
7. Para uma conta sem dados antigos, clique em **Ir para meu casamento** e cadastre um casamento novo. Os novos cadastros usam Supabase.
8. Em outro navegador/aparelho, entre na mesma conta e confira os registros. Isso exige que o frontend esteja em um endereço acessível por esse aparelho; localhost não é público.
9. Clique em **Sair**. Tente abrir uma tela de gastos diretamente: deve solicitar login. Outra conta não deve ver os seus casamentos.
10. Em **Esqueci minha senha**, solicite recuperação e abra o link no mesmo navegador. Escolha e confirme uma nova senha. Esse teste depende da entrega do e-mail e dos Redirect URLs.
11. Para acessar a importação depois, abra o botão de informações na barra superior → **Trazer cadastros antigos ou backup**.

Os testes automatizados não enviam e-mails reais. A importação dos seus cadastros e o teste de entrega do e-mail precisam ser feitos com sua conta. Não envie senha ou chaves secretas pelo chat.
