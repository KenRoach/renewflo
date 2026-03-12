import { adminClient } from '../supabase.js';
import { BadRequestError } from '../lib/errors.js';
import type { SignupInput, LoginInput } from '../schemas/auth.schema.js';

export const authService = {
  async signup(input: SignupInput) {
    const { data: org, error: orgError } = await adminClient
      .from('core_organization')
      .insert({ name: input.orgName, type: input.orgType, country: input.country ?? null })
      .select()
      .single();
    if (orgError) throw new BadRequestError(`Failed to create organization: ${orgError.message}`);

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { org_id: org.id, full_name: input.fullName },
    });
    if (authError) {
      await adminClient.from('core_organization').delete().eq('id', org.id);
      throw new BadRequestError(`Failed to create user: ${authError.message}`);
    }

    const { error: profileError } = await adminClient
      .from('core_user')
      .insert({ id: authData.user.id, org_id: org.id, email: input.email, full_name: input.fullName, role: 'admin' });
    if (profileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      await adminClient.from('core_organization').delete().eq('id', org.id);
      throw new BadRequestError(`Failed to create profile: ${profileError.message}`);
    }

    const { data: session, error: signInError } = await adminClient.auth.signInWithPassword({
      email: input.email, password: input.password,
    });
    if (signInError) throw new BadRequestError('Account created but login failed');

    return {
      user: { id: authData.user.id, email: input.email, fullName: input.fullName },
      org: { id: org.id, name: org.name, type: org.type },
      session: { accessToken: session.session!.access_token, refreshToken: session.session!.refresh_token },
    };
  },

  async login(input: LoginInput) {
    const { data, error } = await adminClient.auth.signInWithPassword({
      email: input.email, password: input.password,
    });
    if (error) throw new BadRequestError('Invalid email or password');

    const { data: profile } = await adminClient
      .from('core_user')
      .select('org_id, role, full_name, core_organization!inner(name, type)')
      .eq('id', data.user.id)
      .single();

    return {
      user: { id: data.user.id, email: data.user.email!, fullName: profile?.full_name, role: profile?.role },
      org: { id: profile?.org_id, name: (profile as any)?.core_organization?.name, type: (profile as any)?.core_organization?.type },
      session: { accessToken: data.session.access_token, refreshToken: data.session.refresh_token },
    };
  },

  async forgotPassword(email: string) {
    const { error } = await adminClient.auth.resetPasswordForEmail(email);
    if (error) throw new BadRequestError(error.message);
    return { message: 'Password reset email sent' };
  },
};
