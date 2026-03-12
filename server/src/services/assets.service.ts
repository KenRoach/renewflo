import { SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { assetsRepository } from '../repositories/assets.repository.js';
import { NotFoundError, BadRequestError } from '../lib/errors.js';
import type { ListAssetsQuery, UpdateAssetInput } from '../schemas/assets.schema.js';

function addDaysLeft(asset: any) {
  if (!asset) return asset;
  const diffMs = new Date(asset.warranty_end).getTime() - Date.now();
  return { ...asset, daysLeft: Math.ceil(diffMs / (1000 * 60 * 60 * 24)) };
}

export const assetsService = {
  async list(client: SupabaseClient, params: ListAssetsQuery) {
    const result = await assetsRepository.list(client, params);
    return { ...result, data: result.data.map(addDaysLeft) };
  },
  async getById(client: SupabaseClient, id: string) {
    const asset = await assetsRepository.getById(client, id);
    if (!asset) throw new NotFoundError('Asset', id);
    return addDaysLeft(asset);
  },
  async update(client: SupabaseClient, id: string, input: UpdateAssetInput) {
    const existing = await assetsRepository.getById(client, id);
    if (!existing) throw new NotFoundError('Asset', id);
    return addDaysLeft(await assetsRepository.update(client, id, input));
  },
  async remove(client: SupabaseClient, id: string) {
    const existing = await assetsRepository.getById(client, id);
    if (!existing) throw new NotFoundError('Asset', id);
    await assetsRepository.remove(client, id);
  },
  async importCsv(client: SupabaseClient, orgId: string, userId: string, fileName: string, buffer: Buffer) {
    const batch = await assetsRepository.createBatch(client, orgId, userId, fileName);
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      if (rows.length === 0) throw new BadRequestError('CSV file is empty');
      const errors: string[] = [];
      rows.forEach((row, i) => {
        if (!row.brand) errors.push(`Row ${i + 1}: missing brand`);
        if (!row.model) errors.push(`Row ${i + 1}: missing model`);
        if (!row.serial) errors.push(`Row ${i + 1}: missing serial`);
        if (!row.warranty_end) errors.push(`Row ${i + 1}: missing warranty_end`);
      });
      if (errors.length > 0) {
        await assetsRepository.updateBatch(client, batch.id, { status: 'failed', row_count: rows.length, error_summary: { errors: errors.slice(0, 50) } });
        throw new BadRequestError(`Validation failed: ${errors.length} error(s). First: ${errors[0]}`);
      }
      const inserted = await assetsRepository.bulkInsert(client, orgId, batch.id, rows);
      await assetsRepository.updateBatch(client, batch.id, { status: 'completed', row_count: inserted?.length ?? rows.length });
      return { batchId: batch.id, imported: inserted?.length ?? rows.length, total: rows.length };
    } catch (err) {
      if (err instanceof BadRequestError) throw err;
      await assetsRepository.updateBatch(client, batch.id, { status: 'failed', error_summary: { error: (err as Error).message } });
      throw err;
    }
  },
};
