import { createClient } from
    "https://esm.sh/@supabase/supabase-js@2";

// Replace these values with your own
// Supabase project credentials.

const supabaseUrl = "https://jhvvxcgkaoqtwkvhbqhc.supabase.co";

const supabasePublishableKey =
    "sb_publishable_R7XTyfcurtmdlgES_TO4kg_ylHtBdRN";

// Create the Supabase connection.

export const supabase = createClient(
    supabaseUrl,
    supabasePublishableKey
);