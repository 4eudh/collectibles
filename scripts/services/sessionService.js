import { getSupabaseClient } from './supabaseClient.js';
import { logger } from '../core/logger.js';

export function createSessionService(store, events) {
  const supabase = getSupabaseClient();

  async function hydrate() {
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      store.patch({ session: data.session }, { type: 'session:init' });
      events.emit('session:changed', data.session);
    }
    supabase.auth.onAuthStateChange((_event, session) => {
      store.patch({ session }, { type: 'session:update' });
      events.emit('session:changed', session);
    });
  }

  async function signIn(email, password) {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    logger.log('auth', 'Signed in user', { userId: data.user.id });
    return data;
  }

  async function signUp(email, password, metadata = {}) {
    const { error, data } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
    if (error) throw error;
    logger.log('auth', 'Registered user', { userId: data.user?.id });
    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    store.reset();
    events.emit('session:changed', null);
  }

  return { hydrate, signIn, signUp, signOut };
}
