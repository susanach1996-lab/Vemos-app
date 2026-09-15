import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://flqsgnkmtccakrqsuijn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GXvmuvk3tdGp1lm8bc-9zA_ZJv_TO1x';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
