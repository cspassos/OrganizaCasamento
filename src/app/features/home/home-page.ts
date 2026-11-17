import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { Icon } from '../../shared/components/icon';

@Component({
  imports: [RouterLink, Icon],
  templateUrl: './home-page.html',
})
export class HomePage {
  auth = inject(AuthService);
  menu = signal(false);
  year = new Date().getFullYear();
  readonly features = [
    {
      icon: 'account_balance_wallet',
      title: 'Seu dinheiro, às claras',
      text: 'Veja o que combinou, quanto já pagou e o que ainda falta. Guarde preços enquanto pesquisa e organize as parcelas quando contratar.',
    },
    {
      icon: 'groups',
      title: 'Todo mundo na mesma lista',
      text: 'Adicione nomes de uma vez, reúna as famílias e acompanhe quem recebeu o convite e quem confirmou presença.',
    },
    {
      icon: 'mail',
      title: 'Convites com a sua história',
      text: 'Prepare seu convite, compartilhe o arquivo ou link pelo WhatsApp e acompanhe as respostas em um só lugar.',
    },
    {
      icon: 'redeem',
      title: 'Presentes para o novo começo',
      text: 'Monte sua lista com fotos e links das lojas. Compartilhe suas ideias e anote o que já recebeu.',
    },
  ];
  readonly questions = [
    {
      q: 'Como começo a usar?',
      a: 'Clique em Criar minha conta, informe seu e-mail e escolha uma senha. Confirme o endereço pelo link recebido. Depois, cadastre seu casamento com os nomes, a data e quanto pretende gastar. Você pode completar os outros dados aos poucos.',
    },
    {
      q: 'Preciso cadastrar tudo de uma vez?',
      a: 'Não. Comece pelo que já sabe. Você pode guardar um preço que está pesquisando, adicionar só os nomes dos convidados e voltar para completar os detalhes depois.',
    },
    {
      q: 'O sistema faz os pagamentos por mim?',
      a: 'Não. Ele ajuda a controlar. Depois de pagar um fornecedor, você registra o pagamento para atualizar o saldo. Criar uma entrada ou parcela apenas organiza as contas a pagar.',
    },
    {
      q: 'Posso acessar pelo celular?',
      a: 'Sim. Acesse o site pelo navegador e entre com a mesma conta. Os cadastros ficam salvos online. É preciso estar conectado à internet para consultar ou salvar.',
    },
    {
      q: 'Como envio os convites pelo WhatsApp?',
      a: 'Na área Convites, escolha o modelo e os destinatários. O sistema prepara o texto e o arquivo para compartilhar. Você revisa e confirma o envio no WhatsApp; não há disparo automático de mensagens.',
    },
    {
      q: 'Esqueci minha senha. E agora?',
      a: 'Na tela Entrar, clique em Esqueci minha senha e informe o e-mail da conta. Abra a mensagem recebida para escolher uma nova senha. Confira também a pasta de spam.',
    },
    {
      q: 'Não recebi o e-mail de confirmação.',
      a: 'Confira se digitou o endereço corretamente e procure também no spam. Se continuar com dificuldade, fale com a gente pelo e-mail organizacasamento.oficial@gmail.com. Nunca envie sua senha.',
    },
  ];
}
