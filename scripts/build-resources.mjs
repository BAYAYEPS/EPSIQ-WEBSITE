#!/usr/bin/env node
import { readFile, stat, writeFile, rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'data/resources.json');
const phases = { college: new Set(['1ac', '2ac', '3ac']), lycee: new Set(['tc', '1bac', '2bac']) };
const statuses = new Set(['official-reference', 'epsiq-pedagogical-proposal']);
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const protectedRelative = new Set(['app-update.json', 'downloads/EPSIQ-2.0.5.apk', 'index.html', 'ar.html', 'README.md', 'wrangler.jsonc', '_headers']);
const site = 'https://epsiq.ma';
const approvedBase = '1335bd6fdba16ffe3735da3cad10f524e5261998';
const demiFondFilename = /^\/downloads\/ressources\/demi-fond\/demi-fond-(1ac|2ac|3ac|tc|1bac|2bac)-projet-cycle-fiches-s01-s10-epsiq\.pdf$/;

function fail(message) { throw new Error(`Resource catalog validation failed: ${message}`); }
function approvedPage(sourcePath) {
  try { return execFileSync('git', ['show', `${approvedBase}:${sourcePath}`], { cwd: root, encoding: 'utf8' }); }
  catch (error) { if (typeof error.stdout === 'string' && error.stdout) return error.stdout; throw error; }
}
function modernizeApprovedNavigation(source, lang) {
  const ar = lang === 'ar';
  const navigation = ar
    ? '<nav class="nav" aria-label="التنقل الرئيسي"><a href="/ar.html">الرئيسية</a><a href="/ar/application/">التطبيق</a><a href="/ar/ressources/" aria-current="page">الموارد</a><a href="/ar/fonctionnalites/">الوظائف</a><a href="/ar/a-propos/">حول EPSIQ</a><a href="/ar/support/">الدعم</a></nav>'
    : '<nav class="nav" aria-label="Navigation principale"><a href="/">Accueil</a><a href="/application/">Application</a><a href="/ressources/" aria-current="page">Ressources</a><a href="/fonctionnalites/">Fonctionnalités</a><a href="/a-propos/">À propos</a><a href="/support/">Support</a></nav>';
  const updated = source.replace(/<nav class="nav"[^>]*>.*?<\/nav>/s, navigation);
  if (updated === source) fail(`could not update approved navigation shell: ${lang}`);
  return updated;
}
function esc(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function json(value) { return JSON.stringify(value).replace(/</g, '\\u003c'); }
function routeFor(resource, lang) { return `${lang === 'ar' ? 'ar/' : ''}ressources/${resource.route}/`; }
function hierarchyRoute(lang, parts) { return `/${lang === 'ar' ? 'ar/' : ''}ressources/${parts.join('/')}/`; }
function localFromPublic(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.startsWith('/') || publicPath.includes('\\') || publicPath.includes('..')) fail(`unsafe public path: ${publicPath}`);
  const absolute = path.resolve(root, `.${publicPath}`);
  if (!absolute.startsWith(`${root}${path.sep}`)) fail(`path escapes repository: ${publicPath}`);
  return absolute;
}
function outputFile(resource, lang) {
  const relative = `${routeFor(resource, lang)}index.html`;
  if (protectedRelative.has(relative) || !relative.match(/^(ar\/)?ressources\/[a-z0-9-]+\/index\.html$/)) fail(`unsafe output route: ${relative}`);
  return path.join(root, relative);
}
async function pdfPages(file) {
  const buffer = await readFile(file);
  const text = buffer.toString('latin1');
  const pages = text.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
  if (!pages) fail(`cannot determine PDF page count for ${path.relative(root, file)} (unsupported PDF structure)`);
  return pages;
}
async function assertFile(publicPath, field) {
  const file = localFromPublic(publicPath);
  try { if (!(await stat(file)).isFile()) fail(`${field} is not a file: ${publicPath}`); } catch { fail(`missing ${field}: ${publicPath}`); }
  return file;
}

