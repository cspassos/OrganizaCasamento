import { readFile, mkdir, writeFile } from 'node:fs/promises';

const config = JSON.parse(
  await readFile(new URL('../supabase/templates/auth-config.json', import.meta.url), 'utf8'),
);
const escape = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const models = await Promise.all(
  [
    ['confirmation', 'Confirmação de cadastro', 'Confirm sign up'],
    ['recovery', 'Recuperação de senha', 'Reset password'],
  ].map(async ([type, title, label]) => ({
    type,
    title,
    label,
    subject: config[`mailer_subjects_${type}`],
    html: await readFile(new URL(`../supabase/templates/${type}.html`, import.meta.url), 'utf8'),
  })),
);
const sections = models
  .map((m, index) => {
    const preview = m.html
      .replaceAll('{{ .Email }}', 'ana@exemplo.com')
      .replaceAll(
        '{{ .ConfirmationURL }}',
        `https://organizacasamento.vercel.app/acesso/${m.type === 'recovery' ? 'nova-senha' : 'confirmar'}?exemplo=1`,
      )
      .replaceAll('{{ .SiteURL }}', 'https://organizacasamento.vercel.app');
    return `<section><div class="intro"><span class="step">${index + 1}</span><div><h2>${m.title}</h2><p>No Supabase, abra <strong>${m.label}</strong>. Copie o assunto para <strong>Subject</strong> e o HTML para <strong>Body / Source</strong>. Depois clique em <strong>Save</strong>.</p></div></div><div class="columns"><div><label for="subject-${m.type}">Assunto / Subject</label><input id="subject-${m.type}" readonly value="${escape(m.subject)}"><div class="actions"><button data-copy="subject-${m.type}">Copiar assunto</button><button class="primary" data-copy="html-${m.type}">Copiar HTML do e-mail</button></div><details><summary>Ver o código HTML</summary><textarea id="html-${m.type}" readonly spellcheck="false">${escape(m.html)}</textarea></details><p class="hint">Substitua todo o conteúdo antigo. Mantenha os campos entre chaves: o Supabase preenche o e-mail e o link de confirmação automaticamente.</p></div><div><p class="preview-label">Prévia com dados de exemplo</p><iframe title="Prévia: ${m.title}" sandbox srcdoc="${escape(preview)}"></iframe></div></div></section>`;
  })
  .join('');
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aplicar e-mails — OrganizaCasamento</title><style>*{box-sizing:border-box}body{margin:0;background:#f6f5f0;color:#344136;font:15px/1.6 Arial,sans-serif}main{max-width:1180px;margin:auto;padding:32px 22px}h1{font-size:30px;line-height:1.2}h2{font-size:21px;margin:0 0 6px}.brand{color:#52664c;font-weight:bold}.notice{border-left:4px solid #b59661;background:#eee9d9;padding:16px 20px;border-radius:7px}.top-link{display:inline-block;background:#52664c;color:white;text-decoration:none;padding:12px 20px;border-radius:7px;margin:16px 0}section{background:white;border:1px solid #e2e4d9;border-radius:12px;padding:25px;margin:25px 0}.intro{display:flex;gap:15px}.intro p{margin:0 0 23px;font-size:14px;color:#687561}.step{display:grid;place-items:center;background:#eef0e8;flex-shrink:0;width:38px;height:38px;border-radius:50%;font-weight:bold}.columns{display:grid;grid-template-columns:1fr 1fr;gap:25px}label{font-size:13px;font-weight:bold;display:block;margin-bottom:6px}input,textarea{width:100%;border:1px solid #d9dfd0;border-radius:6px;padding:12px;font:13px/1.5 Arial;background:#fcfcf9;color:#344136}textarea{height:300px;font-family:monospace;font-size:11px}.actions{display:flex;flex-wrap:wrap;gap:10px;margin:15px 0}button{font:600 13px Arial;padding:12px 16px;border:1px solid #d8ddce;border-radius:6px;color:#52664c;background:white;cursor:pointer}button.primary{background:#52664c;color:white;border-color:#52664c}summary{cursor:pointer;color:#52664c;font-size:13px;margin:16px 0}.hint,.preview-label{font-size:12px;color:#77816f}iframe{border:1px solid #e5e8df;border-radius:8px;width:100%;height:710px;background:#f6f5f0}#status{position:fixed;right:20px;bottom:20px;background:#344136;color:white;padding:12px 20px;border-radius:8px;max-width:calc(100% - 40px)}#status:empty{display:none}footer{font-size:12px;color:#77816f;padding:15px 0}@media(max-width:750px){.columns{grid-template-columns:1fr}main{padding:22px 14px}section{padding:18px}h1{font-size:25px}}</style></head><body><main><p class="brand">OrganizaCasamento · Configuração dos e-mails</p><h1>Confirmação e recuperação em português</h1><p>O Brevo faz o envio. Os assuntos e os textos destes e-mails são definidos no Supabase.</p><p class="notice"><strong>Esta página não altera as configurações do seu projeto.</strong> Use os botões para copiar os modelos e salvá-los no painel. O SMTP Brevo que já está configurado deve ser mantido.</p><a class="top-link" href="https://supabase.com/dashboard/project/luhamomwwsiqxodwjodo/auth/templates" target="_blank" rel="noopener noreferrer">Abrir modelos no Supabase ↗</a>${sections}<footer>Depois de salvar, confira um novo e-mail de cadastro e um novo pedido de recuperação. Mensagens antigas da caixa de entrada não mudam. Nunca compartilhe sua senha SMTP.</footer></main><div id="status" role="status" aria-live="polite"></div><script>document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{const field=document.getElementById(button.dataset.copy);let copied=false;try{await navigator.clipboard.writeText(field.value);copied=true;}catch{const details=field.closest('details');if(details)details.open=true;field.focus();field.select();copied=document.execCommand('copy');}document.getElementById('status').textContent=copied?'Copiado. Cole no campo correspondente do Supabase.':'Selecione o campo e pressione Ctrl+C para copiar.';}));</script></body></html>`;
const directory = new URL('../artifacts/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('configurar-emails.html', directory), html, 'utf8');
console.log(
  'Página pronta: artifacts/configurar-emails.html. Nenhuma configuração remota alterada.',
);
