import pg from 'pg'
const { Client } = pg

const REF = 'pwmuvmqackivindtbikf'
const PASS = 'qSalWTGhfaWRHD72'

const CONNECTION_STRINGS = [
  // Session-mode pooler (port 5432) — most reliable
  `postgresql://postgres.${REF}:${PASS}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${REF}:${PASS}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${REF}:${PASS}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${REF}:${PASS}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
  // Transaction-mode pooler (port 6543)
  `postgresql://postgres.${REF}:${PASS}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
]

const SQL = `
create table if not exists feeds (
  id text primary key,
  name text not null,
  config jsonb not null,
  last_fetched_at bigint,
  created_at bigint not null
);

create table if not exists feed_items (
  id bigint generated always as identity primary key,
  feed_id text not null references feeds(id) on delete cascade,
  data jsonb not null
);

create index if not exists feed_items_feed_id_idx on feed_items(feed_id);

alter table feeds disable row level security;
alter table feed_items disable row level security;
`

for (const connStr of CONNECTION_STRINGS) {
  const host = new URL(connStr).hostname
  process.stdout.write(`Trying ${host}... `)
  const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 8000, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    await client.query(SQL)
    await client.end()
    console.log('✓ Done!')
    process.exit(0)
  } catch (e) {
    console.log(`✗ ${e.message}`)
    try { await client.end() } catch {}
  }
}

console.error('\nAll connection attempts failed.')
process.exit(1)
