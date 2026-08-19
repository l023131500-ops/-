/* Supabase configuration for the Kupot Holim leads system.
   The anon key is a public, publishable key — safe to include in client code.
   Row Level Security policies on the kupot_leads table control access. */
window.KUPOT_SUPABASE = {
  url: "https://csjekrvukbdznetsrodj.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzamVrcnZ1a2Jkem5ldHNyb2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDM2NTIsImV4cCI6MjA5NTk3OTY1Mn0.L904gM3-_J7k7WvEDMhR53nzKRND-M_odJtJEePopuk",
  table: "kupot_leads"
};

