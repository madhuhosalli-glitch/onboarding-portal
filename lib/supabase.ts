import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://auggyieyigwguxceptcn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Z2d5aWV5aWd3Z3V4Y2VwdGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzIzODEsImV4cCI6MjA5MjM0ODM4MX0.wI4Y6lIjw37-9MzGekBvfdTHVEc2crLMy-uz2IEqp6s";

export const supabase = createClient(supabaseUrl, supabaseKey);