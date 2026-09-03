(() => {
  ['/hero-media.css', '/brand.css', '/product-media.css'].forEach((href) => {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = href;
    document.head.appendChild(stylesheet);
  });

  const root = document.documentElement;
  const body = document.body;
  const languageToggle = document.getElementById('languageToggle');
  let currentLang = localStorage.getItem('epsiq-language') || 'fr';

  const journeyCopy = [
    { fr: ['Planification annuelle', 'Organiser les cycles de l’année par niveau avant de passer à l’exécution.'], ar: ['التخطيط السنوي', 'تنظيم حلقات السنة حسب المستوى قبل الانتقال إلى التنفيذ.'] },
    { fr: ['Diagnostic S1', 'Préparer la fiche S1 et la grille d’observation, puis analyser les constats du groupe.'], ar: ['تشخيص S1', 'تحضير جذاذة S1 وشبكة الملاحظة ثم تحليل نتائج المجموعة.'] },
    { fr: ['Projet du cycle', 'Transformer le diagnostic validé en priorités et en projet pédagogique partagé.'], ar: ['مشروع الحلقة', 'تحويل التشخيص المعتمد إلى أولويات ومشروع بيداغوجي مشترك.'] },
    { fr: ['Fiches de séance', 'Préparer les situations et les fiches à l’avance sans déclencher l’exécution terrain.'], ar: ['جذاذات الحصص', 'تحضير الوضعيات والجذاذات مسبقاً دون بدء التنفيذ الميداني.'] },
    { fr: ['Suivi terrain', 'Suivre uniquement la séance réellement exécutée pour la classe sélectionnée.'], ar: ['التتبع الميداني', 'تتبع الحصة المنفذة فعلياً فقط للقسم المحدد.'] },
    { fr: ['Évaluation finale', 'Préparer la dernière séance et sa grille avant de conduire l’évaluation finale.'], ar: ['التقويم النهائي', 'تحضير الحصة الأخيرة وشبكتها قبل تنفيذ التقويم النهائي.'] },
    { fr: ['Bilan & export', 'Vérifier les éléments manquants, valider les résultats puis exporter et clôturer.'], ar: ['الحصيلة والتصدير', 'التحقق من العناصر الناقصة واعتماد النتائج ثم التصدير والإغلاق.'] }
  ];

  const journeySteps = [...document.querySelectorAll('.journey-step')];
  const journeyProgress = document.querySelector('.journey-progress span');
  const journeyNumber = document.getElementById('journeyNumber');
  const journeyTitle = document.getElementById('journeyTitle');
  const journeyText = document.getElementById('journeyText');

  function renderJourney(index) {
    const item = journeyCopy[index]?.[currentLang];
    if (!item) return;
    journeySteps.forEach((step, i) => step.classList.toggle('is-active', i === index));
    if (journeyProgress) journeyProgress.style.width = `${(index / Math.max(1, journeySteps.length - 1)) * 100}%`;
    if (journeyNumber) journeyNumber.textContent = String(index + 1).padStart(2, '0');
    if (journeyTitle) journeyTitle.textContent = item[0];
    if (journeyText) journeyText.textContent = item[1];
  }

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('epsiq-language', lang);
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    body.dir = root.dir;
    document.querySelectorAll('[data-fr][data-ar]').forEach((node) => { node.textContent = node.dataset[lang]; });
    if (languageToggle) {
      const spans = languageToggle.querySelectorAll('span');
      spans.forEach((span) => span.classList.remove('active-lang'));
      (lang === 'fr' ? spans[0] : spans[1])?.classList.add('active-lang');
      languageToggle.setAttribute('aria-label', lang === 'fr' ? 'Passer en arabe' : 'التبديل إلى الفرنسية');
    }
    const activeJourney = document.querySelector('.journey-step.is-active');
    if (activeJourney) renderJourney(Number(activeJourney.dataset.step));
  }

  languageToggle?.addEventListener('click', () => applyLanguage(currentLang === 'fr' ? 'ar' : 'fr'));
  journeySteps.forEach((step) => step.addEventListener('click', () => renderJourney(Number(step.dataset.step))));

  const slides = [...document.querySelectorAll('.showcase-card')];
  const dots = [...document.querySelectorAll('.carousel-dots button')];
  const prev = document.getElementById('prevSlide');
  const next = document.getElementById('nextSlide');
  let slideIndex = 0;
  function showSlide(index) {
    if (!slides.length) return;
    slideIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('is-current', i === slideIndex));
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === slideIndex));
  }
  prev?.addEventListener('click', () => showSlide(slideIndex - 1));
  next?.addEventListener('click', () => showSlide(slideIndex + 1));
  dots.forEach((dot) => dot.addEventListener('click', () => showSlide(Number(dot.dataset.go))));

  const revealNodes = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    revealNodes.forEach((node) => observer.observe(node));
  } else revealNodes.forEach((node) => node.classList.add('is-visible'));

  const tilt = document.querySelector('[data-tilt] .phone-shell');
  const tiltHost = document.querySelector('[data-tilt]');
  if (tilt && tiltHost && window.matchMedia('(pointer:fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    tiltHost.addEventListener('pointermove', (event) => {
      const rect = tiltHost.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      tilt.style.transform = `rotate(-5deg) rotateY(${x * 7}deg) rotateX(${y * -6}deg)`;
    });
    tiltHost.addEventListener('pointerleave', () => { tilt.style.transform = 'rotate(-5deg)'; });
  }

  const copyHash = document.getElementById('copyHash');
  copyHash?.addEventListener('click', async () => {
    const hash = document.getElementById('apkHash')?.textContent?.trim();
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      copyHash.textContent = currentLang === 'fr' ? 'Copié ✓' : 'تم النسخ ✓';
      setTimeout(() => { copyHash.textContent = currentLang === 'fr' ? 'Copier' : 'نسخ'; }, 1500);
    } catch (_) { window.prompt(currentLang === 'fr' ? 'Copiez le SHA-256 :' : 'انسخ SHA-256:', hash); }
  });

  applyLanguage(currentLang);
  renderJourney(0);
  showSlide(0);
})();
