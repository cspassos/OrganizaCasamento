import { test, expect, Page } from '@playwright/test';

test('CSV inválido mostra linha e motivo em janela visível; arquivo corrigido exige confirmar e limpa filtros', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/pessoas/convidados');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page.getByRole('searchbox').fill('Filtro sem resultados');
  const input = page.getByLabel('Enviar planilha preenchida', { exact: true });
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Expandir cadastro por planilha', exact: true }).click();
  await page.getByRole('button', { name: 'Recolher cadastro por planilha', exact: true }).click();
  await expect(input).toBeHidden();
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Expandir cadastro por planilha', exact: true }).click();
  await expect(input).toBeAttached();
  await expect(page.locator('#guest-import-content')).toBeVisible();
  await input.setInputFiles({
    name: 'modelo-convidados.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Nome;Telefone;WhatsApp\nPessoa teste;11 778327632;11 778327632\nOutra pessoa;;',
    ),
  });
  const notice = page.getByRole('alertdialog');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('Linha 2');
  await expect(notice).toContainText('Telefone');
  await expect(notice).toContainText('Nenhum convidado foi importado');
  await notice.screenshot({ path: 'artifacts/etapa-04-erro-csv.png' });
  await notice.getByRole('button', { name: 'Entendi', exact: true }).click();
  await expect(page.locator('.import-feedback')).toContainText('Linha 2');
  await expect(page.locator('.people-person')).toHaveCount(0);
  await input.setInputFiles({
    name: 'corrigido.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Nome;Telefone;WhatsApp\nPessoa teste;;\nOutra pessoa;;'),
  });
  await expect(
    page.getByRole('heading', { name: 'Conferir importação', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.import-feedback')).toContainText(
    'Nenhum cadastro foi adicionado ainda',
  );
  await page.getByRole('button', { name: 'Confirmar importação', exact: true }).click();
  await expect(page.locator('.import-feedback')).toContainText('2 pessoas importadas com sucesso');
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await expect(page.locator('.people-person')).toHaveCount(2);
});

test('busca de padrinhos encontra pessoas entre mais de 500 convidados e distingue nomes iguais', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/pessoas/convidados');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  const rows = Array.from(
    { length: 500 },
    (_, i) =>
      `Convidado ${String(i).padStart(3, '0')};119${String(i).padStart(8, '0')};Família de teste`,
  );
  rows.push('José Silva;11911112222;Família Azul', 'José Silva;11933334444;Família Verde');
  await page.getByLabel('Enviar planilha preenchida', { exact: true }).setInputFiles({
    name: '502-convidados.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Nome;Telefone;Família\n' + rows.join('\n')),
  });
  await page.getByRole('button', { name: 'Confirmar importação', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('502 pessoas importadas');
  await page.goto('/pessoas/padrinhos');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar participação', exact: true }).click();
  const dialog = page.getByRole('dialog'),
    picker = dialog.getByLabel('Pessoa da lista');
  await picker.fill('11900000499');
  await expect(page.getByRole('option').filter({ hasText: 'Convidado 499' })).toBeVisible();
  await picker.fill('Jose Silva');
  await expect(page.locator('mat-option')).toHaveCount(2);
  await page.screenshot({ path: 'artifacts/etapa-04-busca-padrinhos.png', animations: 'disabled' });
  await page.getByRole('option').filter({ hasText: 'Família Verde' }).click();
  await expect(picker).toHaveValue('José Silva');
  await picker.fill('Nome não cadastrado');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toBeVisible();
  await picker.fill('Jose Silva');
  await page.getByRole('option').filter({ hasText: 'Família Azul' }).click();
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Editar participação', exact: true }).click();
  await expect(dialog.getByLabel('Pessoa da lista')).toHaveValue('José Silva');
  await expect(dialog.locator('oc-guest-picker')).toContainText('Família Azul');
  const participation = dialog.getByRole('combobox', {
    name: 'Tipo de participação *',
    exact: true,
  });
  await expect(participation.locator('option')).toContainText([
    'Padrinho',
    'Madrinha',
    'Debutante',
    'Noivinha',
  ]);
  await participation.selectOption('__custom');
  await dialog.getByLabel('Descreva a participação').fill('Representante da família');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Editar participação', exact: true }).click();
  await expect(
    dialog.getByRole('combobox', { name: 'Tipo de participação *', exact: true }),
  ).toHaveValue('__custom');
  await expect(dialog.getByLabel('Descreva a participação')).toHaveValue(
    'Representante da família',
  );
});

