import { execFileSync } from 'node:child_process';

// Read names and targets only. Secret values need not be exportable to CI.
const project = encodeURIComponent(process.env.VERCEL_PROJECT_ID || '');
const team = encodeURIComponent(process.env.VERCEL_ORG_ID || '');
if (!project || !team) throw new Error('Vercel project identity is missing');
const response = JSON.parse(execFileSync('vercel', ['api',
  `/v10/projects/${project}/env?teamId=${team}&decrypt=false`, '--method', 'GET'], { encoding: 'utf8' }));
const configured = new Set(response.envs.filter((env) => env.target?.includes('production')).map((env) => env.key));
const required = [
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'CRON_SECRET',
  'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
  'PORTPRO_ACCESS_TOKEN', 'PORTPRO_WEBHOOK_SECRET', 'NEXT_PUBLIC_SITE_URL',
];
const missing = required.filter((key) => !configured.has(key));
if (missing.length) throw new Error(`Missing production configuration: ${missing.join(', ')}`);
console.log('Required production configuration is present; secret values were not logged.');
