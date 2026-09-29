/*
 * Copyright 2026 Amerigo Di Maria
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { createMockSupabaseClient, mockStoreInstance } from '@/lib/mock-store';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
// Enable showcase demo mode by default if VITE_DEMO_MODE is true or not explicitly disabled
const FORCE_DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false';

const isMissingCredentials = 
  !SUPABASE_URL || 
  !SUPABASE_PUBLISHABLE_KEY || 
  SUPABASE_URL.includes("placeholder") || 
  SUPABASE_URL === "";

export const isDemoMode = FORCE_DEMO_MODE || isMissingCredentials;

export const supabase: any = isDemoMode
  ? createMockSupabaseClient()
  : createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    });

export const resetDemoData = () => {
  mockStoreInstance.reset();
};