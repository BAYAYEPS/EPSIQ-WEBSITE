#!/usr/bin/env node
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os'; import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateCatalog, build, pedagogicalPages, renderPedagogicalPages, validateNoDeadHierarchyLinks } from './build-resources.mjs';

const catalog = JSON.parse(await readFile(new URL('../data/resources.json', import.meta.url), 'utf8'));
const expectFailure = async (name, mutate, expected) => {
  const copy = structuredClone(catalog); mutate(copy);
  try { await validateCatalog(copy); throw new Error(`${name}: unexpectedly passed`); }
  catch (error) { if (!String(error.message).includes(expected)) throw error; console.log(`ok ${name}`); }
};
await expectFailure('duplicate ID', c => { c.resources[1].id = c.resources[0].id; }, 'duplicate resource ID');
await expectFailure('missing PDF', c => { c.resources[0].files[0].pdf = '/downloads/missing.pdf'; }, 'missing PDF');
await expectFailure('invalid phase/level', c => { c.resources[0].availability[0].levels = ['tc']; }, 'invalid college level');
await expectFailure('unsafe path', c => { c.resources[0].cover = '/../app-update.json'; }, 'unsafe public path');
await expectFailure('unsupported status', c => { c.resources[0].editorialStatus = 'unknown'; }, 'unsupported editorial status');
await expectFailure('route collision', c => { c.resources[1].route = c.resources[0].route; }, 'duplicate generated route');
await expectFailure('protected output rejection', c => { c.resources[0].route = '../index'; }, 'malformed route');
await expectFailure('page count mismatch', c => { c.resources[0].files[0].pageCount = 99; }, 'page count mismatch');
await expectFailure('missing Arabic parity copy', c => { delete c.resources[0].copy.ar.title; }, 'missing ar.title');
await expectFailure('duplicate family ID', c => { c.families.push(structuredClone(c.families[0])); }, 'duplicate family ID');
await expectFailure('duplicate activity ID', c => { c.activities.push(structuredClone(c.activities[0])); }, 'duplicate activity ID');
await expectFailure('activity missing family', c => { c.activities[0].familyId = 'missing'; }, 'activity missing known family');
await expectFailure('invalid pedagogical activity', c => { c.resources[0].scope = 'pedagogical'; delete c.resources[0].approvedBaseline; c.resources[0].familyId = 'athletisme'; c.resources[0].activityId = 'missing'; }, 'pedagogical resource missing known family/activity');
await expectFailure('unavailable resource route rejected', c => { c.resources[0].scope = 'pedagogical'; delete c.resources[0].approvedBaseline; c.resources[0].familyId = 'athletisme'; c.resources[0].activityId = 'demi-fond'; c.resources[0].publicationState = 'draft'; }, 'unavailable pedagogical resource cannot generate a route');
const first = await build();
const second = await build();
if (JSON.stringify(first) !== JSON.stringify(second) || first.length !== 28) throw new Error('non-deterministic generation');
if (!first.some(p => p.startsWith('ar/ressources/')) || !first.some(p => p.startsWith('ressources/'))) throw new Error('missing FR/AR equivalent routes');
for (const route of ['college/athletisme/demi-fond/1ac', 'college/athletisme/demi-fond/2ac', 'college/athletisme/demi-fond/3ac', 'lycee/athletisme/demi-fond/tc', 'lycee/athletisme/demi-fond/1bac', 'lycee/athletisme/demi-fond/2bac']) {
  for (const prefix of ['', 'ar/']) if (!first.includes(`${prefix}ressources/${route}/index.html`)) throw new Error(`missing real FR/AR level route: ${prefix}${route}`);
}
for (const phase of ['college', 'lycee']) {
  const html = await readFile(new URL(`../ressources/${phase}/athletisme/demi-fond/index.html`, import.meta.url), 'utf8');
  if (!html.includes('complete')) throw new Error(`real ${phase} coverage is not complete`);
}
console.log('ok deterministic generation and FR/AR route parity');
const fixture = structuredClone(catalog); fixture.resources = fixture.resources.filter(r => r.scope === 'general');
fixture.resources.push({ id:'demi-fond-2ac-fixture', scope:'pedagogical', kind:'cycle-plan', route:'fixture', familyId:'athletisme', activityId:'demi-fond', publicationState:'available', availability:[{phase:'college',levels:['2ac']}], files:[{pdf:'/downloads/cahier-de-controle-et-devaluation-eps-2026-2027-epsiq.pdf',language:'fr',pageCount:4}], cover:'/assets/resources/cahier-controle-evaluation-2026-2027-cover.webp', previews:['/assets/resources/cahier-controle-evaluation-2026-2027-page-1.webp'], editorialStatus:'epsiq-pedagogical-proposal', copy: structuredClone(catalog.resources[1].copy) });
const fixtureRoutes = pedagogicalPages(fixture).map(p => p.route);
for (const route of ['/ressources/college/','/ressources/college/athletisme/','/ressources/college/athletisme/demi-fond/','/ressources/college/athletisme/demi-fond/2ac/','/ar/ressources/college/','/ar/ressources/college/athletisme/','/ar/ressources/college/athletisme/demi-fond/','/ar/ressources/college/athletisme/demi-fond/2ac/']) if (!fixtureRoutes.includes(route)) throw new Error(`missing fixture hierarchy route: ${route}`);
for (const route of fixtureRoutes) if (route.includes('/1ac/') || route.includes('/3ac/') || route.includes('/lycee/')) throw new Error(`empty hierarchy route emitted: ${route}`);
const emptyTaxonomy = structuredClone(catalog); emptyTaxonomy.resources = emptyTaxonomy.resources.filter(r => r.scope === 'general');
if (pedagogicalPages(emptyTaxonomy).length) throw new Error('empty taxonomy emitted pedagogical route');
if (pedagogicalPages(catalog).length !== 24) throw new Error('production hierarchy route count mismatch');
console.log('ok pedagogical hierarchy fixture routes, empty-taxonomy suppression and production route matrix');
const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'epsiq-library-fixture-'));
try { await renderPedagogicalPages(fixture, fixtureRoot); for (const route of fixtureRoutes) { const file = path.join(fixtureRoot, route, 'index.html'); const html = await readFile(file, 'utf8'); if (!html.includes('<h1>') || !html.includes('rel="canonical"') || !html.includes('hreflang="ar"') || !html.includes('/styles.css') || !html.includes('/ressources.css') || !html.includes('/script.js') || !html.includes('<header ') || !html.includes('<footer ')) throw new Error(`fixture semantic failure: ${route}`); } const arLevel = await readFile(path.join(fixtureRoot, '/ar/ressources/college/athletisme/demi-fond/2ac/index.html'), 'utf8'); if (!arLevel.includes('dir="rtl"') || !arLevel.includes('href="/ar/ressources/college/athletisme/"') || !arLevel.includes('href="/ressources/college/athletisme/demi-fond/2ac/" lang="fr"')) throw new Error('Arabic breadcrumb or exact language switch failure'); await validateNoDeadHierarchyLinks(pedagogicalPages(fixture), fixtureRoot); console.log('ok one-resource level, FR/AR breadcrumb/switch, shell and dead links'); } finally { await rm(fixtureRoot, { recursive: true, force: true }); }

