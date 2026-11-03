import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CollectionName } from '../types/storage';
import { Identifiable, Repository, BrowserRepository } from './repository';
import { TABLE_MAP, GLOBAL_TABLES, fromDatabaseRow, toDatabaseRow } from './relationalMappers';

export class SupabaseRepository<T extends Identifiable> implements Repository<T> {
  private readonly collection: CollectionName;
  private readonly tableName: string;
  private readonly fallbackRepo: BrowserRepository<T>;
  private isTableMissing = false;
  private clinicId = 'CLN-001';

  constructor(collection: CollectionName, clinicId = 'CLN-001') {
    this.collection = collection;
    this.tableName = TABLE_MAP[collection] || (collection as string);
    this.fallbackRepo = new BrowserRepository<T>(collection);
    this.clinicId = clinicId;
  }

  public setClinicId(clinicId: string): void {
    this.clinicId = clinicId;
  }

  async list(): Promise<T[]> {
    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return this.fallbackRepo.list();
    }

    try {
      let query = supabase.from(this.tableName).select('*');

      // Filter by clinic_id if the table is clinic-scoped
      if (!GLOBAL_TABLES.has(this.tableName) && this.tableName !== 'accounts') {
        query = query.eq('clinic_id', this.clinicId);
      } else if (this.tableName === 'accounts') {
        query = query.or(`clinic_id.eq.${this.clinicId},clinic_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        if (error.code === 'PGRST205') {
          this.isTableMissing = true;
        }
        return this.fallbackRepo.list();
      }

      const items = (data || [])
        .map((row: any) => fromDatabaseRow<T>(this.collection, row))
        .filter(Boolean);

      // Keep local repository in sync
      if (items.length > 0) {
        await this.fallbackRepo.replaceAll(items);
        return items;
      }

      // If remote table has 0 items but local has items (e.g. initial load before seed), seed remote!
      const localItems = await this.fallbackRepo.list();
      if (localItems.length > 0) {
        await this.seedRemote(localItems);
        return localItems;
      }

      return [];
    } catch {
      return this.fallbackRepo.list();
    }
  }

  async get(id: string): Promise<T | null> {
    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return this.fallbackRepo.get(id);
    }

    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        return this.fallbackRepo.get(id);
      }

      return fromDatabaseRow<T>(this.collection, data);
    } catch {
      return this.fallbackRepo.get(id);
    }
  }

  async create(item: T): Promise<T> {
    await this.fallbackRepo.create(item);

    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return item;
    }

    try {
      const row = toDatabaseRow(this.collection, item, this.clinicId);
      const { error } = await supabase.from(this.tableName).upsert(row);
      if (error && error.code === 'PGRST205') {
        this.isTableMissing = true;
      }
    } catch {
      // Local fallback preserves data
    }

    return item;
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const updated = await this.fallbackRepo.update(id, updates);

    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return updated;
    }

    try {
      const row = toDatabaseRow(this.collection, updated, this.clinicId);
      const { error } = await supabase.from(this.tableName).update(row).eq('id', id);
      if (error && error.code === 'PGRST205') {
        this.isTableMissing = true;
      }
    } catch {
      // Local fallback preserves data
    }

    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const removed = await this.fallbackRepo.remove(id);

    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return removed;
    }

    try {
      const { error } = await supabase.from(this.tableName).delete().eq('id', id);
      if (error && error.code === 'PGRST205') {
        this.isTableMissing = true;
      }
    } catch {
      // Local fallback preserves data
    }

    return removed;
  }

  async replaceAll(items: T[]): Promise<void> {
    await this.fallbackRepo.replaceAll(items);

    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return;
    }

    try {
      if (items.length > 0) {
        const rows = items.map((item) => toDatabaseRow(this.collection, item, this.clinicId));
        await supabase.from(this.tableName).upsert(rows);
      }
    } catch {
      // Local fallback preserves data
    }
  }

  async count(): Promise<number> {
    const items = await this.list();
    return items.length;
  }

  async clear(): Promise<void> {
    await this.fallbackRepo.clear();

    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return;
    }

    try {
      await supabase.from(this.tableName).delete().eq('clinic_id', this.clinicId);
    } catch {
      // Local fallback preserves data
    }
  }

  private async seedRemote(items: T[]): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const rows = items.map((item) => toDatabaseRow(this.collection, item, this.clinicId));
      await supabase.from(this.tableName).upsert(rows);
    } catch {
      // Ignore
    }
  }
}