export async function validateCatalog(catalog) {
  if (!catalog || catalog.schemaVersion !== 1 || !Array.isArray(catalog.resources) || !Array.isArray(catalog.families) || !Array.isArray(catalog.activities)) fail('schemaVersion 1 plus families, activities, and resources arrays are required');
  const familyIds = new Set(), activityIds = new Set();
  for (const family of catalog.families) {
    if (!slug.test(family.id || '')) fail(`malformed family ID: ${family.id}`);
    if (familyIds.has(family.id)) fail(`duplicate family ID: ${family.id}`); familyIds.add(family.id);
    for (const lang of ['fr', 'ar']) if (!family.labels?.[lang]?.trim()) fail(`missing ${lang} family label: ${family.id}`);
  }
  for (const activity of catalog.activities) {
    if (!slug.test(activity.id || '')) fail(`malformed activity ID: ${activity.id}`);
    if (activityIds.has(activity.id)) fail(`duplicate activity ID: ${activity.id}`); activityIds.add(activity.id);
    if (!familyIds.has(activity.familyId)) fail(`activity missing known family: ${activity.id}`);
    for (const lang of ['fr', 'ar']) if (!activity.labels?.[lang]?.trim()) fail(`missing ${lang} activity label: ${activity.id}`);
  }
  const ids = new Set(), routes = new Set();
  for (const r of catalog.resources) {
    if (!slug.test(r.id || '')) fail(`malformed resource id: ${r.id}`);
    if (ids.has(r.id)) fail(`duplicate resource ID: ${r.id}`); ids.add(r.id);
    if (!slug.test(r.route || '')) fail(`malformed route for ${r.id}`);
    if (routes.has(r.route)) fail(`duplicate generated route: ${r.route}`); routes.add(r.route);
    if (!['general', 'pedagogical'].includes(r.scope)) fail(`invalid scope for ${r.id}`);
    if (r.approvedBaseline !== undefined && (!slug.test(r.route) || r.scope !== 'general')) fail(`invalid approved baseline for ${r.id}`);
    if (!statuses.has(r.editorialStatus)) fail(`unsupported editorial status for ${r.id}`);
    if (!Array.isArray(r.availability) || !r.availability.length) fail(`empty availability for ${r.id}`);
    if (r.scope === 'pedagogical' && (!familyIds.has(r.familyId) || !activityIds.has(r.activityId))) fail(`pedagogical resource missing known family/activity: ${r.id}`);
    if (r.scope === 'pedagogical' && r.publicationState !== 'available') fail(`unavailable pedagogical resource cannot generate a route: ${r.id}`);
    for (const a of r.availability) {
      if (!phases[a.phase]) fail(`invalid school phase for ${r.id}: ${a.phase}`);
      if (!Array.isArray(a.levels) || !a.levels.length) fail(`empty level availability for ${r.id}`);
      for (const level of a.levels) if (!phases[a.phase].has(level)) fail(`invalid ${a.phase} level for ${r.id}: ${level}`);
    }
    for (const lang of ['fr', 'ar']) {
      const copy = r.copy?.[lang];
      for (const field of ['title', 'metaDescription', 'description', 'eyebrow', 'downloadLabel', 'openLabel']) if (!copy?.[field]?.trim()) fail(`missing ${lang}.${field} for ${r.id}`);
      outputFile(r, lang); // validates equivalent output routes and allowlist
    }
    await assertFile(r.cover, `cover for ${r.id}`);
    if (!Array.isArray(r.previews) || !r.previews.length) fail(`missing required preview for ${r.id}`);
    for (const preview of r.previews) await assertFile(preview, `preview for ${r.id}`);
    if (!Array.isArray(r.files) || !r.files.length) fail(`missing PDF files for ${r.id}`);
    for (const file of r.files) {
      if (!Number.isInteger(file.pageCount) || file.pageCount < 1) fail(`invalid claimed page count for ${r.id}`);
      const actual = await pdfPages(await assertFile(file.pdf, `PDF for ${r.id}`));
      if (actual !== file.pageCount) fail(`page count mismatch for ${r.id}: claimed ${file.pageCount}, actual ${actual}`);
      if (r.activityId === 'demi-fond' && !demiFondFilename.test(file.pdf)) fail(`invalid Demi-fond publication filename: ${file.pdf}`);
      if (r.activityId === 'demi-fond') {
        if (r.publicSafety?.manualReview !== 'passed') fail(`missing public-safe manual gate for ${r.id}`);
        const pdfText = (await readFile(await assertFile(file.pdf, `PDF for ${r.id}`))).toString('latin1').toUpperCase();
        for (const forbidden of ['ABDELLATIF BAYAY', 'LYCEE COLLEGIALE KHAWARIZMI', 'INEZGANE AIT MELLOUL']) if (pdfText.includes(forbidden)) fail(`public-safe PDF guard found forbidden text in ${r.id}`);
      }
    }
  }
  return catalog;
}