const coverage = structuredClone(fixture);
const basePedagogical = coverage.resources.at(-1);
for (const [id, phase, level] of [['demi-1ac','college','1ac'], ['demi-3ac','college','3ac'], ['demi-tc','lycee','tc'], ['demi-1bac','lycee','1bac'], ['demi-2bac','lycee','2bac'], ['demi-2ac-second','college','2ac']]) {
  const item = structuredClone(basePedagogical); item.id = id; item.route = id; item.availability = [{ phase, levels:[level] }]; coverage.resources.push(item);
}
const coverageRoutes = pedagogicalPages(coverage);
if (!coverageRoutes.some(p => p.route === '/ressources/lycee/athletisme/demi-fond/2bac/')) throw new Error('both phases not rendered');
const coverageRoot = await mkdtemp(path.join(os.tmpdir(), 'epsiq-library-coverage-'));
try {
  await renderPedagogicalPages(coverage, coverageRoot);
  const activityHtml = await readFile(path.join(coverageRoot, 'ressources/college/athletisme/demi-fond/index.html'), 'utf8');
  const levelHtml = await readFile(path.join(coverageRoot, 'ressources/college/athletisme/demi-fond/2ac/index.html'), 'utf8');
  if (!activityHtml.includes('complete') || !activityHtml.includes('3 niveaux')) throw new Error('complete college coverage not derived');
  if ((levelHtml.match(/class="document-card"/g) || []).length !== 2) throw new Error('multiple resources must list at canonical level URL');
  const snapshot = await readFile(path.join(coverageRoot, 'ressources/college/athletisme/demi-fond/2ac/index.html'), 'utf8');
  await renderPedagogicalPages(coverage, coverageRoot);
  if (snapshot !== await readFile(path.join(coverageRoot, 'ressources/college/athletisme/demi-fond/2ac/index.html'), 'utf8')) throw new Error('hierarchy output is not deterministic');
  console.log('ok complete College coverage, both phases, multi-resource level and deterministic hierarchy');
} finally { await rm(coverageRoot, { recursive: true, force: true }); }
const base = '1335bd6fdba16ffe3735da3cad10f524e5261998';
for (const resource of catalog.resources.filter(r => r.approvedBaseline)) for (const lang of ['fr', 'ar']) {
  const route = `${lang === 'ar' ? 'ar/' : ''}ressources/${resource.route}/index.html`;
  const html = await readFile(new URL(`../${route}`, import.meta.url), 'utf8');
  let approved;
  try { approved = execFileSync('git', ['show', `${base}:${route}`], { encoding: 'utf8' }); }
  catch (error) { if (typeof error.stdout === 'string' && error.stdout) approved = error.stdout; else throw error; }
  const withoutHeader = value => value.replace(/<header class="site-header"[^>]*>.*?<\/header>/s, '<header-shell>');
  if (withoutHeader(html) !== withoutHeader(approved)) throw new Error(`approved resource content changed outside navigation shell: ${route}`);
  const expectedNavigation = lang === 'ar'
    ? ['href="/ar.html"', 'href="/ar/application/"', 'href="/ar/ressources/"', 'href="/ar/fonctionnalites/"', 'href="/ar/a-propos/"', 'href="/ar/support/"']
    : ['href="/"', 'href="/application/"', 'href="/ressources/"', 'href="/fonctionnalites/"', 'href="/a-propos/"', 'href="/support/"'];
  for (const href of expectedNavigation) if (!html.includes(href)) throw new Error(`missing current navigation link ${href}: ${route}`);
  for (const token of ['<title>', 'name="description"', 'property="og:title"', 'property="og:description"', 'rel="canonical"', 'hreflang="fr"', 'hreflang="ar"', 'hreflang="x-default"', 'application/ld+json', '<h1', 'href="/styles.css"', 'src="/script.js"']) if (!html.includes(token)) throw new Error(`missing semantic invariant ${token}: ${route}`);
  if ((html.match(/<h1[ >]/g) || []).length !== 1) throw new Error(`H1 count mismatch: ${route}`);
  if (lang === 'ar' && (!html.includes('lang="ar"') || !html.includes('dir="rtl"'))) throw new Error(`Arabic RTL mismatch: ${route}`);
  console.log(`ok approved resource semantic parity and navigation ${route}`);
}
