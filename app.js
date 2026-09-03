(() => {
  const mobileStyles = document.createElement('link');
  mobileStyles.rel = 'stylesheet';
  mobileStyles.href = '/mobile-final.css';
  document.head.appendChild(mobileStyles);

  const root = document.documentElement;
  const body = document.body;
  const langToggle = document.getElementById('languageToggle');
  let lang = localStorage.getItem('epsiq-language') || 'fr';

  const journey = [
    {fr:['Planification annuelle','Organiser les cycles de l’année par niveau avant l’exécution.'], ar:['التخطيط السنوي','تنظيم حلقات السنة حسب المستوى قبل التنفيذ.']},
    {fr:['Diagnostic S1','Préparer la fiche S1 et la grille d’observation, puis analyser les constats.'], ar:['تشخيص S1','تحضير جذاذة S1 وشبكة الملاحظة ثم تحليل النتائج.']},
    {fr:['Projet du cycle','Transformer le diagnostic validé en priorités et en projet pédagogique partagé.'], ar:['مشروع الحلقة','تحويل التشخيص المعتمد إلى أولويات ومشروع بيداغوجي مشترك.']},
    {fr:['Fiches de séance','Préparer les situations à l’avance sans déclencher l’exécution terrain.'], ar:['جذاذات الحصص','تحضير الوضعيات مسبقاً دون بدء التنفيذ الميداني.']},
    {fr:['Suivi terrain','Suivre la séance réellement exécutée pour la classe sélectionnée.'], ar:['التتبع الميداني','تتبع الحصة المنفذة فعلياً للقسم المحدد.']},
    {fr:['Évaluation finale','Préparer la dernière séance et sa grille avant l’évaluation finale.'], ar:['التقويم النهائي','تحضير الحصة الأخيرة وشبكتها قبل التقويم النهائي.']},
    {fr:['Bilan & export','Valider les résultats, exporter puis clôturer l’exécution pour la classe.'], ar:['الحصيلة والتصدير','اعتماد النتائج ثم التصدير وإغلاق التنفيذ للقسم.']}
  ];

  const products = [
    {
      image:'/assets/epsiq-diagnostic.webp',
      alt:{fr:'Capture réelle de la fiche diagnostique S1 dans EPSIQ', ar:'لقطة حقيقية لجذاذة التشخيص S1 في EPSIQ'},
      title:{fr:'Préparer la séance diagnostique', ar:'تحضير الحصة التشخيصية'},
      text:{fr:'La fiche S1 et l’organisation de l’observation sont préparées avant le terrain, sans confondre préparation et exécution.', ar:'تُحضّر جذاذة S1 وتنظيم الملاحظة قبل الميدان، دون خلط التحضير بالتنفيذ.'},
      tags:{fr:['Fiche S1','Observation','Préparation'], ar:['جذاذة S1','الملاحظة','التحضير']}
    },
    {
      image:'/assets/epsiq-bilan.webp',
      alt:{fr:'Capture réelle du bilan et de l’état du cycle dans EPSIQ', ar:'لقطة حقيقية للحصيلة وحالة الحلقة في EPSIQ'},
      title:{fr:'Voir l’état réel du cycle', ar:'معرفة الحالة الفعلية للحلقة'},
      text:{fr:'Diagnostic, suivi, évaluation et export restent lisibles : l’enseignant voit immédiatement ce qui est terminé et ce qui attend.', ar:'يبقى التشخيص والتتبع والتقويم والتصدير واضحاً، فيعرف الأستاذ فوراً ما تم وما يزال منتظراً.'},
      tags:{fr:['État du cycle','Priorités','Classe'], ar:['حالة الحلقة','الأولويات','القسم']}
    },
    {
      image:'/assets/epsiq-results.webp',
      alt:{fr:'Capture réelle des résultats sur 20 et des exports EPSIQ', ar:'لقطة حقيقية للنتائج على 20 والتصدير في EPSIQ'},
      title:{fr:'Finaliser puis exporter', ar:'الإنهاء ثم التصدير'},
      text:{fr:'Les résultats sont vérifiés avant l’export PDF ou la copie Massar : la fin du cycle reste un flux de décision, pas une nouvelle saisie.', ar:'تُراجع النتائج قبل تصدير PDF أو النسخ إلى مسار، فتظل نهاية الحلقة مسار قرار لا إدخالاً جديداً للبيانات.'},
      tags:{fr:['Résultats /20','PDF','Massar'], ar:['النتائج /20','PDF','مسار']}
    }
  ];

  function renderJourney(index) {
    const data = journey[index]?.[lang];
    if (!data) return;
    document.querySelectorAll('.journey-step').forEach((step, i) => {
      const active = i === index;
      step.classList.toggle('is-active', active);
      step.setAttribute('aria-selected', String(active));
    });
    const number = document.getElementById('journeyNumber');
    const title = document.getElementById('journeyTitle');
    const text = document.getElementById('journeyText');
    if (number) number.textContent = String(index + 1).padStart(2, '0');
    if (title) title.textContent = data[0];
    if (text) text.textContent = data[1];
  }

  function renderProduct(index) {
    const data = products[index];
    if (!data) return;
    document.querySelectorAll('.product-tab').forEach((tab, i) => {
      const active = i === index;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    const productIndex = document.getElementById('productIndex');
    const title = document.getElementById('productTitle');
    const text = document.getElementById('productText');
    const image = document.getElementById('productImage');
    const tags = document.getElementById('productTags');
    if (productIndex) productIndex.textContent = `0${index + 1} / 03`;
    if (title) title.textContent = data.title[lang];
    if (text) text.textContent = data.text[lang];
    if (image) {
      image.src = data.image;
      image.alt = data.alt[lang];
    }
    if (tags) {
      tags.innerHTML = '';
      data.tags[lang].forEach(label => {
        const span = document.createElement('span');
        span.textContent = label;
        tags.appendChild(span);
      });
    }
  }

  function translate(langCode) {
    lang = langCode;
    localStorage.setItem('epsiq-language', lang);
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    body.dir = root.dir;
    document.querySelectorAll('[data-fr][data-ar]').forEach(el => { el.textContent = el.dataset[lang]; });
    if (langToggle) {
      const spans = langToggle.querySelectorAll('span');
      spans.forEach(span => span.classList.remove('is-active'));
      (lang === 'fr' ? spans[0] : spans[1])?.classList.add('is-active');
      langToggle.setAttribute('aria-label', lang === 'fr' ? 'Passer en arabe' : 'التبديل إلى الفرنسية');
    }
    renderJourney(Number(document.querySelector('.journey-step.is-active')?.dataset.step || 0));
    renderProduct(Number(document.querySelector('.product-tab.is-active')?.dataset.product || 0));
  }

  langToggle?.addEventListener('click', () => translate(lang === 'fr' ? 'ar' : 'fr'));
  document.querySelectorAll('.journey-step').forEach(step => step.addEventListener('click', () => renderJourney(Number(step.dataset.step))));
  document.querySelectorAll('.product-tab').forEach(tab => tab.addEventListener('click', () => renderProduct(Number(tab.dataset.product))));

  document.getElementById('copyHash')?.addEventListener('click', async event => {
    const hash = document.getElementById('apkHash')?.textContent?.trim();
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      event.currentTarget.textContent = lang === 'fr' ? 'Copié ✓' : 'تم النسخ ✓';
      setTimeout(() => { event.currentTarget.textContent = lang === 'fr' ? 'Copier' : 'نسخ'; }, 1400);
    } catch (_) {
      window.prompt(lang === 'fr' ? 'Copiez le SHA-256 :' : 'انسخ SHA-256:', hash);
    }
  });

  const params = new URLSearchParams(location.search);
  const source = params.get('source') || params.get('utm_source');
  if (source) sessionStorage.setItem('epsiq_source', source);

  const reveal = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:.12});
    reveal.forEach(el => observer.observe(el));
  } else {
    reveal.forEach(el => el.classList.add('is-visible'));
  }

  translate(lang);
})();
