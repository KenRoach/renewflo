import { adminClient } from '../supabase.js';

export const usersRepository = {
  async listByOrg(orgId: string) {
    const { data, error } = await adminClient.from('core_user').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async listAll() {
    const { data, error } = await adminClient.from('core_user').select('*, core_organization(name, type)').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async update(id: string, data: Record<string, any>) {
    const { data: user, error } = await adminClient.from('core_user').update(data).eq('id', id).select().single();
    if (error) throw error;
    return user;
  },
  async deactivate(id: string) { return usersRepository.update(id, { active: false }); },
};
