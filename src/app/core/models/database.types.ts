export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      administradores_aplicativo: {
        Row: {
          criado_em: string;
          deve_alterar_senha: boolean;
          usuario_id: string;
        };
        Insert: {
          criado_em?: string;
          deve_alterar_senha?: boolean;
          usuario_id: string;
        };
        Update: {
          criado_em?: string;
          deve_alterar_senha?: boolean;
          usuario_id?: string;
        };
        Relationships: [];
      };
      auditoria_administracao: {
        Row: {
          acao: string;
          administrador_id: string;
          criado_em: string;
          id: string;
          usuario_alvo_id: string | null;
        };
        Insert: {
          acao: string;
          administrador_id: string;
          criado_em?: string;
          id?: string;
          usuario_alvo_id?: string | null;
        };
        Update: {
          acao?: string;
          administrador_id?: string;
          criado_em?: string;
          id?: string;
          usuario_alvo_id?: string | null;
        };
        Relationships: [];
      };
      auditoria_financeira: {
        Row: {
          acao: string;
          casamento_id: string;
          detalhe: string;
          entidade_id: string;
          id: string;
          ocorrido_em: string;
        };
        Insert: {
          acao: string;
          casamento_id: string;
          detalhe?: string;
          entidade_id?: string;
          id?: string;
          ocorrido_em?: string;
        };
        Update: {
          acao?: string;
          casamento_id?: string;
          detalhe?: string;
          entidade_id?: string;
          id?: string;
          ocorrido_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'finance_audit_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      casamentos: {
        Row: {
          arquivado: boolean;
          atualizado_em: string;
          caminho_foto: string | null;
          capacidade: number;
          cidade: string;
          cores: string;
          criado_em: string;
          dados_temporarios: boolean;
          data_casamento: string | null;
          descricao_cerimonia: string;
          endereco_cerimonia: string;
          endereco_recepcao: string;
          estado: string;
          estilo: string;
          estimativa_convidados: number;
          horario_cerimonia: string | null;
          horario_recepcao: string | null;
          id: string;
          local_cerimonia: string;
          local_recepcao: string;
          nome: string;
          nome_noiva: string;
          nome_noivo: string;
          observacoes: string;
          orcamento_inicial_centavos: number;
          paleta_cores: string[];
          proprietario_id: string;
          tema: string;
          tipo_cerimonia: string;
        };
        Insert: {
          arquivado?: boolean;
          atualizado_em?: string;
          caminho_foto?: string | null;
          capacidade?: number;
          cidade?: string;
          cores?: string;
          criado_em?: string;
          dados_temporarios?: boolean;
          data_casamento?: string | null;
          descricao_cerimonia?: string;
          endereco_cerimonia?: string;
          endereco_recepcao?: string;
          estado?: string;
          estilo?: string;
          estimativa_convidados?: number;
          horario_cerimonia?: string | null;
          horario_recepcao?: string | null;
          id?: string;
          local_cerimonia?: string;
          local_recepcao?: string;
          nome: string;
          nome_noiva?: string;
          nome_noivo?: string;
          observacoes?: string;
          orcamento_inicial_centavos?: number;
          paleta_cores?: string[];
          proprietario_id?: string;
          tema?: string;
          tipo_cerimonia?: string;
        };
        Update: {
          arquivado?: boolean;
          atualizado_em?: string;
          caminho_foto?: string | null;
          capacidade?: number;
          cidade?: string;
          cores?: string;
          criado_em?: string;
          dados_temporarios?: boolean;
          data_casamento?: string | null;
          descricao_cerimonia?: string;
          endereco_cerimonia?: string;
          endereco_recepcao?: string;
          estado?: string;
          estilo?: string;
          estimativa_convidados?: number;
          horario_cerimonia?: string | null;
          horario_recepcao?: string | null;
          id?: string;
          local_cerimonia?: string;
          local_recepcao?: string;
          nome?: string;
          nome_noiva?: string;
          nome_noivo?: string;
          observacoes?: string;
          orcamento_inicial_centavos?: number;
          paleta_cores?: string[];
          proprietario_id?: string;
          tema?: string;
          tipo_cerimonia?: string;
        };
        Relationships: [];
      };
      categorias_financeiras: {
        Row: {
          atualizado_em: string;
          casamento_id: string;
          criado_em: string;
          id: string;
          nome: string;
          orcamento_centavos: number;
        };
        Insert: {
          atualizado_em?: string;
          casamento_id: string;
          criado_em?: string;
          id?: string;
          nome: string;
          orcamento_centavos?: number;
        };
        Update: {
          atualizado_em?: string;
          casamento_id?: string;
          criado_em?: string;
          id?: string;
          nome?: string;
          orcamento_centavos?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'finance_categories_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      configuracoes_financeiras: {
        Row: {
          atualizado_em: string;
          casamento_id: string;
          orcamento_centavos: number | null;
          reserva_centavos: number;
        };
        Insert: {
          atualizado_em?: string;
          casamento_id: string;
          orcamento_centavos?: number | null;
          reserva_centavos?: number;
        };
        Update: {
          atualizado_em?: string;
          casamento_id?: string;
          orcamento_centavos?: number | null;
          reserva_centavos?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'finance_settings_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: true;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      convidados: {
        Row: {
          acompanhante_de: string | null;
          atualizado_em: string;
          casamento_id: string;
          convite_enviado: boolean;
          criado_em: string;
          crianca: boolean;
          data_envio: string | null;
          detalhes_legados: Json;
          email: string;
          familia_id: string | null;
          id: string;
          idade: number | null;
          lado: string;
          nome: string;
          observacoes: string;
          parentesco: string;
          situacao: string;
          telefone: string;
          whatsapp: string;
        };
        Insert: {
          acompanhante_de?: string | null;
          atualizado_em?: string;
          casamento_id: string;
          convite_enviado?: boolean;
          criado_em?: string;
          crianca?: boolean;
          data_envio?: string | null;
          detalhes_legados?: Json;
          email?: string;
          familia_id?: string | null;
          id?: string;
          idade?: number | null;
          lado?: string;
          nome: string;
          observacoes?: string;
          parentesco?: string;
          situacao?: string;
          telefone?: string;
          whatsapp?: string;
        };
        Update: {
          acompanhante_de?: string | null;
          atualizado_em?: string;
          casamento_id?: string;
          convite_enviado?: boolean;
          criado_em?: string;
          crianca?: boolean;
          data_envio?: string | null;
          detalhes_legados?: Json;
          email?: string;
          familia_id?: string | null;
          id?: string;
          idade?: number | null;
          lado?: string;
          nome?: string;
          observacoes?: string;
          parentesco?: string;
          situacao?: string;
          telefone?: string;
          whatsapp?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'guests_wedding_id_companion_of_fkey';
            columns: ['casamento_id', 'acompanhante_de'];
            isOneToOne: false;
            referencedRelation: 'convidados';
            referencedColumns: ['casamento_id', 'id'];
          },
          {
            foreignKeyName: 'guests_wedding_id_family_id_fkey';
            columns: ['casamento_id', 'familia_id'];
            isOneToOne: false;
            referencedRelation: 'familias';
            referencedColumns: ['casamento_id', 'id'];
          },
          {
            foreignKeyName: 'guests_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      convidados_convite: {
        Row: {
          casamento_id: string;
          convidado_id: string;
          convite_id: string;
          copia_nome: string;
          id: string;
        };
        Insert: {
          casamento_id: string;
          convidado_id: string;
          convite_id: string;
          copia_nome: string;
          id?: string;
        };
        Update: {
          casamento_id?: string;
          convidado_id?: string;
          convite_id?: string;
          copia_nome?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitation_guests_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invitation_guests_wedding_id_guest_id_fkey';
            columns: ['casamento_id', 'convidado_id'];
            isOneToOne: false;
            referencedRelation: 'convidados';
            referencedColumns: ['casamento_id', 'id'];
          },
          {
            foreignKeyName: 'invitation_guests_wedding_id_invitation_id_fkey';
            columns: ['casamento_id', 'convite_id'];
            isOneToOne: false;
            referencedRelation: 'convites';
            referencedColumns: ['casamento_id', 'id'];
          },
        ];
      };
      convites: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          casamento_id: string;
          chave_unidade: string;
          copia_modelo: Json;
          criado_em: string;
          enviado_em: string | null;
          hash_token: string | null;
          id: string;
          modelo_id: string | null;
          rotulo_destinatario: string;
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          casamento_id: string;
          chave_unidade: string;
          copia_modelo: Json;
          criado_em?: string;
          enviado_em?: string | null;
          hash_token?: string | null;
          id?: string;
          modelo_id?: string | null;
          rotulo_destinatario: string;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          casamento_id?: string;
          chave_unidade?: string;
          copia_modelo?: Json;
          criado_em?: string;
          enviado_em?: string | null;
          hash_token?: string | null;
          id?: string;
          modelo_id?: string | null;
          rotulo_destinatario?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitations_wedding_id_design_id_fkey';
            columns: ['casamento_id', 'modelo_id'];
            isOneToOne: false;
            referencedRelation: 'modelos_convites';
            referencedColumns: ['casamento_id', 'id'];
          },
          {
            foreignKeyName: 'invitations_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      despesas: {
        Row: {
          atualizado_em: string;
          caminho_anexo: string | null;
          casamento_id: string;
          categoria_id: string;
          contratado_centavos: number;
          criado_em: string;
          data_contrato: string | null;
          data_vencimento: string | null;
          descricao: string;
          forma_pagamento: string;
          fornecedor_id: string | null;
          id: string;
          nome_fornecedor: string;
          observacoes: string;
          previsto_centavos: number;
          referencia_contrato: string;
          situacao: string;
        };
        Insert: {
          atualizado_em?: string;
          caminho_anexo?: string | null;
          casamento_id: string;
          categoria_id: string;
          contratado_centavos?: number;
          criado_em?: string;
          data_contrato?: string | null;
          data_vencimento?: string | null;
          descricao: string;
          forma_pagamento?: string;
          fornecedor_id?: string | null;
          id?: string;
          nome_fornecedor?: string;
          observacoes?: string;
          previsto_centavos?: number;
          referencia_contrato?: string;
          situacao?: string;
        };
        Update: {
          atualizado_em?: string;
          caminho_anexo?: string | null;
          casamento_id?: string;
          categoria_id?: string;
          contratado_centavos?: number;
          criado_em?: string;
          data_contrato?: string | null;
          data_vencimento?: string | null;
          descricao?: string;
          forma_pagamento?: string;
          fornecedor_id?: string | null;
          id?: string;
          nome_fornecedor?: string;
          observacoes?: string;
          previsto_centavos?: number;
          referencia_contrato?: string;
          situacao?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_wedding_id_category_id_fkey';
            columns: ['casamento_id', 'categoria_id'];
            isOneToOne: false;
            referencedRelation: 'categorias_financeiras';
            referencedColumns: ['casamento_id', 'id'];
          },
          {
            foreignKeyName: 'expenses_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_wedding_id_supplier_id_fkey';
            columns: ['casamento_id', 'fornecedor_id'];
            isOneToOne: false;
            referencedRelation: 'fornecedores';
            referencedColumns: ['casamento_id', 'id'];
          },
        ];
      };
      espacos_casamento: {
        Row: {
          atualizado_em: string;
          casamento: Json;
          casamento_id: string;
          convites: Json | null;
          criado_em: string;
          financeiro: Json | null;
          fornecedores: Json | null;
          hash_importacao: string | null;
          pessoas: Json | null;
          presentes: Json | null;
          proprietario_id: string;
          revisao: number;
        };
        Insert: {
          atualizado_em?: string;
          casamento: Json;
          casamento_id: string;
          convites?: Json | null;
          criado_em?: string;
          financeiro?: Json | null;
          fornecedores?: Json | null;
          hash_importacao?: string | null;
          pessoas?: Json | null;
          presentes?: Json | null;
          proprietario_id: string;
          revisao?: number;
        };
        Update: {
          atualizado_em?: string;
          casamento?: Json;
          casamento_id?: string;
          convites?: Json | null;
          criado_em?: string;
          financeiro?: Json | null;
          fornecedores?: Json | null;
          hash_importacao?: string | null;
          pessoas?: Json | null;
          presentes?: Json | null;
          proprietario_id?: string;
          revisao?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'wedding_workspaces_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: true;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      familias: {
        Row: {
          atualizado_em: string;
          casamento_id: string;
          criado_em: string;
          id: string;
          nome: string;
          observacoes: string;
        };
        Insert: {
          atualizado_em?: string;
          casamento_id: string;
          criado_em?: string;
          id?: string;
          nome: string;
          observacoes?: string;
        };
        Update: {
          atualizado_em?: string;
          casamento_id?: string;
          criado_em?: string;
          id?: string;
          nome?: string;
          observacoes?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'families_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      filas_whatsapp: {
        Row: {
          atualizado_em: string;
          casamento_id: string;
          fila: Json;
        };
        Insert: {
          atualizado_em?: string;
          casamento_id: string;
          fila: Json;
        };
        Update: {
          atualizado_em?: string;
          casamento_id?: string;
          fila?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsapp_queues_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: true;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      fornecedores: {
        Row: {
          atualizado_em: string;
          avaliacao: string;
          caminho_anexo: string | null;
          casamento_id: string;
          categoria: string;
          criado_em: string;
          documento: string;
          email: string;
          empresa: string;
          endereco: string;
          id: string;
          nome: string;
          nota: number;
          observacoes: string;
          responsavel: string;
          servico: string;
          situacao: string;
          telefone: string;
          whatsapp: string;
        };
        Insert: {
          atualizado_em?: string;
          avaliacao?: string;
          caminho_anexo?: string | null;
          casamento_id: string;
          categoria?: string;
          criado_em?: string;
          documento?: string;
          email?: string;
          empresa?: string;
          endereco?: string;
          id?: string;
          nome: string;
          nota?: number;
          observacoes?: string;
          responsavel?: string;
          servico?: string;
          situacao?: string;
          telefone?: string;
          whatsapp?: string;
        };
        Update: {
          atualizado_em?: string;
          avaliacao?: string;
          caminho_anexo?: string | null;
          casamento_id?: string;
          categoria?: string;
          criado_em?: string;
          documento?: string;
          email?: string;
          empresa?: string;
          endereco?: string;
          id?: string;
          nome?: string;
          nota?: number;
          observacoes?: string;
          responsavel?: string;
          servico?: string;
          situacao?: string;
          telefone?: string;
          whatsapp?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'suppliers_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      itens_presentes: {
        Row: {
          atualizado_em: string;
          caminho_foto: string | null;
          casamento_id: string;
          criado_em: string;
          descricao: string;
          id: string;
          nome: string;
          preco_centavos: number | null;
          quantidade: number;
          quantidade_recebida: number;
          url_produto: string;
        };
        Insert: {
          atualizado_em?: string;
          caminho_foto?: string | null;
          casamento_id: string;
          criado_em?: string;
          descricao?: string;
          id?: string;
          nome: string;
          preco_centavos?: number | null;
          quantidade?: number;
          quantidade_recebida?: number;
          url_produto?: string;
        };
        Update: {
          atualizado_em?: string;
          caminho_foto?: string | null;
          casamento_id?: string;
          criado_em?: string;
          descricao?: string;
          id?: string;
          nome?: string;
          preco_centavos?: number | null;
          quantidade?: number;
          quantidade_recebida?: number;
          url_produto?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'gift_items_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      listas_presentes: {
        Row: {
          atualizado_em: string;
          casamento_id: string;
          mensagem: string;
          titulo: string;
        };
        Insert: {
          atualizado_em?: string;
          casamento_id: string;
          mensagem?: string;
          titulo?: string;
        };
        Update: {
          atualizado_em?: string;
          casamento_id?: string;
          mensagem?: string;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'gift_lists_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: true;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      listas_presentes_externas: {
        Row: {
          atualizado_em: string;
          casamento_id: string;
          id: string;
          nome: string;
          url: string;
        };
        Insert: {
          atualizado_em?: string;
          casamento_id: string;
          id?: string;
          nome: string;
          url: string;
        };
        Update: {
          atualizado_em?: string;
          casamento_id?: string;
          id?: string;
          nome?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'external_gift_lists_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      mensagens_convites: {
        Row: {
          acao: string;
          atualizado_em: string;
          casamento_id: string;
          id: string;
          mensagem: string;
        };
        Insert: {
          acao: string;
          atualizado_em?: string;
          casamento_id: string;
          id?: string;
          mensagem: string;
        };
        Update: {
          acao?: string;
          atualizado_em?: string;
          casamento_id?: string;
          id?: string;
          mensagem?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitation_messages_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      modelos_convites: {
        Row: {
          atualizado_em: string;
          casamento_id: string;
          criado_em: string;
          id: string;
          modelo: Json;
          titulo: string;
        };
        Insert: {
          atualizado_em?: string;
          casamento_id: string;
          criado_em?: string;
          id?: string;
          modelo: Json;
          titulo: string;
        };
        Update: {
          atualizado_em?: string;
          casamento_id?: string;
          criado_em?: string;
          id?: string;
          modelo?: Json;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitation_designs_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      parcelas: {
        Row: {
          atualizado_em: string;
          casamento_id: string;
          criado_em: string;
          data_vencimento: string;
          despesa_id: string;
          id: string;
          numero: number;
          rotulo: string;
          valor_centavos: number;
        };
        Insert: {
          atualizado_em?: string;
          casamento_id: string;
          criado_em?: string;
          data_vencimento: string;
          despesa_id: string;
          id?: string;
          numero: number;
          rotulo: string;
          valor_centavos: number;
        };
        Update: {
          atualizado_em?: string;
          casamento_id?: string;
          criado_em?: string;
          data_vencimento?: string;
          despesa_id?: string;
          id?: string;
          numero?: number;
          rotulo?: string;
          valor_centavos?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'installments_wedding_id_expense_id_fkey';
            columns: ['casamento_id', 'despesa_id'];
            isOneToOne: false;
            referencedRelation: 'despesas';
            referencedColumns: ['casamento_id', 'id'];
          },
          {
            foreignKeyName: 'installments_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      participacoes_especiais: {
        Row: {
          atualizado_em: string;
          casamento_id: string;
          convidado_id: string;
          criado_em: string;
          detalhes_legados: Json;
          id: string;
          observacoes: string;
          parceiro_id: string | null;
          participacao: string;
        };
        Insert: {
          atualizado_em?: string;
          casamento_id: string;
          convidado_id: string;
          criado_em?: string;
          detalhes_legados?: Json;
          id?: string;
          observacoes?: string;
          parceiro_id?: string | null;
          participacao: string;
        };
        Update: {
          atualizado_em?: string;
          casamento_id?: string;
          convidado_id?: string;
          criado_em?: string;
          detalhes_legados?: Json;
          id?: string;
          observacoes?: string;
          parceiro_id?: string | null;
          participacao?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'special_participations_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'special_participations_wedding_id_guest_id_fkey';
            columns: ['casamento_id', 'convidado_id'];
            isOneToOne: true;
            referencedRelation: 'convidados';
            referencedColumns: ['casamento_id', 'id'];
          },
          {
            foreignKeyName: 'special_participations_wedding_id_partner_id_fkey';
            columns: ['casamento_id', 'parceiro_id'];
            isOneToOne: false;
            referencedRelation: 'participacoes_especiais';
            referencedColumns: ['casamento_id', 'id'];
          },
        ];
      };
      perfis: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          id: string;
          nome_exibicao: string;
        };
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          id: string;
          nome_exibicao?: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          nome_exibicao?: string;
        };
        Relationships: [];
      };
      preferencias_usuario: {
        Row: {
          atualizado_em: string;
          casamento_selecionado_id: string | null;
          dados: Json;
          id: string;
          menu_recolhido: boolean;
          tema_escuro: boolean;
        };
        Insert: {
          atualizado_em?: string;
          casamento_selecionado_id?: string | null;
          dados?: Json;
          id?: string;
          menu_recolhido?: boolean;
          tema_escuro?: boolean;
        };
        Update: {
          atualizado_em?: string;
          casamento_selecionado_id?: string | null;
          dados?: Json;
          id?: string;
          menu_recolhido?: boolean;
          tema_escuro?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'user_preferences_selected_wedding_id_fkey';
            columns: ['casamento_selecionado_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      registros_legados: {
        Row: {
          casamento_id: string;
          conteudo: Json;
          id: string;
          importado_em: string;
          modulo: string;
        };
        Insert: {
          casamento_id: string;
          conteudo: Json;
          id?: string;
          importado_em?: string;
          modulo: string;
        };
        Update: {
          casamento_id?: string;
          conteudo?: Json;
          id?: string;
          importado_em?: string;
          modulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'legacy_snapshots_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      respostas_presenca: {
        Row: {
          casamento_id: string;
          comparecera: boolean;
          convidado_id: string;
          convite_id: string;
          id: string;
          observacoes: string;
          respondido_em: string;
        };
        Insert: {
          casamento_id: string;
          comparecera: boolean;
          convidado_id: string;
          convite_id: string;
          id?: string;
          observacoes?: string;
          respondido_em?: string;
        };
        Update: {
          casamento_id?: string;
          comparecera?: boolean;
          convidado_id?: string;
          convite_id?: string;
          id?: string;
          observacoes?: string;
          respondido_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rsvp_responses_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rsvp_responses_wedding_id_invitation_id_guest_id_fkey';
            columns: ['casamento_id', 'convite_id', 'convidado_id'];
            isOneToOne: false;
            referencedRelation: 'convidados_convite';
            referencedColumns: ['casamento_id', 'convite_id', 'convidado_id'];
          },
        ];
      };
      transacoes_financeiras: {
        Row: {
          anulado_em: string | null;
          atualizado_em: string;
          caminho_anexo: string | null;
          casamento_id: string;
          criado_em: string;
          data_transacao: string;
          despesa_id: string;
          forma_pagamento: string;
          id: string;
          motivo_anulacao: string | null;
          observacoes: string;
          pagamento_id: string | null;
          parcela_id: string;
          tipo: string;
          valor_centavos: number;
        };
        Insert: {
          anulado_em?: string | null;
          atualizado_em?: string;
          caminho_anexo?: string | null;
          casamento_id: string;
          criado_em?: string;
          data_transacao: string;
          despesa_id: string;
          forma_pagamento?: string;
          id?: string;
          motivo_anulacao?: string | null;
          observacoes?: string;
          pagamento_id?: string | null;
          parcela_id: string;
          tipo: string;
          valor_centavos: number;
        };
        Update: {
          anulado_em?: string | null;
          atualizado_em?: string;
          caminho_anexo?: string | null;
          casamento_id?: string;
          criado_em?: string;
          data_transacao?: string;
          despesa_id?: string;
          forma_pagamento?: string;
          id?: string;
          motivo_anulacao?: string | null;
          observacoes?: string;
          pagamento_id?: string | null;
          parcela_id?: string;
          tipo?: string;
          valor_centavos?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'financial_transactions_wedding_id_expense_id_installment_i_fkey';
            columns: ['casamento_id', 'despesa_id', 'parcela_id'];
            isOneToOne: false;
            referencedRelation: 'parcelas';
            referencedColumns: ['casamento_id', 'despesa_id', 'id'];
          },
          {
            foreignKeyName: 'financial_transactions_wedding_id_fkey';
            columns: ['casamento_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'financial_transactions_wedding_id_payment_id_fkey';
            columns: ['casamento_id', 'pagamento_id'];
            isOneToOne: false;
            referencedRelation: 'transacoes_financeiras';
            referencedColumns: ['casamento_id', 'id'];
          },
        ];
      };
    };
    Views: {
      administration_audit: {
        Row: {
          action: string | null;
          administrator_id: string | null;
          created_at: string | null;
          id: string | null;
          target_user_id: string | null;
        };
        Insert: {
          action?: string | null;
          administrator_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          target_user_id?: string | null;
        };
        Update: {
          action?: string | null;
          administrator_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          target_user_id?: string | null;
        };
        Relationships: [];
      };
      app_administrators: {
        Row: {
          created_at: string | null;
          must_change_password: boolean | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          must_change_password?: boolean | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          must_change_password?: boolean | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          collapsed: boolean | null;
          dark: boolean | null;
          data: Json | null;
          id: string | null;
          selected_wedding_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          collapsed?: boolean | null;
          dark?: boolean | null;
          data?: Json | null;
          id?: string | null;
          selected_wedding_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          collapsed?: boolean | null;
          dark?: boolean | null;
          data?: Json | null;
          id?: string | null;
          selected_wedding_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_preferences_selected_wedding_id_fkey';
            columns: ['selected_wedding_id'];
            isOneToOne: false;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      wedding_workspaces: {
        Row: {
          created_at: string | null;
          finance: Json | null;
          gifts: Json | null;
          import_hash: string | null;
          invitations: Json | null;
          owner_id: string | null;
          people: Json | null;
          revision: number | null;
          suppliers: Json | null;
          updated_at: string | null;
          wedding: Json | null;
          wedding_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          finance?: Json | null;
          gifts?: Json | null;
          import_hash?: string | null;
          invitations?: Json | null;
          owner_id?: string | null;
          people?: Json | null;
          revision?: number | null;
          suppliers?: Json | null;
          updated_at?: string | null;
          wedding?: Json | null;
          wedding_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          finance?: Json | null;
          gifts?: Json | null;
          import_hash?: string | null;
          invitations?: Json | null;
          owner_id?: string | null;
          people?: Json | null;
          revision?: number | null;
          suppliers?: Json | null;
          updated_at?: string | null;
          wedding?: Json | null;
          wedding_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'wedding_workspaces_wedding_id_fkey';
            columns: ['wedding_id'];
            isOneToOne: true;
            referencedRelation: 'casamentos';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      administration_accounts: {
        Args: { p_page?: number; p_query?: string };
        Returns: Json;
      };
      delete_workspace: { Args: { p_id: string }; Returns: undefined };
      import_workspace: {
        Args: { p_data: Json; p_hash: string; p_id: string };
        Returns: number;
      };
      respond_invitation: {
        Args: { p_answers: Json; p_token: string };
        Returns: undefined;
      };
      save_preference: {
        Args: { p_key: string; p_value: Json };
        Returns: undefined;
      };
      save_workspace: {
        Args: {
          p_data: Json;
          p_id: string;
          p_metadata_only?: boolean;
          p_version: number;
        };
        Returns: number;
      };
      view_invitation: { Args: { p_token: string }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