test('duplicar integrante copia todos os campos exceto nome, incluindo lado e confirmação', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/pessoas/familias');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page.getByRole('button', { name: 'Nova família ou grupo', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nome da família ou grupo').fill('Família rápida');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar integrante', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome completo').fill('Maria');
  await expect(dialog.getByLabel('Grupo (')).toHaveCount(0);
  await dialog
    .getByText('Família, acompanhante e outros contatos (opcional)', { exact: true })
    .click();
  await dialog.getByLabel('Telefone', { exact: true }).fill('11999998888');
  await dialog.getByLabel('WhatsApp (opcional)', { exact: true }).fill('11988887777');
  await dialog.getByLabel('É criança').check();
  await expect(dialog.getByLabel('Necessidades de acessibilidade')).toHaveCount(0);
  await dialog.getByLabel('Observações', { exact: true }).fill('Teste de cópia');
  await dialog.getByLabel('Confirmação').selectOption('Confirmado');
  await expect(dialog.getByLabel('Restrições alimentares')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicar integrante Maria', exact: true }).click();
  await expect(dialog.getByLabel('Nome completo')).toHaveValue('');
  await expect(dialog.getByLabel('Nome completo')).toBeFocused();
  await expect(dialog.getByLabel('Confirmação')).toHaveValue('Confirmado');
  await dialog
    .getByText('Família, acompanhante e outros contatos (opcional)', { exact: true })
    .click();
  await expect(dialog.getByLabel('Telefone', { exact: true })).toHaveValue('(11) 99999-8888');
  await expect(dialog.getByLabel('WhatsApp (opcional)', { exact: true })).toHaveValue(
    '(11) 98888-7777',
  );
  await expect(dialog.getByLabel('É criança')).toBeChecked();
  await expect(dialog.getByLabel('Observações', { exact: true })).toHaveValue('Teste de cópia');
  await dialog.getByLabel('Nome completo').fill('Carlos');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await page
    .getByRole('dialog')
    .filter({ hasText: 'Possível cadastro duplicado' })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(page.getByText('2 integrantes · 2 confirmados')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({
    path: 'artifacts/etapa-04-familia-alinhada.png',
    fullPage: true,
    animations: 'disabled',
  });
});
async function wedding(page: Page) {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Ana e João');
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('João');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}

