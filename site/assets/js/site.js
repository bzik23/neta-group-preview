/* נטע גרופ - סקריפט אתר. ניווט, טופס, מדידה, חשיפה, נגישות. ללא תלויות. */
(function () {
  'use strict';
  var d = document, body = d.body, isProd = body.dataset.mode === 'production';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- מדידה: dataLayer תמיד; המרות Ads + beacon ללוח הלידים רק בייצור ---------- */
  window.dataLayer = window.dataLayer || [];
  var sentHits = {};
  function track(name, place) {
    var key = name + '|' + place;
    var now = Date.now();
    if (sentHits[key] && now - sentHits[key] < 1500) return; // מניעת כפילות בהקשה כפולה
    sentHits[key] = now;
    var ev = { event: name, place: place || '', page: location.pathname };
    window.dataLayer.push(ev);
    if (!isProd) { try { console.info('[track]', ev); } catch (e) {} return; }
    var label = { click_phone: body.dataset.adsPhone, click_whatsapp: body.dataset.adsWa, lead_form_success: body.dataset.adsForm }[name];
    if (typeof window.gtag === 'function' && label && body.dataset.ads) {
      window.gtag('event', 'conversion', { send_to: body.dataset.ads + '/' + label, value: 1, currency: 'ILS' });
    }
    if (body.dataset.hit && navigator.sendBeacon && name !== 'click_email') {
      var kind = name === 'click_phone' ? 'call' : name === 'click_whatsapp' ? 'wa' : name === 'lead_form_success' ? 'form' : 'other';
      try { navigator.sendBeacon(body.dataset.hit, new Blob([JSON.stringify({ kind: kind, place: place, page: location.pathname, src: nsSrc() })], { type: 'application/json' })); } catch (e) {}
    }
  }
  function nsSrc() {
    var q = location.search;
    if (/[?&](gclid|gad_source|gbraid|wbraid)=/.test(q)) return 'google_paid';
    if (/[?&]fbclid=/.test(q) || /utm_source=facebook/i.test(q)) return 'facebook';
    if (/google\./.test(d.referrer)) return 'google_organic';
    return 'direct';
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest('[data-track]');
    if (a) track(a.dataset.track, a.dataset.place || '');
  });

  /* ---------- ניווט: מגה-תפריט + מגירה ---------- */
  var navBtn = d.querySelector('.nav-btn'), mega = d.getElementById('mega'), megaItem = navBtn && navBtn.closest('.has-mega');
  var hoverTimer;
  function openMega() { if (!mega) return; mega.classList.add('open'); navBtn.setAttribute('aria-expanded', 'true'); }
  function closeMega() { if (!mega) return; mega.classList.remove('open'); navBtn.setAttribute('aria-expanded', 'false'); }
  if (navBtn) {
    navBtn.addEventListener('click', function () { mega.classList.contains('open') ? closeMega() : openMega(); });
    megaItem.addEventListener('mouseenter', function () { clearTimeout(hoverTimer); openMega(); });
    megaItem.addEventListener('mouseleave', function () { hoverTimer = setTimeout(closeMega, 160); });
    megaItem.addEventListener('focusout', function (e) { if (!megaItem.contains(e.relatedTarget)) closeMega(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mega.classList.contains('open')) { closeMega(); navBtn.focus(); } });
    d.addEventListener('click', function (e) { if (!megaItem.contains(e.target)) closeMega(); });
  }
  var burger = d.querySelector('.burger'), drawer = d.getElementById('drawer');
  function setDrawer(open) {
    if (!drawer) return;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.classList.toggle('nav-open', open);
    if (open) { drawer.hidden = false; requestAnimationFrame(function () { drawer.classList.add('open'); }); }
    else { drawer.classList.remove('open'); setTimeout(function () { drawer.hidden = true; }, reduced ? 0 : 220); }
  }
  if (burger) {
    burger.addEventListener('click', function () { setDrawer(burger.getAttribute('aria-expanded') !== 'true'); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { setDrawer(false); burger.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth > 1024 && burger.getAttribute('aria-expanded') === 'true') setDrawer(false); });
  }

  /* ---------- חשיפה בגלילה ---------- */
  var reveals = d.querySelectorAll('.reveal');
  if (reveals.length) {
    if (reduced || !('IntersectionObserver' in window)) { reveals.forEach(function (el) { el.classList.add('in'); }); }
    else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
      reveals.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- סרטון ההירו "קומה 3" ----------
     דסקטופ: מתנגן בשקט בחצי השמאלי אחרי טעינת העמוד, עם כפתור עצירה.
     נייד: הבלוק עובר מתחת לכפתורי הפנייה; פוסטר + כפתור הפעלה (לא נטען עד לחיצה).
     תנועה מופחתת / "עצירת תנועה" בווידג'ט / חיבור איטי: פוסטר עד הפעלה יזומה. */
  var film = d.getElementById('hero-film');
  if (film) {
    var hv = film.querySelector('video'), hPlay = film.querySelector('.hero-play'), hPause = film.querySelector('.hero-pause');
    var conn = navigator.connection || {};
    var slow = conn.saveData || /2g/.test(conn.effectiveType || '');
    var mobile = window.matchMedia('(max-width: 900px)').matches;
    if (mobile) { var btns = d.querySelector('.hero-btns'); if (btns) btns.insertAdjacentElement('afterend', film); }
    function motionOff() { return reduced || d.documentElement.classList.contains('a11y-motion'); }
    function setPausedUI(p) { hPause.setAttribute('aria-pressed', p ? 'true' : 'false'); hPause.setAttribute('aria-label', p ? 'הפעלת הסרטון' : 'עצירת הסרטון'); }
    function startFilm() {
      hPlay.hidden = true; hPause.hidden = false;
      var p = hv.play();
      if (p && p.catch) p.catch(function () { hPlay.hidden = false; hPause.hidden = true; film.classList.remove('hero-film--auto'); });
    }
    hv.addEventListener('playing', function () { hv.classList.add('ready'); setPausedUI(false); });
    hv.addEventListener('pause', function () { setPausedUI(true); });
    hPlay.addEventListener('click', startFilm);
    hPause.addEventListener('click', function () { if (hv.paused) hv.play(); else hv.pause(); });
    d.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('[data-a11y="motion"],[data-a11y="reset"]')) return;
      setTimeout(function () { if (motionOff() && !hv.paused) hv.pause(); }, 0);
    });
    if (!mobile && !slow && !motionOff()) {
      film.classList.add('hero-film--auto');
      if (d.readyState === 'complete') startFilm(); else window.addEventListener('load', function () { setTimeout(startFilm, 250); });
    } else { hPlay.hidden = false; }
  }

  /* ---------- טופס פנייה ---------- */
  function validPhone(v) {
    var s = v.replace(/[\s\-().]/g, '');
    return /^(?:\+?972|0)(?:5\d|[2-4]|[7-9])\d{7}$/.test(s);
  }
  d.querySelectorAll('[data-lead-form]').forEach(function (form) {
    var id = form.id;
    var name = form.querySelector('[name=name]'), phone = form.querySelector('[name=phone]'), consent = form.querySelector('[name=consent]');
    var when = form.querySelector('[name=callback]');
    var btn = form.querySelector('button[type=submit]');
    function err(input, show) {
      var p = d.getElementById(id + '-' + input.name + '-err');
      if (p) p.hidden = !show;
      input.setAttribute('aria-invalid', show ? 'true' : 'false');
    }
    [name, phone].forEach(function (i) { i.addEventListener('blur', function () { validate(false); }); i.addEventListener('input', function () { if (i.getAttribute('aria-invalid') === 'true') validate(false); }); });
    consent.addEventListener('change', function () { err(consent, !consent.checked && consent.getAttribute('aria-invalid') === 'true'); });
    function validate(focus) {
      var ok = true, first = null;
      var nameOk = name.value.trim().length >= 2; err(name, !nameOk); if (!nameOk) { ok = false; first = first || name; }
      var phoneOk = validPhone(phone.value); err(phone, !phoneOk); if (!phoneOk) { ok = false; first = first || phone; }
      var cOk = consent.checked; err(consent, !cOk); if (!cOk) { ok = false; first = first || consent; }
      if (!ok && focus && first) first.focus();
      return ok;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.querySelector('[name=website]').value) return; // honeypot
      if (!validate(true)) return;
      var digits = phone.value.replace(/\D/g, '');
      if (digits.indexOf('972') === 0) digits = '0' + digits.slice(3);
      var pretty = digits.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3');
      var payload = {
        'שם': name.value.trim(),
        'טלפון': '📞 ' + pretty,
        'זמן נוח לחזרה': when ? when.value : '',
        'עמוד': location.href,
        'מקור': { google_paid: 'גוגל ממומן', google_organic: 'גוגל אורגני', facebook: 'פייסבוק', direct: 'ישיר' }[nsSrc()],
        _subject: form.dataset.subject,
        _template: 'table',
        _captcha: 'false'
      };
      if (form.dataset.cc) payload._cc = form.dataset.cc;
      btn.disabled = true; btn.querySelector('.btn-label').hidden = true; btn.querySelector('.btn-busy').hidden = false;
      var fail = form.querySelector('.lead-fail'); fail.hidden = true;
      var ctrl = new AbortController(); var to = setTimeout(function () { ctrl.abort(); }, 15000);
      fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          clearTimeout(to);
          var success = res.ok && (res.j.success === true || res.j.success === 'true');
          if (!success) throw new Error('server');
          form.classList.add('is-done');
          var done = form.querySelector('.lead-done'); done.hidden = false; done.querySelector('h3').setAttribute('tabindex', '-1'); done.querySelector('h3').focus();
          track('lead_form_success', id);
        })
        .catch(function () {
          clearTimeout(to);
          fail.hidden = false;
          btn.disabled = false; btn.querySelector('.btn-label').hidden = false; btn.querySelector('.btn-busy').hidden = true;
        });
    });
  });

  /* ---------- ווידג'ט נגישות ---------- */
  var a11y = d.getElementById('a11y');
  if (a11y) {
    var aBtn = a11y.querySelector('.a11y-btn'), aPanel = d.getElementById('a11y-panel'), KEY = 'ng-a11y';
    var state = {};
    try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }
    function apply() {
      ['font', 'contrast', 'links', 'readable', 'motion'].forEach(function (k) {
        d.documentElement.classList.toggle('a11y-' + k, !!state[k]);
        var b = a11y.querySelector('[data-a11y="' + k + '"]'); if (b) b.setAttribute('aria-pressed', state[k] ? 'true' : 'false');
      });
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    }
    apply();
    function setPanel(open) { aBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); aPanel.hidden = !open; if (open) aPanel.querySelector('button[data-a11y]').focus(); }
    aBtn.addEventListener('click', function () { setPanel(aPanel.hidden); });
    a11y.querySelector('.a11y-close').addEventListener('click', function () { setPanel(false); aBtn.focus(); });
    a11y.querySelectorAll('[data-a11y]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.a11y;
        if (k === 'reset') state = {}; else state[k] = !state[k];
        apply();
      });
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !aPanel.hidden) { setPanel(false); aBtn.focus(); } });
    d.addEventListener('click', function (e) { if (!a11y.contains(e.target) && !aPanel.hidden) setPanel(false); });
  }

  /* ---------- קישורי עוגן לטופס: מיקוד לשדה הראשון ---------- */
  d.querySelectorAll('a[href="#contact-form"]').forEach(function (a) {
    a.addEventListener('click', function () {
      setTimeout(function () { var f = d.querySelector('#lead-page [name=name]'); if (f) f.focus({ preventScroll: true }); }, reduced ? 0 : 500);
    });
  });
})();
