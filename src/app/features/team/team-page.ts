import { MatMenuModule } from '@angular/material/menu';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { SuppliersService } from '../../core/services/suppliers';
import {
  Professional,
  WorkShift,
  professionalStatuses,
  shiftStatuses,
} from '../../core/models/suppliers';
import { money } from '../../core/utils/finance';
import { formatCalendarDate } from '../../core/utils/wedding';
import { taskLines, shiftHours } from '../../core/utils/suppliers';
import { downloadCsv } from '../../core/utils/csv-download';
import { CollectionTable, searchText } from '../../shared/components/collection-table';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { NoticeDialog } from '../../shared/components/notice-dialog';
import { DatePicker } from '../../shared/components/date-picker';
import { SupplierEntityDialog } from '../suppliers/entity-dialog';
import { ShiftDialog, PresenceDialog } from './shift-dialog';
@Component({
  selector: 'oc-team-page',
  imports: [MatMenuModule, FormsModule, RouterLink, CollectionTable, DatePicker],
  templateUrl: './team-page.html',
})
export class TeamPage {
  store = inject(SuppliersService);
  dialogs = inject(MatDialog);
  params = toSignal(inject(ActivatedRoute).paramMap);
  section = computed(() => this.params()?.get('section') ?? 'profissionais');
  query = signal('');
  status = signal('');
  role = signal('');
  from = signal('');
  to = signal('');
  selected = signal(new Set<string>());
  expandedShift = signal('');
  message = signal('');
  error = signal('');
  statuses = computed(() =>
    Object.entries(this.section() === 'escalas' ? shiftStatuses : professionalStatuses),
  );
  roles = computed(() => this.store.roleCounts().map(([name]) => name));
  professionalName = (id: string) =>
    this.store.ledger()?.professionals.find((p) => p.id === id)?.name ?? 'Profissional removido';
  supplierName = (id: string) => this.store.supplierName(id);
  professionalStatuses = professionalStatuses;
  shiftStatuses = shiftStatuses;
  money = money;
  tasks = taskLines;
  toSet = (ids: string[]) => new Set(ids);
  selectedIds = computed(() => [...this.selected()]);
  professionals = computed(() =>
    (this.store.ledger()?.professionals ?? [])
      .filter(
        (p) =>
          (!this.status() || p.status === this.status()) &&
          (!this.role() || p.role === this.role()) &&
          searchText(
            [
              p.name,
              p.role,
              p.company,
              this.supplierName(p.supplierId),
              p.phone,
              p.whatsapp,
              p.email,
            ].join(' '),
          ).includes(searchText(this.query())),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );
  shifts = computed(() =>
    (this.store.ledger()?.shifts ?? [])
      .filter(
        (s) =>
          (!this.status() || s.status === this.status()) &&
          (!this.from() || s.end.slice(0, 10) >= this.from()) &&
          (!this.to() || s.start.slice(0, 10) <= this.to()) &&
          searchText(
            this.professionalName(s.professionalId) + ' ' + s.location + ' ' + s.tasks,
          ).includes(searchText(this.query())),
      )
      .sort((a, b) => a.start.localeCompare(b.start)),
  );
  professionalRows = computed(() =>
    this.professionals().map((p) => ({
      id: p.id,
      record: p,
      cells: [
        p.name,
        p.role,
        this.supplierName(p.supplierId) || p.company,
        p.whatsapp || p.phone,
        professionalStatuses[p.status],
        money(p.agreedCents),
        this.payment(p),
        this.nextShift(p.id),
      ],
    })),
  );
  shiftRows = computed(() =>
    this.shifts().map((s) => ({
      id: s.id,
      record: s,
      cells: [
        this.professionalName(s.professionalId),
        this.datetime(s.start),
        this.datetime(s.end),
        shiftHours(s).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' h',
        s.location,
        shiftStatuses[s.status],
        this.datetime(s.arrivedAt),
        this.datetime(s.leftAt),
        `${s.completedTasks.length}/${taskLines(s.tasks).length}`,
      ],
    })),
  );
  roleRows = computed(() =>
    this.store.roleCounts().map(([role, count]) => ({
      id: role,
      record: role,
      cells: [
        role,
        String(count),
        String(
          (this.store.ledger()?.professionals ?? []).filter(
            (p) => p.role === role && p.status === 'confirmed',
          ).length,
        ),
      ],
    })),
  );
  currentShift = computed(() =>
    this.store.ledger()?.shifts.find((s) => s.id === this.expandedShift()),
  );
  constructor() {
    effect(() => {
      this.section();
      this.store.weddings.active()?.id;
      this.clear();
      this.selected.set(new Set());
      this.expandedShift.set('');
      this.message.set('');
      this.error.set('');
    });
  }
  datetime(value: string) {
    return value
      ? formatCalendarDate(value.slice(0, 10)) + ' · ' + value.slice(11)
      : 'Não registrado';
  }
  nextShift(id: string) {
    const shift = (this.store.ledger()?.shifts ?? [])
      .filter((s) => s.professionalId === id && !['cancelled', 'completed'].includes(s.status))
      .sort((a, b) => a.start.localeCompare(b.start))[0];
    return shift ? this.datetime(shift.start) : 'Sem escala pendente';
  }
  payment(p: Professional) {
    if (p.paymentMode === 'supplier') return 'No contrato do fornecedor';
    if (p.paymentMode === 'undecided') return 'A definir';
    return this.store.paymentStatus(p.expenseId);
  }
  async edit(p?: Professional) {
    const result = await firstValueFrom(
      this.dialogs
        .open(SupplierEntityDialog, {
          width: '800px',
          maxWidth: '96vw',
          data: { kind: 'professional', value: p },
        })
        .afterClosed(),
    );
    if (result) this.message.set('Profissional salvo com sucesso.');
  }
  async shift(value?: WorkShift, professionalId?: string, professionalIds?: string[]) {
    const result = await firstValueFrom(
      this.dialogs
        .open(ShiftDialog, {
          width: '850px',
          maxWidth: '96vw',
          data: { value, professionalId, professionalIds },
        })
        .afterClosed(),
    );
    if (result) {
      this.message.set('Escala(s) salva(s) com sucesso.');
      this.selected.set(new Set());
    }
  }
  async presence(s: WorkShift, kind: 'arrival' | 'departure') {
    const result = await firstValueFrom(
      this.dialogs
        .open(PresenceDialog, {
          width: '600px',
          maxWidth: '96vw',
          data: {
            id: s.id,
            weddingId: s.weddingId,
            kind,
            name: this.professionalName(s.professionalId),
          },
        })
        .afterClosed(),
    );
    if (result)
      this.message.set(
        kind === 'arrival' ? 'Chegada registrada.' : 'Saída registrada e escala concluída.',
      );
  }
  details(p: Professional) {
    this.dialogs.open(NoticeDialog, {
      width: '650px',
      maxWidth: '96vw',
      data: {
        title: p.name,
        message: `${p.role} · ${professionalStatuses[p.status]}\nEmpresa: ${this.supplierName(p.supplierId) || p.company || 'Não informada'}\nTelefone: ${p.phone || 'Não informado'}\nWhatsApp: ${p.whatsapp || 'Não informado'}\nE-mail: ${p.email || 'Não informado'}\nValor combinado: ${money(p.agreedCents)}\nPagamento: ${this.payment(p)}\nResponsabilidades: ${p.responsibilities || 'Não informadas'}\nObservações: ${p.notes || 'Nenhuma'}`,
      },
    });
  }
  async run(action: () => Promise<unknown>, message: string) {
    this.error.set('');
    this.message.set('');
    try {
      await action();
      this.message.set(message);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Não foi possível concluir.';
      this.error.set(message);
      this.dialogs.open(NoticeDialog, {
        role: 'alertdialog',
        width: '560px',
        maxWidth: '96vw',
        data: { title: 'Não foi possível concluir', message },
      });
    }
  }
  async remove(kind: 'professional' | 'shift', id: string, name: string) {
    const weddingId = this.store.weddings.active()!.id;
    const yes = await firstValueFrom(
      this.dialogs
        .open(ConfirmDialog, {
          data: {
            title: 'Excluir cadastro?',
            message: `Excluir ${name}? Vínculos e registros de presença precisam ser preservados.`,
          },
        })
        .afterClosed(),
    );
    if (yes)
      await this.run(
        () =>
          kind === 'professional'
            ? this.store.removeProfessional(id, weddingId)
            : this.store.removeShift(id, weddingId),
        'Cadastro excluído.',
      );
  }
  async cancel(s: WorkShift) {
    const yes = await firstValueFrom(
      this.dialogs
        .open(ConfirmDialog, {
          data: {
            title: 'Cancelar escala?',
            message: `A escala de ${this.professionalName(s.professionalId)} ficará no histórico e deixará de reservar o horário.`,
          },
        })
        .afterClosed(),
    );
    if (yes)
      await this.run(
        () => this.store.saveShift({ ...s, status: 'cancelled' }),
        'Escala cancelada.',
      );
  }
  async task(s: WorkShift, task: string, done: boolean) {
    await this.run(() => this.store.task(s.id, s.weddingId, task, done), 'Tarefa atualizada.');
  }
  clear() {
    this.query.set('');
    this.status.set('');
    this.role.set('');
    this.from.set('');
    this.to.set('');
  }
  export() {
    downloadCsv(
      this.section() === 'escalas'
        ? [
            'Profissional',
            'Início',
            'Término',
            'Duração',
            'Local',
            'Situação',
            'Chegada',
            'Saída',
            'Tarefas concluídas',
          ]
        : [
            'Nome',
            'Função',
            'Empresa',
            'Contato',
            'Situação',
            'Valor combinado',
            'Pagamento',
            'Próxima escala',
          ],
      (this.section() === 'escalas' ? this.shiftRows() : this.professionalRows()).map(
        (r) => r.cells,
      ),
      `equipe-${this.section()}.csv`,
    );
  }
}