test('telefones recebem máscara e contatos inválidos impedem salvar', async ({ page }) => {
  await wedding(page);
  await page.goto('/pessoas/convidados');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Novo convidado', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome completo').fill('Contato de teste');
  const phone = dialog.locator('input[formControlName="phone"]'),
    whatsapp = dialog.locator('input[formControlName="whatsapp"]'),
    email = dialog.locator('input[formControlName="email"]');
  await dialog
    .getByText('Família, acompanhante e outros contatos (opcional)', { exact: true })
    .click();
  await phone.fill('123');
  await phone.blur();
  await expect(dialog.locator('#phone-help')).toBeVisible();
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(page.locator('.people-person')).toHaveCount(0);
  await phone.fill('1134567890');
  await expect(phone).toHaveValue('(11) 3456-7890');
  await whatsapp.fill('+55 (11) 99999-8888');
  await expect(whatsapp).toHaveValue('(11) 99999-8888');
  await email.fill('pessoa@dominio');
  await email.blur();
  await expect(dialog.locator('#email-help')).toBeVisible();
  await email.fill('pessoa@exemplo.com');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Editar Contato de teste', exact: true }).click();
  await dialog
    .getByText('Família, acompanhante e outros contatos (opcional)', { exact: true })
    .click();
  await expect(phone).toHaveValue('(11) 3456-7890');
  await expect(whatsapp).toHaveValue('(11) 99999-8888');
});
test('família com confirmação parcial e padrinhos sem duplicar pessoas persistem', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await wedding(page);
  await page.goto('/pessoas/familias');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page.getByRole('button', { name: 'Nova família ou grupo', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nome da família ou grupo').fill('Família Souza');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  for (const name of ['Maria Souza', 'Pedro Souza']) {
    await page.getByRole('button', { name: 'Adicionar integrante', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Nome completo').fill(name);
    if (name === 'Pedro Souza') {
      await page.getByRole('dialog').getByLabel('É criança').check();
      await page
        .getByRole('dialog')
        .screenshot({ path: 'artifacts/etapa-04-cadastro-convidado.png' });
    }
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.getByLabel('Confirmação de Maria Souza').selectOption('Confirmado');
  await expect(page.getByText('2 integrantes · 1 confirmados')).toBeVisible();
  await page.screenshot({ path: 'artifacts/etapa-04-familia.png', fullPage: true });
  await page.goto('/pessoas/padrinhos');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar participação', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Pessoa da lista').fill('Maria');
  await page.getByRole('option').filter({ hasText: 'Maria Souza' }).click();
  await page.getByRole('dialog').getByLabel('Tipo de participação').selectOption('Madrinha');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Adicionar participação', exact: true }).click();
  const second = page.getByRole('dialog');
  await second.getByLabel('Pessoa da lista').fill('Pedro');
  await page.getByRole('option').filter({ hasText: 'Pedro Souza' }).click();
  await second.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Maria Souza', exact: true })).toBeVisible();
  await page.goto('/dashboard');
  await expect(page.locator('.finance-metrics')).toContainText('2');
  await page.goto('/pessoas/convidados');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page.getByLabel('Faixa etária').selectOption('child');
  await expect(page.locator('.people-person')).toHaveCount(1);
  await expect(page.locator('.people-person')).toContainText('Pedro Souza');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.sidebar')).not.toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'artifacts/etapa-04-convidados-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(errors).toEqual([]);
});
test('importação mostra duplicidades, mantém vínculos e exporta todas as pessoas', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/pessoas/convidados');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  const csv =
    'Nome;Telefone;Família;Confirmação\nAna;11999999999;Souza;Confirmado\nBeto;11999999999;Souza;Aguardando confirmação';
  await page
    .getByLabel('Enviar planilha preenchida', { exact: true })
    .setInputFiles({ name: 'convidados.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByRole('heading', { name: 'Conferir importação' })).toBeVisible();
  await expect(page.getByText('1 possíveis duplicidades.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar importação' }).click();
  await expect(page.locator('.people-person')).toHaveCount(2);
  const download = page.waitForEvent('download');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Baixar planilha (Excel/CSV)' }).click();
  expect((await download).suggestedFilename()).toBe('convidados.csv');
  await page.getByRole('button', { name: 'Adicionar acompanhante' }).first().click();
  await page.getByRole('dialog').getByLabel('Nome completo').fill('Carla');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.locator('.people-person')).toHaveCount(3);
  await page
    .locator('.people-person')
    .filter({ has: page.getByRole('heading', { name: 'Ana', exact: true }) })
    .getByRole('button', { name: 'Excluir', exact: true })
    .click();
  const notice = page.getByRole('dialog');
  await expect(notice).toContainText('Carla');
  await expect(notice).toContainText('Ana');
  await notice.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('.people-person')).toHaveCount(3);
  await page
    .locator('.people-person')
    .filter({ has: page.getByRole('heading', { name: 'Ana', exact: true }) })
    .getByRole('button', { name: 'Excluir', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Excluir pessoa e acompanhantes', exact: true })
    .click();
  await expect(page.locator('.people-person')).toHaveCount(1);
  await expect(page.locator('.people-person')).toContainText('Beto');
  await page.reload();
  await expect(page.locator('.people-person')).toHaveCount(1);
});
test('confirmação e convite enviado podem ser alterados na tabela e persistem', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/pessoas/convidados');
  await page.getByRole('button', { name: 'Adicionar convidados', exact: true }).click();
  await page.getByLabel('Nomes dos convidados').fill('Ana de teste\nCarlos de teste');
  await page.getByRole('button', { name: 'Adicionar à lista', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const sent = page.getByRole('combobox', {
    name: 'Convite enviado para Ana de teste',
    exact: true,
  });
  const confirmation = page.getByRole('combobox', {
    name: 'Confirmação de Ana de teste',
    exact: true,
  });
  await confirmation.selectOption('Confirmado');
  await expect(
    page.getByRole('status').filter({ hasText: 'Confirmação de Ana de teste atualizada' }),
  ).toBeVisible();
  await sent.selectOption('yes');
  await expect(
    page.getByRole('status').filter({ hasText: 'Convite de Ana de teste atualizado' }),
  ).toBeVisible();
  await expect(confirmation).toHaveValue('Confirmado');
  await expect(
    page.getByRole('combobox', { name: 'Convite enviado para Carlos de teste', exact: true }),
  ).toHaveValue('no');
  await page.reload();
  await expect(confirmation).toHaveValue('Confirmado');
  await expect(sent).toHaveValue('yes');
  await sent.selectOption('no');
  await expect(
    page.getByRole('status').filter({ hasText: 'Convite de Ana de teste atualizado' }),
  ).toBeVisible();
  await expect(confirmation).toHaveValue('Confirmado');
  await page.reload();
  await expect(sent).toHaveValue('no');
  await expect(confirmation).toHaveValue('Confirmado');
});
test('lista de nomes permite vincular todos a uma família ou deixar individuais', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/pessoas/familias');
  await page.getByRole('button', { name: 'Nova família ou grupo', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nome da família ou grupo').fill('Família Souza');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const q = indexedDB.open('organiza-casamento');
      q.onsuccess = () => resolve(q.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('people', 'readwrite');
      const store = tx.objectStore('people');
      const q = store.getAll();
      q.onsuccess = () => {
        const ledger = q.result[0];
        for (let i = 0; i < 100; i++)
          ledger.families.push({
            id: crypto.randomUUID(),
            weddingId: ledger.weddingId,
            name: `Família ${String(i).padStart(3, '0')}`,
            notes: '',
          });
        store.put(ledger);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.goto('/pessoas/convidados');
  await page.getByRole('button', { name: 'Adicionar convidados', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Família (opcional)', exact: true })
    .fill('Família');
  await expect(page.locator('mat-option').filter({ hasText: 'Mostrando 30 de 101' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Família (opcional)', exact: true }).fill('Não existe');
  await page.getByLabel('Nomes dos convidados').fill('Ana Souza\nCarlos Souza\nPedro Souza');
  await page.getByRole('button', { name: 'Adicionar à lista', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Escolha uma família');
  await page.getByRole('combobox', { name: 'Família (opcional)', exact: true }).fill('Souza');
  await page.locator('mat-option').filter({ hasText: 'Família Souza' }).click();
  await page.getByLabel('Nomes dos convidados').fill('Ana Souza\nCarlos Souza\nPedro Souza');
  await page.getByRole('button', { name: 'Adicionar à lista', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  const rows = page.locator('oc-collection-table tbody tr');
  await expect(rows).toHaveCount(3);
  for (const row of await rows.all()) await expect(row).toContainText('Família Souza');
  await page.getByRole('button', { name: 'Adicionar convidados', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('combobox', { name: 'Família (opcional)', exact: true }),
  ).toHaveValue('');
  await page.getByLabel('Nomes dos convidados').fill('Pessoa individual');
  await page.getByRole('button', { name: 'Adicionar à lista', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(rows.filter({ hasText: 'Pessoa individual' })).toContainText('Individual');
});
test('vincula padrinho e madrinha sem duplicar convidados e filtra por participação', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/pessoas/convidados');
  await page.getByRole('button', { name: 'Adicionar convidados', exact: true }).click();
  await page.getByLabel('Nomes dos convidados').fill('Maria Souza\nCarlos Souza');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Adicionar à lista', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const rows = page.locator('oc-collection-table tbody tr');
  await rows
    .filter({ hasText: 'Maria Souza' })
    .getByRole('button', { name: 'Ações de Maria Souza', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Definir participação', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Pessoa da lista')).toHaveAttribute('aria-expanded', 'false');
  await dialog.getByLabel('Pessoa da lista').click();
  await expect(dialog.getByLabel('Pessoa da lista')).toHaveAttribute('aria-expanded', 'true');
  await expect(dialog.getByLabel('Pessoa da lista')).toHaveValue('Maria Souza');
  await dialog
    .getByRole('combobox', { name: 'Tipo de participação *', exact: true })
    .selectOption('Madrinha');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await rows
    .filter({ hasText: 'Carlos Souza' })
    .getByRole('button', { name: 'Ações de Carlos Souza', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Definir participação', exact: true }).click();
  await dialog.getByLabel('Par na cerimônia (opcional)', { exact: true }).fill('Maria');
  await page.locator('mat-option').filter({ hasText: 'Maria Souza' }).click();
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(rows).toHaveCount(2);
  await expect(
    rows.filter({ has: page.getByRole('button', { name: 'Ações de Carlos Souza', exact: true }) }),
  ).toContainText('Par: Maria Souza');
  await expect(
    rows.filter({ has: page.getByRole('button', { name: 'Ações de Maria Souza', exact: true }) }),
  ).toContainText('Par: Carlos Souza');
  await page.getByText('Filtros e outras opções', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Participação', exact: true }).selectOption('Madrinha');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('Maria Souza');
  await page.getByRole('combobox', { name: 'Participação', exact: true }).selectOption('Padrinho');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('Carlos Souza');
  await page.getByRole('link', { name: 'Participações especiais', exact: true }).click();
  await expect(rows).toHaveCount(2);
  await page.reload();
  await expect(page.locator('oc-collection-table')).toContainText('Par: Maria Souza');
  await expect(page.locator('oc-collection-table')).toContainText('Par: Carlos Souza');
});
