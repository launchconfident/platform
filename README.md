# Launch Confident – Plattform

Kursplattform för Launch Confident. React + Supabase + Vercel.

## Snabbstart

### 1. Supabase

1. Skapa ett nytt projekt på [supabase.com](https://supabase.com)
2. Gå till **SQL Editor** och kör hela `supabase-schema.sql`
3. Gå till **Authentication → URL Configuration** och lägg till:
   - Site URL: `http://localhost:5173` (dev) och din Vercel-URL (prod)
   - Redirect URLs: samma

### 2. Miljövariabler

Kopiera `.env.example` till `.env` och fyll i dina Supabase-uppgifter:

```bash
cp .env.example .env
```

Hitta värdena i Supabase under **Settings → API**:
```
VITE_SUPABASE_URL=https://xxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Kör lokalt

```bash
npm install
npm run dev
```

Öppna [http://localhost:5173](http://localhost:5173)

## Deploy till Vercel

1. Pusha koden till GitHub
2. Importera repot i [vercel.com](https://vercel.com)
3. Lägg till miljövariablerna i Vercel (Settings → Environment Variables)
4. Deploy!

## Göra Emma till admin

Kör i Supabase SQL Editor efter att Emma skapat sitt konto:

```sql
update profiles set is_admin = true where id = (
  select id from auth.users where email = 'emma@launchconfident.se'
);
```

## Lägga till checklistpunkter

Gå till **Supabase → Table Editor → checklist_items** och lägg till rader manuellt, eller kör SQL. Varje punkt behöver:
- `section_id` – vilken sektion den tillhör
- `label` – punktens text
- `description` – valfri hjälptext (visas expanderbar)
- `points` – poäng (default 10)
- `order` – sorteringsordning

## ThriveCart-integration

När en kund köper genereras en registreringslänk via:
1. **Manuellt**: Logga in som admin på `/admin` och generera en länk
2. **Webhook (framtida)**: ThriveCart kan posta till en Supabase Edge Function som skapar token automatiskt

## Struktur

```
src/
  context/    AuthContext
  lib/        supabase.js, pdfExport.js, nanoid.js
  components/ Layout, Modal
  pages/      Login, Register, Dashboard, Product, Audit, Settings, Admin
```