function labels(lang, resource) {
  const arabic = lang === 'ar';
  return {
    home: arabic ? 'الرئيسية' : 'Accueil', library: arabic ? 'موارد تربوية مجانية' : 'Ressources pédagogiques gratuites',
    free: arabic ? 'PDF مجاني' : 'PDF gratuit', pages: arabic ? 'صفحات' : 'pages',
    proposal: resource.editorialStatus === 'official-reference' ? (arabic ? 'مرجع رسمي' : 'Référence officielle') : (arabic ? 'اقتراح بيداغوجي من EPSIQ' : 'Proposition pédagogique EPSIQ'),
    ready: arabic ? 'جاهز للاستعمال؟' : 'Prêt à l’utiliser ?',
    note: arabic ? 'تحميل مجاني للاستعمال التربوي، دون الحاجة إلى حساب أو بريد إلكتروني.' : 'Téléchargement libre pour un usage pédagogique. Aucun compte ni adresse e-mail n’est demandé.'
  };
}
function header(lang, other) {
  const ar = lang === 'ar'; const home = ar ? '/ar.html' : '/';
  return `<a class="skip-link" href="#main">${ar ? 'الانتقال إلى المحتوى' : 'Aller au contenu'}</a><header class="site-header" id="top"><div class="shell nav-shell"><a class="brand" href="${home}" aria-label="EPSIQ"><img class="brand-logo" src="/assets/logo-mark.webp" alt=""><span><strong>EPSIQ</strong><small>${ar ? 'المساعد الذكي لأستاذ التربية البدنية والرياضية' : 'Le copilote intelligent de l’enseignant d’EPS'}</small></span></a><button class="menu-toggle" aria-label="${ar ? 'فتح القائمة' : 'Ouvrir le menu'}" aria-expanded="false">☰</button><nav class="nav" aria-label="${ar ? 'التنقل الرئيسي' : 'Navigation principale'}"><a href="${home}">${ar ? 'الرئيسية' : 'Accueil'}</a><a href="${ar ? '/ar/application/' : '/application/'}">${ar ? 'التطبيق' : 'Application'}</a><a href="${ar ? '/ar/ressources/' : '/ressources/'}" aria-current="page">${ar ? 'الموارد' : 'Ressources'}</a><a href="${ar ? '/ar/fonctionnalites/' : '/fonctionnalites/'}">${ar ? 'الوظائف' : 'Fonctionnalités'}</a><a href="${ar ? '/ar/a-propos/' : '/a-propos/'}">${ar ? 'حول EPSIQ' : 'À propos'}</a><a href="${ar ? '/ar/support/' : '/support/'}">${ar ? 'الدعم' : 'Support'}</a></nav><div class="language-switch">${ar ? `<a href="/${other}" lang="fr" dir="ltr">FR</a><span>|</span><span class="language-current">العربية</span>` : `<span class="language-current">FR</span><span>|</span><a href="/${other}" lang="ar" dir="rtl">العربية</a>`}</div></div></header>`;
}
function footer(lang, other) { const ar = lang === 'ar'; return `<footer class="footer"><div class="shell footer-grid"><div class="footer-brand"><img src="/assets/logo-mark.webp" alt=""><div><strong>EPSIQ</strong><small>${ar ? 'المساعد الذكي لأستاذ التربية البدنية والرياضية' : 'Le copilote intelligent de l’enseignant d’EPS'}</small></div></div><nav class="footer-links" aria-label="${ar ? 'روابط التذييل' : 'Liens de pied de page'}"><a href="${ar ? '/ar.html' : '/'}">${ar ? 'الرئيسية' : 'Accueil'}</a><a href="${ar ? '/ar/application/' : '/application/'}">${ar ? 'التطبيق' : 'Application'}</a><a href="${ar ? '/ar/ressources/' : '/ressources/'}">${ar ? 'الموارد' : 'Ressources'}</a><a href="${ar ? '/ar/fonctionnalites/' : '/fonctionnalites/'}">${ar ? 'الوظائف' : 'Fonctionnalités'}</a><a href="${ar ? '/ar/a-propos/' : '/a-propos/'}">${ar ? 'حول EPSIQ' : 'À propos'}</a><a href="${ar ? '/ar/support/' : '/support/'}">${ar ? 'الدعم' : 'Support'}</a><a href="${ar ? '/privacy-ar.html' : '/privacy.html'}">${ar ? 'الخصوصية' : 'Confidentialité'}</a><a href="${ar ? '/terms-ar.html' : '/terms.html'}">${ar ? 'الشروط' : 'Conditions'}</a></nav><div class="footer-legal"><span>© 2026 EPSIQ</span><span><a class="footer-language" href="/${other}">${ar ? 'FR' : 'العربية'}</a> · ${ar ? 'المغرب' : 'Maroc'}</span></div></div></footer>`; }
function page(resource, lang) {
  const copy = resource.copy[lang], ar = lang === 'ar', l = labels(lang, resource), own = routeFor(resource, lang), other = routeFor(resource, ar ? 'fr' : 'ar');
  const primary = resource.files[0];
  const allFiles = resource.files.length > 1
    ? resource.files.map((file, i) => `<a class="btn ${i ? 'btn-ghost' : 'btn-primary'} btn-lg" href="${esc(file.pdf)}" download>${esc(copy.downloadLabel)} · ${esc(file.label)}</a>`).join('')
    : `<a class="btn btn-primary btn-lg" href="${esc(primary.pdf)}" download>${esc(copy.downloadLabel)}</a><a class="btn btn-ghost btn-lg" href="${esc(primary.pdf)}" target="_blank" rel="noopener">${esc(copy.openLabel)}</a>`;
  const previews = resource.previews.map((p, i) => `<figure><img src="${esc(p)}" alt="${esc(copy.title)} — ${i + 1}" loading="lazy"><figcaption>${i + 1}. ${esc(copy.title)}</figcaption></figure>`).join('');
  const meta = resource.files.map(f => `PDF · ${f.pageCount} ${l.pages}`).join(' · ');
  const structured = { '@context': 'https://schema.org', '@type': 'CreativeWork', name: copy.title, description: copy.description, url: `${site}/${own}`, contentUrl: `${site}${primary.pdf}`, encodingFormat: 'application/pdf', isAccessibleForFree: true, inLanguage: primary.language, publisher: { '@type': 'Organization', name: 'EPSIQ', url: `${site}/` } };
  return `<!doctype html><html lang="${lang}"${ar ? ' dir="rtl" class="rtl-site"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0b4e42"><meta name="description" content="${esc(copy.metaDescription)}"><meta property="og:title" content="${esc(copy.title)} | EPSIQ"><meta property="og:description" content="${esc(copy.description)}"><meta property="og:type" content="article"><meta property="og:url" content="${site}/${own}"><meta property="og:image" content="${site}${resource.cover}"><link rel="canonical" href="${site}/${own}"><link rel="alternate" hreflang="fr" href="${site}/${routeFor(resource, 'fr')}"><link rel="alternate" hreflang="ar" href="${site}/${routeFor(resource, 'ar')}"><link rel="alternate" hreflang="x-default" href="${site}/${routeFor(resource, 'fr')}"><link rel="icon" href="/assets/favicon-192.png" sizes="192x192"><link rel="manifest" href="/site.webmanifest"><link rel="stylesheet" href="/styles.css"><title>${esc(copy.title)} | EPSIQ</title><script type="application/ld+json">${json(structured)}</script></head><body>${header(lang, other)}<main id="main" class="resource-page-main"><section class="resource-hero"><div class="shell resource-hero-grid"><div class="resource-cover-card reveal"><img src="${esc(resource.cover)}" alt="${esc(copy.title)}"><span class="resource-free-chip">${l.free}</span></div><div class="resource-hero-copy reveal reveal-delay-1"><div class="resource-breadcrumb"><a href="${ar ? '/ar.html' : '/'}">${l.home}</a> / <a href="${ar ? '/ar/ressources/' : '/ressources/'}">${l.library}</a></div><span class="eyebrow">${esc(copy.eyebrow)}</span><h1>${esc(copy.title)}</h1><p>${esc(copy.description)}</p><div class="resource-meta"><span>${esc(meta)}</span><span>${esc(l.proposal)}</span></div><div class="resource-cta-row">${allFiles}</div><p class="resource-note">${l.note}</p></div></div></section><section class="resource-content"><div class="shell resource-content-grid"><div class="resource-copy"><h2>${esc(copy.title)}</h2><p>${esc(copy.description)}</p><h3>${ar ? 'معلومات المورد' : 'Informations sur la ressource'}</h3><ul class="resource-checks"><li>${esc(l.proposal)}</li><li>${esc(meta)}</li><li>${ar ? 'وثيقة قابلة للتحميل والاستعمال التربوي.' : 'Document téléchargeable pour un usage pédagogique.'}</li></ul></div><aside class="resource-side-card"><h3>${ar ? 'تحميل المورد' : 'Télécharger la ressource'}</h3><p>${esc(copy.description)}</p>${allFiles}<div class="resource-disclaimer"><strong>${ar ? 'مهم:' : 'Important :'}</strong> ${ar ? 'مورد عملي من EPSIQ وليس منشوراً رسمياً.' : 'ressource pratique mise à disposition par EPSIQ. Ce document ne constitue pas une publication officielle.'}</div></aside></div></section><section class="resource-preview-section"><div class="shell"><div class="section-head"><span class="eyebrow">${ar ? 'معاينة' : 'Aperçu'}</span><h2>${ar ? 'صفحات المورد.' : 'Les pages du document.'}</h2></div><div class="resource-preview-grid">${previews}</div></div></section><section class="resource-bottom-cta"><div class="shell resource-bottom-card"><div><h2>${l.ready}</h2><p>${l.note}</p></div><a class="btn btn-light btn-lg" href="${esc(primary.pdf)}" download>${esc(copy.downloadLabel)}</a></div></section></main>${footer(lang, other)}<script src="/script.js"></script></body></html>\n`;
}

