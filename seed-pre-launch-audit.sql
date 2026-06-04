-- ============================================================
-- Seed: Pre-Launch Audit – riktiga checkpunkter
-- Kör detta i Supabase SQL Editor
-- OBS: Raderar befintliga sektioner och punkter för produkten
-- ============================================================

do $$
declare
  pid uuid;
  s1 uuid; s2 uuid; s3 uuid; s4 uuid; s5 uuid; s6 uuid;
begin

-- Hämta produktens id
select id into pid from products where slug = 'pre-launch-audit';

-- Rensa gamla sektioner (cascade raderar items också)
delete from product_sections where product_id = pid;

-- Uppdatera produktbeskrivningen
update products set
  description = 'Gå igenom varje steg för att säkerställa att allt fungerar som det ska innan riktiga kunder kommer in. Testa alltid både mobil och dator.'
where id = pid;

-- ── SEKTIONER ───────────────────────────────────────────────

insert into product_sections (id, product_id, title, "order") values
  (gen_random_uuid(), pid, '1. Foundation', 1),
  (gen_random_uuid(), pid, '2. Customer Journey', 2),
  (gen_random_uuid(), pid, '3. Checkout', 3),
  (gen_random_uuid(), pid, '4. Delivery', 4),
  (gen_random_uuid(), pid, '5. Legal / Trust', 5),
  (gen_random_uuid(), pid, '6. Final Rehearsal', 6);

select id into s1 from product_sections where product_id = pid and "order" = 1;
select id into s2 from product_sections where product_id = pid and "order" = 2;
select id into s3 from product_sections where product_id = pid and "order" = 3;
select id into s4 from product_sections where product_id = pid and "order" = 4;
select id into s5 from product_sections where product_id = pid and "order" = 5;
select id into s6 from product_sections where product_id = pid and "order" = 6;

-- ── 1. FOUNDATION ───────────────────────────────────────────

insert into checklist_items (section_id, label, description, points, "order") values
  (s1, 'Domän kopplad eller snygg underdomän (dittvarumarke.systeme.io)', '', 10, 1),
  (s1, 'Om du pekat om en domän, fungerar det?', '', 10, 2),
  (s1, 'Branding är konsekvent och on-brand', '', 10, 3),
  (s1, 'Logo och favicon är uppladdade och ser bra ut', '', 10, 4),
  (s1, 'Supportmail inställd? Avsändaremail korrekt på mailen?', '', 10, 5),
  (s1, 'Företagets organisationsnummer och adress angivet', '', 10, 6),
  (s1, 'Inställningar kring kvitto och moms konfigurerade?', '', 10, 7),
  (s1, 'Meta pixel installerad för annonsering?', '', 10, 8);

-- ── 2. CUSTOMER JOURNEY ─────────────────────────────────────

insert into checklist_items (section_id, label, description, points, "order") values
  (s2, 'Har säljsidan en bra och tydlig URL?', '', 10, 1),
  (s2, 'Laddar sidan snabbt på mobil?', '', 10, 2),
  (s2, 'Vad är det första man ser på mobil, och fungerar det?', '', 10, 3),
  (s2, 'Funkar alla knappar på sidan?', '', 10, 4),
  (s2, 'Är några knappar blockerade av t.ex. cookie-banner på mobil?', '', 10, 5),
  (s2, 'Är det logiskt och intuitivt var man ska klicka?', '', 10, 6),
  (s2, 'Finns det "dead ends" på sidan som saknar vidare väg?', '', 10, 7);

-- ── 3. CHECKOUT ─────────────────────────────────────────────

insert into checklist_items (section_id, label, description, points, "order") values
  (s3, 'Testköp fungerar korrekt (mobil + desktop)', '', 10, 1),
  (s3, 'Betalmetoder fungerar: kort, ev. Klarna, Apple Pay, Faktura?', '', 10, 2),
  (s3, 'Pris visas tydligt utan överraskningar', '', 10, 3),
  (s3, 'Checkout är lätt att läsa och förstå på mobil', '', 10, 4),
  (s3, 'CTA-knappar fungerar som de ska', '', 10, 5),
  (s3, 'Eventuella felmeddelanden är begripliga och hjälpsamma', '', 10, 6),
  (s3, 'Cookie-banner stör inte checkout-flödet', '', 10, 7);

-- ── 4. DELIVERY ─────────────────────────────────────────────

insert into checklist_items (section_id, label, description, points, "order") values
  (s4, 'Tacksida är rätt konfigurerad och funkar på desktop/mobil', '', 10, 1),
  (s4, 'Välkomstmail skickas direkt efter köp', '', 10, 2),
  (s4, 'Mail fungerar och ser bra ut på mobil + desktop', '', 10, 3),
  (s4, 'Login/inloggningsuppgifter fungerar för kunden', '', 10, 4),
  (s4, 'Tillgång till kurs/produkt är korrekt och omedelbar', '', 10, 5),
  (s4, 'Första modulen/innehållet är tillgängligt direkt', '', 10, 6),
  (s4, '"Vad händer nu"-information är tydlig', '', 10, 7),
  (s4, 'Kursportalen ser fin ut och är on brand', '', 10, 8),
  (s4, 'Information om kontakt för support finns synlig', '', 10, 9),
  (s4, 'Automationsmail fungerar och är på svenska i rätt tonalitet', '', 10, 10),
  (s4, 'Alla länkar i mailet och på sidan fungerar', '', 10, 11);

-- ── 5. LEGAL / TRUST ────────────────────────────────────────

insert into checklist_items (section_id, label, description, points, "order") values
  (s5, 'Integritetspolicy finns och är tydligt länkad', '', 10, 1),
  (s5, 'Cookies hanteras korrekt (rekommenderar CookieYes)', '', 10, 2),
  (s5, 'Köpvillkor är tydliga och tillgängliga', '', 10, 3),
  (s5, 'Kontaktinformation är synlig på sidan', '', 10, 4),
  (s5, 'Ångerrätt/returvillkor är tydliga (om tillämpligt)', '', 10, 5),
  (s5, 'GDPR-grundkrav är uppfyllda', '', 10, 6),
  (s5, 'Ingen vilseledande pris- eller produktinformation', '', 10, 7),
  (s5, 'Viktiga juridiska länkar fungerar (desktop + mobil)', '', 10, 8);

-- ── 6. FINAL REHEARSAL ──────────────────────────────────────

insert into checklist_items (section_id, label, description, points, "order") values
  (s6, 'Gå igenom hela flödet som kund från start', '', 10, 1),
  (s6, 'Starta från första klick (testa både mobil + desktop)', '', 10, 2),
  (s6, 'Genomför ett fullständigt testköp', '', 10, 3),
  (s6, 'Kolla alla mail som skickas under flödet', '', 10, 4),
  (s6, 'Logga in som kund och verifiera tillgång', '', 10, 5),
  (s6, 'Hitta och öppna första innehållet i kursen', '', 10, 6),
  (s6, 'Kontrollera att allt känns tydligt och tryggt', '', 10, 7),
  (s6, 'Notera alla små friktioner eller oklarheter', '', 10, 8),
  (s6, 'Helhetskänsla: känns detta redo att lansera?', '', 10, 9);

end $$;
