import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Wedding } from '../models/models';
import { FinanceLedger } from '../models/finance';
import { SuppliersLedger } from '../models/suppliers';
import { PeopleLedger } from '../models/people';
import { InvitationLedger, IssuedInvitation, RsvpAnswer } from '../models/invitations';
import { GuestStatus } from '../models/people';
import { GiftList, validateGifts } from '../models/gifts';
import { validateLedger } from '../utils/finance';
import { validatePeople } from '../utils/people';
import { validateInvitations } from '../utils/invitations';
import { validateSuppliers } from '../utils/suppliers';
import { validateWedding } from '../utils/wedding';

export const cloudEnabled = environment.cloud;
export type CloudStore =
  'weddings' | 'finance' | 'people' | 'suppliers' | 'invitations' | 'gifts' | 'preferences';
export interface Workspace {
  wedding: Wedding;
  finance: FinanceLedger | null;
  people: PeopleLedger | null;
  suppliers: SuppliersLedger | null;
  invitations: InvitationLedger | null;
  gifts: GiftList | null;
}
let singleton: SupabaseClient | undefined;
export function cloudClient(): SupabaseClient {
  if (!cloudEnabled) throw new Error('Supabase indisponível no ambiente de testes locais.');
  return (singleton ??= createClient(environment.url, environment.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }));
}
export function cloudError(error: { message?: string; code?: string } | null) {
  if (!error) return;
  if (error.code === '40001')
    throw new Error(
      'Os dados mudaram em outra aba ou aparelho. Atualize a página e tente novamente.',
    );
  if (error.code === '42501')
    throw new Error('Você não tem acesso a este cadastro. Entre novamente na sua conta.');
  throw new Error(
    error.message || 'Não foi possível salvar no Supabase. Confira sua conexão e tente novamente.',
  );
}
export function stableJson(value: any): string {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .filter((k) => value[k] !== undefined)
        .map((k) => JSON.stringify(k) + ':' + stableJson(value[k]))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
export class CloudBackend {
  private files = new Map<string, string>();
  async user() {
    const { data, error } = await cloudClient().auth.getSession();
    cloudError(error);
    if (!data.session?.user) throw new Error('Entre na sua conta para continuar.');
    return data.session.user;
  }
  private async assertUser(id: string) {
    if ((await this.user()).id !== id) throw new Error('A conta mudou. Atualize a página.');
  }
  async hydrate(value: any): Promise<any> {
    if (value?.__oc_file) {
      const { bucket, path, type } = value.__oc_file;
      const key = bucket + '/' + path;
      if (this.files.has(key)) return this.files.get(key);
      const { data, error } = await cloudClient().storage.from(bucket).download(path);
      cloudError(error);
      const result = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Não foi possível carregar o anexo.'));
        reader.readAsDataURL(new Blob([data!], { type }));
      });
      this.files.set(key, result);
      return result;
    }
    if (Array.isArray(value)) return Promise.all(value.map((v) => this.hydrate(v)));
    if (value && typeof value === 'object')
      return Object.fromEntries(
        await Promise.all(Object.entries(value).map(async ([k, v]) => [k, await this.hydrate(v)])),
      );
    return value;
  }
  async externalize(value: any, userId: string, weddingId: string): Promise<any> {
    if (
      typeof value === 'string' &&
      /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(value)
    ) {
      const blob = await (await fetch(value)).blob();
      const bucket = blob.type === 'application/pdf' ? 'wedding-documents' : 'wedding-images';
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())),
        (n) => n.toString(16).padStart(2, '0'),
      ).join('');
      const path = `${userId}/${weddingId}/${hash}.${blob.type.split('/')[1]}`;
      const key = bucket + '/' + path;
      if (!this.files.has(key)) {
        const { error } = await cloudClient()
          .storage.from(bucket)
          .upload(path, blob, { upsert: false, contentType: blob.type });
        if (
          error &&
          !['409', 'Duplicate'].includes(String((error as any).statusCode)) &&
          !/already exists/i.test(error.message)
        )
          cloudError(error);
        this.files.set(key, value);
      }
      return { __oc_file: { bucket, path, type: blob.type } };
    }
    if (Array.isArray(value)) {
      const values = [];
      for (const v of value) values.push(await this.externalize(v, userId, weddingId));
      return values;
    }
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      // Serialize uploads to avoid opening hundreds of simultaneous requests during import.
      for (const [key, v] of Object.entries(value))
        result[key] = await this.externalize(v, userId, weddingId);
      return result;
    }
    return value;
  }
  async list<T>(store: CloudStore): Promise<T[]> {
    const user = await this.user();
    if (store === 'preferences') {
      const { data, error } = await cloudClient()
        .from('preferencias_usuario')
        .select('data:dados')
        .eq('id', user.id)
        .maybeSingle();
      cloudError(error);
      await this.assertUser(user.id);
      return Object.values(data?.data ?? {}) as T[];
    }
    const column = store === 'weddings' ? 'wedding' : store;
    const colunaBanco = {
      wedding: 'casamento',
      finance: 'financeiro',
      people: 'pessoas',
      suppliers: 'fornecedores',
      invitations: 'convites',
      gifts: 'presentes',
    }[column];
    const { data, error } = await cloudClient()
      .from('espacos_casamento')
      .select(`${column}:${colunaBanco}`)
      .order('criado_em');
    cloudError(error);
    const result = await this.hydrate((data ?? []).map((r: any) => r[column]).filter(Boolean));
    await this.assertUser(user.id);
    return result;
  }
  async read(id: string) {
    const { data, error } = await cloudClient()
      .from('espacos_casamento')
      .select(
        'wedding:casamento,finance:financeiro,people:pessoas,suppliers:fornecedores,invitations:convites,gifts:presentes,revision:revisao',
      )
      .eq('casamento_id', id)
      .maybeSingle();
    cloudError(error);
    return data
      ? { revision: Number(data.revision), data: (await this.hydrate(data)) as Workspace }
      : null;
  }
  async transact<T>(
    id: string,
    action: (workspace: Workspace) => T,
    metadataOnly = false,
    create?: Wedding,
  ): Promise<T> {
    const user = await this.user();
    const current = await this.read(id);
    if (!current && !create)
      throw new Error('Casamento não encontrado ou excluído. Atualize os dados.');
    const state: Workspace = current?.data ?? {
      wedding: create!,
      finance: null,
      people: null,
      suppliers: null,
      invitations: null,
      gifts: null,
    };
    if (state.wedding.archived && !metadataOnly)
      throw new Error('Este casamento está arquivado. Restaure antes de alterar.');
    const result = action(state);
    if (state.finance) validateLedger(state.finance);
    if (state.people) validatePeople(state.people);
    if (state.invitations) validateInvitations(state.invitations);
    if (state.suppliers && state.finance) validateSuppliers(state.suppliers, state.finance);
    if (state.gifts) validateGifts(state.gifts);
    const serialized = await this.externalize(state, user.id, id);
    await this.assertUser(user.id);
    const { error } = await cloudClient().rpc('save_workspace', {
      p_id: id,
      p_version: current?.revision ?? null,
      p_data: serialized,
      p_metadata_only: metadataOnly,
    });
    cloudError(error);
    await this.assertUser(user.id);
    return result;
  }
  async update<T extends { id: string }>(
    store: CloudStore,
    id: string,
    transform: (old: T | undefined) => T,
  ): Promise<T> {
    if (store === 'preferences') {
      const previous = (await this.list<T>('preferences')).find((p) => p.id === id);
      const value = transform(previous);
      const { error } = await cloudClient().rpc('save_preference', { p_key: id, p_value: value });
      cloudError(error);
      return value;
    }
    if (store === 'weddings') {
      const old = await this.read(id);
      const value = transform(old?.data.wedding as T | undefined);
      return this.transact(
        id,
        (state) => {
          state.wedding = value as unknown as Wedding;
          return value;
        },
        true,
        value as unknown as Wedding,
      );
    }
    return this.transact(id, (state) => {
      const value = transform((state as any)[store] ?? undefined);
      (state as any)[store] = value;
      return value;
    });
  }
  save<T extends { id: string }>(store: CloudStore, value: T) {
    return this.update(store, value.id, () => value).then(() => undefined);
  }
  async remove(store: CloudStore, id: string) {
    if (store === 'weddings') return this.deleteWedding(id);
    if (store === 'preferences') {
      const { error } = await cloudClient().rpc('save_preference', { p_key: id, p_value: null });
      cloudError(error);
      return;
    }
    throw new Error('Exclua o cadastro pela ação correspondente no sistema.');
  }
  async deleteWedding(id: string) {
    const user = await this.user();
    const { error } = await cloudClient().rpc('delete_workspace', { p_id: id });
    cloudError(error);
    for (const bucket of ['wedding-images', 'wedding-documents']) {
      const prefix = `${user.id}/${id}`;
      // Remove page zero repeatedly because each batch is removed from the listing.
      while (true) {
        const { data, error } = await cloudClient()
          .storage.from(bucket)
          .list(prefix, { limit: 100 });
        cloudError(error);
        if (!data?.length) break;
        const result = await cloudClient()
          .storage.from(bucket)
          .remove(data.map((f) => prefix + '/' + f.name));
        cloudError(result.error);
      }
    }
    this.files.clear();
  }
  async importWorkspace(state: Workspace, hash: string) {
    const user = await this.user();
    const invalidWedding = validateWedding(state.wedding);
    if (invalidWedding) throw new Error(invalidWedding);
    if (state.finance) validateLedger(state.finance);
    if (state.people) validatePeople(state.people);
    if (state.invitations) validateInvitations(state.invitations);
    if (state.gifts) validateGifts(state.gifts);
    if (state.suppliers && state.finance) validateSuppliers(state.suppliers, state.finance);
    const encoded = await this.externalize(state, user.id, state.wedding.id);
    const { data, error } = await cloudClient().rpc('import_workspace', {
      p_id: state.wedding.id,
      p_hash: hash,
      p_data: encoded,
    });
    cloudError(error);
    const saved = await this.read(state.wedding.id);
    if (!saved)
      throw new Error('A importação não pôde ser verificada. O backup local foi preservado.');
    const persisted = await this.externalize(saved.data, user.id, state.wedding.id);
    // Compare each domain independently; database timestamps/revision are outside these fields.
    for (const field of [
      'wedding',
      'finance',
      'people',
      'invitations',
      'suppliers',
      'gifts',
    ] as const) {
      if (stableJson(encoded[field] ?? null) !== stableJson(persisted[field] ?? null))
        throw new Error(
          'O servidor recebeu os dados, mas a conferência divergiu. Preserve o backup e atualize antes de repetir.',
        );
    }
    await this.assertUser(user.id);
    return data;
  }
}
export const cloudBackend = new CloudBackend();

export interface PublicInvitationView {
  issue: IssuedInvitation;
  members: { id: string; name: string; status: GuestStatus; diet: string }[];
}
export async function publicInvitation(token: string): Promise<PublicInvitationView> {
  const client = createClient(environment.url, environment.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'x-invitation-token': token } },
  });
  const { data, error } = await client.rpc('view_invitation', { p_token: token });
  cloudError(error);
  const photo = data?.issue?.design?.photo;
  if (photo?.__oc_file) {
    const file = photo.__oc_file;
    const { data: blob, error } = await client.storage.from(file.bucket).download(file.path);
    cloudError(error);
    data.issue.design.photo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob!);
    });
  }
  return data as PublicInvitationView;
}
export async function respondPublicInvitation(token: string, answers: RsvpAnswer[]) {
  const client = createClient(environment.url, environment.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await client.rpc('respond_invitation', { p_token: token, p_answers: answers });
  cloudError(error);
}