export async function build(catalog) {
  if (!catalog) catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  await validateCatalog(catalog);
  const planned = [];
  // General documents keep their established standalone routes. Pedagogical
  // documents are deliberately rendered only at their canonical taxonomy level.
  for (const resource of [...catalog.resources].filter(r => r.scope === 'general').sort((a, b) => a.route.localeCompare(b.route))) {
    for (const lang of ['fr', 'ar']) {
      const target = outputFile(resource, lang);
      // Current approved general-resource pages are preserved through a migration
      // adapter. Their full, separately authored page content remains outside the
      // catalog; the catalog remains the authority for identity/assets/validation.
      const source = resource.approvedBaseline
        ? modernizeApprovedNavigation(approvedPage(lang === 'ar' ? `ar/${resource.approvedBaseline}` : resource.approvedBaseline), lang)
        : page(resource, lang);
      planned.push([target, source]);
    }
  }
  // All strings and assets are validated before the first output write.
  for (const [target, content] of planned) {
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.resources-engine-tmp`;
    await writeFile(temporary, content, 'utf8');
    await rename(temporary, target);
  }
  const hierarchy = await renderPedagogicalPages(catalog, root);
  return [...planned.map(([target]) => path.relative(root, target)), ...hierarchy.map(route => route.slice(1) + 'index.html')];
}

// Pure hierarchy planner/renderer: tests supply synthetic validated resources;
// production emits none until a real pedagogical resource is catalogued.
export function pedagogicalPages(catalog) {
  const resources = catalog.resources.filter(r => r.scope === 'pedagogical' && r.publicationState === 'available');
  const pages = new Map();
  for (const r of resources) for (const a of r.availability) for (const level of a.levels) for (const lang of ['fr', 'ar']) {
    const phase = a.phase, family = r.familyId, activity = r.activityId;
    const crumbs = [phase, family, activity, level];
    for (let n = 1; n <= 4; n++) {
      const parts = crumbs.slice(0, n), route = hierarchyRoute(lang, parts);
      if (!pages.has(route)) pages.set(route, { route, lang, phase, family: n >= 2 ? family : null, activity: n >= 3 ? activity : null, level: n === 4 ? level : null });
    }
  }
  return [...pages.values()].sort((a, b) => a.route.localeCompare(b.route));
}

export async function renderPedagogicalPages(catalog, outputRoot) {
  const pages = pedagogicalPages(catalog), rootOut = path.resolve(outputRoot);
  const available = catalog.resources.filter(r => r.scope === 'pedagogical' && r.publicationState === 'available');
  const phaseLabel = (phase, lang) => phase === 'college' ? (lang === 'ar' ? 'الثانوي الإعدادي' : 'Secondaire collégial') : (lang === 'ar' ? 'الثانوي التأهيلي' : 'Secondaire qualifiant');
  const levelLabel = level => level.toUpperCase();
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const matches = (r, p) => r.familyId === p.family && r.activityId === p.activity && r.availability.some(a => a.phase === p.phase && (!p.level || a.levels.includes(p.level)));
  const href = (lang, p) => hierarchyRoute(lang, p);
  const resourceMeta = (r, lang) => {
    const ar = lang === 'ar', file = r.files[0], copy = r.copy[lang];
    const proposal = ar ? 'اقتراح بيداغوجي من EPSIQ' : 'Proposition pédagogique EPSIQ';
    return `<article class="document-card level-document"><div class="document-copy"><span class="document-label">${esc(r.activityId === 'demi-fond' ? (ar ? 'الجري المتوسط' : 'Demi-fond') : copy.eyebrow)}</span><h2>${esc(copy.title)}</h2><p>${esc(file.label)}</p><div class="resource-badges"><span>${file.pageCount} ${ar ? 'صفحة' : 'pages'}</span><span>${ar ? 'الفرنسية' : 'Français'}</span><span>${proposal}</span></div><p>${esc(copy.description)}</p><div class="resource-cta-row"><a class="btn btn-primary" href="${esc(file.pdf)}" download>${ar ? 'تحميل PDF' : 'Télécharger le PDF'}</a><a class="btn btn-ghost" href="${esc(file.pdf)}" target="_blank" rel="noopener">${ar ? 'فتح PDF' : 'Ouvrir le PDF'}</a></div></div><div class="level-preview"><img src="${esc(r.cover)}" alt="${esc(copy.title)}" loading="lazy"></div></article>`;
  };
  for (const p of pages) {
    const ar = p.lang === 'ar';
    const family = p.family && catalog.families.find(x => x.id === p.family).labels[p.lang];
    const activityDef = p.activity && catalog.activities.find(x => x.id === p.activity);
    const activity = activityDef?.labels[p.lang];
    const title = p.level ? `${activity} · ${levelLabel(p.level)}` : p.activity ? activity : p.family ? family : phaseLabel(p.phase, p.lang);
    const scoped = available.filter(r => !p.family ? r.availability.some(a => a.phase === p.phase) : !p.activity ? r.familyId === p.family && r.availability.some(a => a.phase === p.phase) : matches(r, p));
    const metrics = items => ({
      activities: [...new Set(items.map(r => r.activityId))].sort(),
      levels: [...new Set(items.flatMap(r => r.availability.filter(a => a.phase === p.phase).flatMap(a => a.levels)))].sort(),
      resources: items.length
    });
    const scopedMetrics = metrics(scoped);
    const levels = scopedMetrics.levels;
    const families = [...new Set(available.filter(r => r.availability.some(a => a.phase === p.phase)).map(r => r.familyId))].sort();
    const activities = scopedMetrics.activities;
    const intended = activityDef?.intendedCoverage?.filter(x => x.startsWith(`${p.phase}:`)).map(x => x.split(':')[1]) || [];
    const coverage = p.activity ? (levels.length === intended.length && intended.every(x => levels.includes(x)) ? 'complete' : 'partial') : null;
    const crumbParts = [p.phase, p.family, p.activity, p.level].filter(Boolean);
    const crumbNames = [phaseLabel(p.phase, p.lang), family, activity, p.level && levelLabel(p.level)].filter(Boolean);
    const crumbs = crumbParts.map((part, i) => `<a href="${href(p.lang, crumbParts.slice(0, i + 1))}">${esc(crumbNames[i])}</a>`).join(' / ');
    const coverageLabel = coverage === 'complete' ? (ar ? 'مجموعة كاملة' : 'Collection complète') : (ar ? 'مجموعة متاحة جزئياً' : 'Collection partiellement disponible');
    const cardMetrics = m => `${count(m.activities.length, ar ? 'نشاط' : 'activité', ar ? 'أنشطة' : 'activités')} · ${count(m.levels.length, ar ? 'مستوى' : 'niveau', ar ? 'مستويات' : 'niveaux')} · ${count(m.resources, ar ? 'مورد' : 'ressource', ar ? 'موارد' : 'ressources')}`;
    const links = p.level ? '' : (p.activity ? levels.map(x => `<a class="document-card hierarchy-card" href="${href(p.lang, [p.phase, p.family, p.activity, x])}"><span class="document-label">${ar ? 'مورد متاح' : 'Ressource disponible'}</span><h2>${esc(levelLabel(x))}</h2><p>${ar ? 'مشروع الدورة وبطاقات الحصص S01–S10' : 'Projet du cycle + Fiches de séances S01–S10'}</p><strong>${ar ? 'استكشاف' : 'Explorer'}</strong></a>`).join('') : p.family ? activities.map(x => { const m = metrics(scoped.filter(r => r.activityId === x)); const def = catalog.activities.find(a => a.id === x); const intendedLevels = def.intendedCoverage?.filter(v => v.startsWith(`${p.phase}:`)).map(v => v.split(':')[1]) || []; const state = m.levels.length === intendedLevels.length && intendedLevels.every(v => m.levels.includes(v)) ? (ar ? 'مجموعة كاملة' : 'Collection complète') : (ar ? 'مجموعة متاحة جزئياً' : 'Collection partiellement disponible'); return `<a class="document-card hierarchy-card" href="${href(p.lang, [p.phase, p.family, x])}"><span class="document-label">${state}</span><h2>${esc(def.labels[p.lang])}</h2><p>${m.levels.map(levelLabel).join(' · ')}</p><span class="hierarchy-metric">${count(m.resources, ar ? 'مورد' : 'ressource', ar ? 'موارد' : 'ressources')}</span><strong>${ar ? 'استكشاف المجموعة' : 'Explorer la collection'}</strong></a>`; }).join('') : families.map(x => { const m = metrics(scoped.filter(r => r.familyId === x)); return `<a class="document-card hierarchy-card" href="${href(p.lang, [p.phase, x])}"><h2>${esc(catalog.families.find(f => f.id === x).labels[p.lang])}</h2><p class="hierarchy-metric">${cardMetrics(m)}</p><p>${m.activities.map(id => esc(catalog.activities.find(a => a.id === id).labels[p.lang])).join(' · ')}</p><p>${m.levels.map(levelLabel).join(' · ')}</p><strong>${ar ? 'استكشاف' : 'Explorer'}</strong></a>`; }).join(''));
    const cards = p.level ? scoped.map(r => resourceMeta(r, p.lang)).join('') : links;
    const summary = p.level ? (ar ? 'مورد متاح للاستعمال التربوي.' : 'Ressource disponible pour un usage pédagogique.') : p.activity ? `${coverageLabel} · ${count(levels.length, ar ? 'مستوى' : 'niveau', ar ? 'مستويات' : 'niveaux')} · ${count(scopedMetrics.resources, ar ? 'مورد' : 'ressource', ar ? 'موارد' : 'ressources')}` : p.family ? cardMetrics(scopedMetrics) : `${count(families.length, ar ? 'عائلة' : 'famille', ar ? 'عائلات' : 'familles')} · ${cardMetrics(scopedMetrics)}`;
    const other = hierarchyRoute(ar ? 'fr' : 'ar', crumbParts);
    const structured = { '@context':'https://schema.org', '@type': p.level && scoped.length === 1 ? 'CreativeWork' : 'CollectionPage', name:title, url:`${site}${p.route}`, inLanguage:p.lang, isAccessibleForFree:true, numberOfItems: scoped.length };
    const html = `<!doctype html><html lang="${p.lang}"${ar ? ' dir="rtl" class="rtl-site"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${esc(title)} — ${esc(summary)}"><meta property="og:title" content="${esc(title)} | EPSIQ"><meta property="og:description" content="${esc(summary)}"><meta property="og:type" content="website"><meta property="og:url" content="${site}${p.route}"><link rel="canonical" href="${site}${p.route}"><link rel="alternate" hreflang="fr" href="${site}${hierarchyRoute('fr', crumbParts)}"><link rel="alternate" hreflang="ar" href="${site}${hierarchyRoute('ar', crumbParts)}"><link rel="alternate" hreflang="x-default" href="${site}${hierarchyRoute('fr', crumbParts)}"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/ressources.css"><title>${esc(title)} | EPSIQ</title><script type="application/ld+json">${json(structured)}</script></head><body>${header(p.lang, other.slice(1))}<main id="main" class="library-main"><section class="library-hero"><div class="shell"><nav class="resource-breadcrumb"><a href="${ar ? '/ar/ressources/' : '/ressources/'}">${ar ? 'الموارد' : 'Ressources'}</a> / ${crumbs}</nav><h1>${esc(title)}</h1><p>${esc(summary)}</p></div></section><section class="library-section"><div class="shell library-grid">${cards}</div></section><section class="resource-content"><div class="shell"><p class="resource-disclaimer">${ar ? 'الموارد متاحة للاستعمال التربوي. EPSIQ ليس ناشراً رسمياً.' : 'Ressources disponibles pour un usage pédagogique. EPSIQ ne constitue pas une publication officielle.'}</p></div></section></main>${footer(p.lang, other.slice(1))}<script src="/script.js"></script></body></html>\n`;
    const relative = p.route.replace(/^\//, '') + 'index.html', target = path.resolve(rootOut, relative);
    if (!target.startsWith(`${rootOut}${path.sep}`)) fail(`hierarchy output escapes root: ${p.route}`);
    await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, html, 'utf8');
  }
  await validateNoDeadHierarchyLinks(pages, rootOut);
  return pages.map(p => p.route);
}

// Generated hierarchy links must either point at a generated hierarchy page or
// at a validated site asset/download.  This keeps taxonomy growth from quietly
// introducing dead internal navigation.
export async function validateNoDeadHierarchyLinks(pages, outputRoot) {
  const routes = new Set(pages.map(p => p.route));
  for (const p of pages) {
    const file = path.resolve(outputRoot, p.route.replace(/^\//, '') + 'index.html');
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(/href="([^"#]+)"/g)) {
      const link = match[1];
      if (/^\/(?:ar\/)?ressources\/(?:college|lycee)\//.test(link) && !routes.has(link)) fail(`dead generated hierarchy link: ${p.route} -> ${link}`);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build().then(files => console.log(`Generated ${files.length} resource pages:\n${files.join('\n')}`)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
