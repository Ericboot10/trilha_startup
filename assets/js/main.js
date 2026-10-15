/*
 * Landing page — orquestração das seções.
 * Um único laço de requestAnimationFrame atende todas as cenas e só roda
 * enquanto alguma delas está animando (intro, scroll, mouse).
 */
(function () {
  'use strict';
  var SS = window.SS, G = SS.BRIDGE, V = SS.vec;
  var root = document.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  var LESSONS = SS.LESSONS, STAGES = SS.STAGES;

  function reduced() { return mqReduce.matches; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function now() { return performance.now() / 1000; }
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function stageLabel(id) { var s = STAGES[id]; return 'STAGE ' + s.code + ' — ' + s.name; }
  function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

  /* ---------------- laço de animação ---------------- */
  var scenes = [], rafId = 0, last = 0;
  function requestFrame() { if (!rafId) rafId = requestAnimationFrame(frame); }
  function frame(ts) {
    rafId = 0;
    var t = ts / 1000, dt = last ? Math.min(0.05, t - last) : 1 / 60;
    last = t;
    var again = false;
    for (var i = 0; i < scenes.length; i++) if (scenes[i].tick(t, dt)) again = true;
    if (again) requestFrame(); else last = 0;
  }
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', function () {
    scenes.forEach(function (s) { if (s.resize) s.resize(); });
    requestFrame();
  });

  function observe(el, cb, opts) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { cb(e.isIntersecting, e); });
    }, opts || {}).observe(el);
  }

  /* ---------------- tema ---------------- */
  var themeMeta = $('meta[name="theme-color"]');
  function currentTheme() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  var themeHandlers = [];
  function applyTheme(t, persist) {
    root.setAttribute('data-theme', t);
    if (persist) { try { localStorage.setItem('ss-theme', t); } catch (e) { /* armazenamento indisponível */ } }
    if (themeMeta) themeMeta.setAttribute('content', t === 'light' ? '#F4F0E8' : '#090909');
    $$('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', t === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro');
    });
    themeHandlers.forEach(function (fn) { fn(t); });
    requestFrame();
  }
  $$('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      root.classList.add('theme-anim');
      applyTheme(currentTheme() === 'light' ? 'dark' : 'light', true);
      setTimeout(function () { root.classList.remove('theme-anim'); }, 500);
    });
  });

  /* ---------------- navegação ---------------- */
  var nav = $('#nav'), menuBtn = $('.menu-btn'), menu = $('#mobile-menu');
  function onScrollNav() { nav.classList.toggle('is-scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();
  function setMenu(open) {
    menu.hidden = !open;
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  /* ---------------- diálogo "Entrar" ---------------- */
  var dialog = $('#login-dialog');
  $$('[data-open-login]').forEach(function (b) {
    b.addEventListener('click', function () {
      setMenu(false);
      if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    });
  });

  /* ---------------- reveal ---------------- */
  $$('.reveal').forEach(function (el) {
    observe(el, function (vis) { if (vis) el.classList.add('is-in'); }, { threshold: 0.15 });
  });

  /* =========================================================
     Câmeras
     ========================================================= */
  function blendCam(a, b, t) { return { pos: lerp3(a.pos, b.pos, t), target: lerp3(a.target, b.target, t), fov: lerp(a.fov, b.fov, t) }; }
  function byAspect(w, h, wide, tall) {
    var t = sstep(1.25, 0.62, w / h);
    return blendCam(wide, tall, t);
  }
  var CAMS = {
    hero: {
      wide: { pos: [-420, 12, -290], target: [700, 168, 40], fov: 46 },
      tall: { pos: [-300, 14, -150], target: [700, 120, 200], fov: 68 }
    },
    crossing: {
      wide: { pos: [-900, 420, 1500], target: [450, 105, -100], fov: 32 },
      tall: { pos: [-900, 800, 600], target: [400, 100, -100], fov: 70 }
    },
    finale: {
      wide: { pos: [640, 36, 2700], target: [640, 300, 0], fov: 30 },
      tall: { pos: [-900, 60, 2300], target: [700, 120, 0], fov: 58 }
    }
  };

  /* =========================================================
     01 · Hero
     ========================================================= */
  var hero = (function () {
    var section = $('.hero'), canvas = $('.hero__canvas'), annot = $('.hero__annot');
    if (!canvas || !canvas.getContext) return null;
    var view = new SS.BridgeView(canvas, { checkpointZ: -G.DECK_HW + 0.6, fogStart: 240, fogEnd: 4300, lowFog: 0.9 });
    view.setTheme(currentTheme());
    var visible = true, mouse = [0, 0], cur = [0, 0], t0 = now(), dollyT0 = -1, lastKey = '';

    themeHandlers.push(function (t) { view.setTheme(t); lastKey = ''; });
    observe(section, function (v) { visible = v; if (v) requestFrame(); });
    if (mqHover.matches) {
      window.addEventListener('pointermove', function (e) {
        if (!visible) return;
        mouse[0] = e.clientX / window.innerWidth * 2 - 1;
        mouse[1] = e.clientY / window.innerHeight * 2 - 1;
        requestFrame();
      }, { passive: true });
    }

    function tick(t, dt) {
      if (!visible) return false;
      var anim = false, rm = reduced();
      var k = rm ? 1 : 1 - Math.exp(-dt * 2.6);
      cur[0] += (mouse[0] - cur[0]) * k;
      cur[1] += (mouse[1] - cur[1]) * k;
      if (Math.abs(mouse[0] - cur[0]) + Math.abs(mouse[1] - cur[1]) > 0.0008) anim = true;

      var intro = rm ? 9 : now() - t0;
      if (intro < 2.6) anim = true;
      var fogBoost = 0.88 * (1 - easeOut(clamp((intro - 0.05) / 1.6, 0, 1)));
      var lit = Math.floor(clamp((intro - 1.0) / 1.1, 0, 1) * 20);

      var dolly = 0;
      if (dollyT0 >= 0) { dolly = clamp((now() - dollyT0) / 1.25, 0, 1); if (dolly < 1) anim = true; }

      var sp = clamp(window.scrollY / Math.max(1, section.offsetHeight), 0, 1);
      var key = [cur[0].toFixed(4), cur[1].toFixed(4), sp.toFixed(4), fogBoost.toFixed(3), lit, dolly.toFixed(3), view.theme, view.w, view.h].join('|');
      if (key === lastKey) return anim;
      lastKey = key;

      var c = byAspect(view.w, view.h, CAMS.hero.wide, CAMS.hero.tall);
      var f = V.norm(V.sub(c.target, c.pos)), r = V.norm([-f[2], 0, f[0]]);
      var pos = V.add(c.pos, V.add(V.scale(r, cur[0] * 14), [0, -cur[1] * 8 + sp * 26, 0]));
      pos = V.add(pos, V.scale(f, sp * 110));
      var tgt = V.add(c.target, V.add(V.scale(r, cur[0] * 34), [0, -cur[1] * 16, 0]));
      if (dolly > 0) {
        var e = easeInOut(dolly);
        pos = V.add(pos, V.scale(f, e * 190));
        pos[1] += e * 34;
        tgt = V.add(tgt, [0, -e * 70, 0]);
      }
      view.setCamera(pos, tgt, c.fov);
      view.state.fogBoost = fogBoost;
      view.state.lit = dolly > 0 ? Math.max(lit, 1) : lit;
      view.state.highlight = dolly > 0 ? 0 : -1;
      view.render();

      // anotação de engenharia na torre próxima
      if (annot) {
        var p = view.project([0, G.TOWER_H - 30, -G.CABLE_Z - 6]);
        var on = p && intro > 1.6 && p.x > view.w * 0.55 && p.y > 70;
        if (p) annot.style.transform = 'translate(' + (p.x - p.scale * 14 - 24).toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) translateX(-100%)';
        annot.classList.toggle('is-on', !!on && sp < 0.25);
      }
      return anim;
    }

    return {
      tick: tick,
      resize: function () { view.resize(); lastKey = ''; },
      dolly: function () { dollyT0 = now(); requestFrame(); }
    };
  })();
  if (hero) scenes.push(hero);

  /* =========================================================
     02 · A travessia
     ========================================================= */
  // Conquista "Network Effect": a travessia completa desbloqueia a rede do outro lado.
  var NET_KEY = 'ss-network-effect';
  var netUnlocked = (function () { try { return localStorage.getItem(NET_KEY) === '1'; } catch (e) { return false; } })();
  var bridgeCrossed = netUnlocked;

  var crossing = (function () {
    var section = $('#travessia');
    var canvas = $('.crossing__canvas', section);
    if (!canvas || !canvas.getContext) return null;
    var pointsEl = $('.crossing__points', section), labelsEl = $('.crossing__labels', section);
    var tip = $('.cp-tip', section), fogline = $('.crossing__fogline', section), panel = $('.crossing__panel', section);
    var readout = $('[data-readout]', section), readBar = $('.readout__bar', section);
    var fogs = $$('.crossing__fog', section);
    var goal = $('[data-goal]', section);
    function setGoal() {
      if (!goal) return;
      goal.textContent = 'Network Effect · ' + (netUnlocked ? 'desbloqueado' : bridgeCrossed ? 'pronto — continue ↓' : 'bloqueado');
      goal.classList.toggle('is-ready', bridgeCrossed && !netUnlocked);
      goal.classList.toggle('is-done', netUnlocked);
    }
    setGoal();
    document.addEventListener('ss:network-unlocked', setGoal);
    var view = new SS.BridgeView(canvas, { drawCheckpoints: false, land: true, checkpointZ: 0, fogStart: 1100, fogEnd: 6200, fogMax: 0.8, lowFog: 0.4 });
    view.setTheme(currentTheme());
    var visible = false, pS = 0, lastKey = '', selected = 0, hovered = -1, revealX = -Infinity;
    var mouse = [0, 0], cur = [0, 0];
    if (mqHover.matches) {
      window.addEventListener('pointermove', function (e) {
        if (!visible) return;
        mouse[0] = e.clientX / window.innerWidth * 2 - 1;
        mouse[1] = e.clientY / window.innerHeight * 2 - 1;
      }, { passive: true });
    }

    // Estados para um visitante: apenas a primeira missão disponível.
    function stateOf(i) { return i === 0 ? 'available' : 'locked'; }
    var STATE_TEXT = {
      available: 'Disponível — seu ponto de partida',
      locked: 'Bloqueada — conclua a missão anterior'
    };

    var btns = LESSONS.map(function (l, i) {
      var b = document.createElement('button');
      var st = stateOf(i);
      b.type = 'button';
      b.className = 'cp cp--' + st;
      b.tabIndex = i === 0 ? 0 : -1;
      b.setAttribute('aria-label', 'Missão ' + pad2(i + 1) + ' de 20: ' + l.title + ' — ' + (st === 'available' ? 'disponível' : 'bloqueada'));
      b.innerHTML = '<span class="cp__dot" aria-hidden="true"></span>';
      b.addEventListener('click', function () { select(i); });
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hovered = i; showTip(); requestFrame(); } });
      b.addEventListener('pointerleave', function () { if (hovered === i) { hovered = -1; showTip(); requestFrame(); } });
      b.addEventListener('focus', function () { hovered = i; showTip(); requestFrame(); });
      b.addEventListener('blur', function () { if (hovered === i) { hovered = -1; showTip(); requestFrame(); } });
      b.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (e.key === 'Home') d = -i; else if (e.key === 'End') d = 19 - i;
        if (d) { e.preventDefault(); select(clamp(i + d, 0, 19), true); }
      });
      pointsEl.appendChild(b);
      return b;
    });

    var labels = STAGES.map(function (s) {
      var first = LESSONS.findIndex(function (l) { return l.stage === s.id; });
      var el = document.createElement('div');
      el.className = 'stage-label';
      el.innerHTML = 'Stage ' + s.code + '<b>' + esc(s.name) + '</b>';
      labelsEl.appendChild(el);
      return { el: el, i: first, stage: s.id, lift: s.id % 2 ? 78 : 46 };
    });

    function fillPanel(i) {
      var l = LESSONS[i], st = stateOf(i);
      $('[data-p="num"]', panel).textContent = 'Missão ' + pad2(i + 1) + ' / 20';
      $('[data-p="stage"]', panel).textContent = stageLabel(l.stage);
      $('[data-p="title"]', panel).textContent = l.title;
      $('[data-p="speakers"]', panel).textContent = l.speakers + ' · Aula ' + pad2(l.playlist) + ' da playlist';
      $('[data-p="focus"]', panel).textContent = l.focus;
      $('[data-p="challenge"]', panel).textContent = l.challenge.text;
      var stEl = $('[data-p="state"]', panel);
      stEl.textContent = STATE_TEXT[st];
      stEl.className = 'state state--' + st;
      $('[data-step="-1"]', panel).disabled = i === 0;
      $('[data-step="1"]', panel).disabled = i === 19;
    }

    function select(i, focus) {
      selected = i;
      btns.forEach(function (b, k) { b.classList.toggle('is-selected', k === i); b.tabIndex = k === i ? 0 : -1; });
      if (focus) btns[i].focus({ preventScroll: true });
      fillPanel(i);
      lastKey = '';
      requestFrame();
    }
    $$('[data-step]', panel).forEach(function (b) {
      b.addEventListener('click', function () { select(clamp(selected + Number(b.getAttribute('data-step')), 0, 19)); });
    });

    function showTip() {
      if (hovered < 0) { tip.classList.remove('is-on'); return; }
      var l = LESSONS[hovered], st = stateOf(hovered);
      tip.innerHTML = '<p class="mono">Missão ' + pad2(hovered + 1) + ' / 20</p><strong lang="en">' + esc(l.title) + '</strong><p>' + esc(l.focus) + '</p><p class="mono tip__state">' + (st === 'available' ? '● Disponível' : '○ Bloqueada') + '</p>';
      tip.classList.add('is-on');
      placeTip();
    }
    function placeTip() {
      if (hovered < 0) return;
      var p = btns[hovered]._p;
      if (!p) return;
      var w = 260, x = clamp(p.x - w / 2, 12, view.w - w - 12);
      var y = p.y - 26 - tip.offsetHeight;
      if (y < 80) y = p.y + 26;
      tip.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    }

    themeHandlers.push(function (t) { view.setTheme(t); lastKey = ''; });
    observe(section, function (v) { visible = v; if (v) requestFrame(); });

    function tick(t, dt) {
      if (!visible) return false;
      var rect = section.getBoundingClientRect();
      var total = Math.max(1, rect.height - window.innerHeight);
      var p = clamp(-rect.top / total, 0, 1);
      var rm = reduced();
      if (rm) pS = p; else pS += (p - pS) * (1 - Math.exp(-dt * 4.5));
      var k = rm ? 1 : 1 - Math.exp(-dt * 2.2);
      cur[0] += (mouse[0] - cur[0]) * k;
      cur[1] += (mouse[1] - cur[1]) * k;

      revealX = lerp(G.X_START + 250, G.X_END + 300, sstep(0.02, 0.94, pS));
      var glow = hovered >= 0 ? hovered : selected;
      var anim = !rm && (Math.abs(p - pS) > 0.0004 || Math.abs(mouse[0] - cur[0]) + Math.abs(mouse[1] - cur[1]) > 0.001);
      var key = [pS.toFixed(4), cur[0].toFixed(3), cur[1].toFixed(3), glow, view.theme, view.w, view.h].join('|');
      if (key === lastKey) return anim;
      lastKey = key;

      // Câmera de travessia: desce e avança ao longo da ponte, com um leve arco.
      var c = byAspect(view.w, view.h, CAMS.crossing.wide, CAMS.crossing.tall);
      var e = easeInOut(pS), arc = Math.sin(pS * Math.PI);
      var pos = V.add(c.pos, [e * 640 + cur[0] * 40, -e * 150 - arc * 30 - cur[1] * 20, -e * 420 + arc * 120]);
      var tgt = V.add(c.target, [e * 760 + cur[0] * 60, e * 10 - cur[1] * 12, -arc * 40]);
      view.setCamera(pos, tgt, c.fov - arc * 2);
      view.state.revealX = revealX;
      view.state.frontier = revealX < G.X_END ? clamp(revealX + 40, G.X_START, G.X_END) : null;
      view.state.glow = glow;
      view.render();
      fogs.forEach(function (f, i) {
        f.style.transform = 'translate3d(' + (-(pS * (i ? 34 : 22)) - cur[0] * (i ? 2 : 1)).toFixed(2) + '%,' + (pS * (i ? -40 : 30)).toFixed(1) + 'px,0)';
        f.style.opacity = (1 - sstep(0.55, 0.95, pS) * 0.7).toFixed(3);
      });

      var revealed = 0;
      btns.forEach(function (b, i) {
        var x = SS.checkpointX(i);
        var fogged = x > revealX + 40;
        if (!fogged) revealed++;
        var pr = view.project([x, G.DECK_Y + 1.5, 0]);
        b._p = pr;
        if (!pr) { b.classList.add('is-hidden'); return; }
        b.classList.remove('is-hidden');
        b.style.transform = 'translate(' + pr.x.toFixed(1) + 'px,' + pr.y.toFixed(1) + 'px)';
        b.classList.add('is-placed');
        if (b._f !== fogged) {
          if (b._f === true && !fogged && !reduced()) {
            b.classList.add('just-revealed');
            setTimeout(function () { b.classList.remove('just-revealed'); }, 1000);
          }
          b._f = fogged;
          b.classList.toggle('is-fogged', fogged);
        }
      });
      var curStage = LESSONS[selected].stage;
      labels.forEach(function (lb) {
        var b = btns[lb.i], pr = b._p;
        if (!pr) { lb.el.style.opacity = '0'; return; }
        lb.el.style.opacity = '';
        lb.el.style.height = lb.lift + 'px';
        lb.el.style.transform = 'translate(' + pr.x.toFixed(1) + 'px,' + (pr.y - lb.lift - 8).toFixed(1) + 'px)';
        lb.el.classList.add('is-placed');
        lb.el.classList.toggle('is-fogged', !!b._f);
        lb.el.classList.toggle('is-current', lb.stage === curStage);
      });
      placeTip();

      fogline.style.opacity = (sstep(0.14, 0.26, pS) * (1 - sstep(0.5, 0.62, pS))).toFixed(3);
      fogline.style.transform = 'translateY(' + ((1 - sstep(0.14, 0.3, pS)) * 14).toFixed(1) + 'px)';
      if (revealed === 20 && !bridgeCrossed) { bridgeCrossed = true; setGoal(); }
      readout.textContent = pad2(revealed);
      readBar.style.setProperty('--r', (revealed / 20).toFixed(3));
      return anim;
    }

    select(0);

    return {
      tick: tick,
      resize: function () { view.resize(); lastKey = ''; },
      goToStart: function (smooth) {
        var top = section.getBoundingClientRect().top + window.scrollY;
        var target = top + (section.offsetHeight - window.innerHeight) * 0.1;
        window.scrollTo({ top: target, behavior: smooth && !reduced() ? 'smooth' : 'instant' });
        // Fallback: se o scroll suave não acontecer, vai direto.
        setTimeout(function () { if (Math.abs(window.scrollY - target) > 40) window.scrollTo({ top: target, behavior: 'instant' }); }, 1400);
        select(0);
        setTimeout(function () { btns[0].focus({ preventScroll: true }); }, smooth ? 900 : 0);
      }
    };
  })();
  if (crossing) scenes.push(crossing);

  /* "Começar minha jornada" — THE JOURNEY BEGINS */
  function startJourney() {
    setMenu(false);
    if (dialog.open) dialog.close();
    var atHero = window.scrollY < window.innerHeight * 0.4;
    if (hero && atHero && !reduced()) {
      hero.dolly();
      setTimeout(function () { if (crossing) crossing.goToStart(true); }, 650);
    } else if (crossing) {
      crossing.goToStart(!reduced());
    }
  }
  $$('[data-start]').forEach(function (b) { b.addEventListener('click', startJourney); });

  /* =========================================================
     Do outro lado da ponte — Network Effect
     Rede ilustrativa: congelada e cinza até a travessia terminar; então acende
     a partir do seu nó (início, vermelho) e se espalha até as bordas (conquista, dourado).
     ========================================================= */
  var network = (function () {
    var section = $('#rede');
    var canvas = section && $('.network__canvas', section);
    if (!canvas || !canvas.getContext) return null;
    var ctx = canvas.getContext('2d');
    var head = $('.network__head', section), you = $('[data-net-you]', section);
    var toast = $('[data-net-toast]', section), back = $('[data-net-back]', section);
    var PAL = {
      dark: { red: [229, 72, 61], gold: [245, 185, 66], idle: [74, 74, 78], idleEdge: 'rgba(255,255,255,.1)', halo: 1 },
      light: { red: [200, 63, 53], gold: [185, 122, 14], idle: [170, 162, 152], idleEdge: 'rgba(23,23,23,.14)', halo: .6 }
    };
    var BASE = { founders: 12483, startups: 1927, jobs: 38210, cities: 214 };
    var TODAY = { founders: 142, startups: 9, jobs: 611, cities: 3 };
    var extra = { founders: 0, startups: 0, jobs: 0, cities: 0 };
    var numEls = {}, deltaEls = {};
    Object.keys(BASE).forEach(function (k) {
      numEls[k] = $('[data-net="' + k + '"]', section);
      deltaEls[k] = $('[data-net-delta="' + k + '"]', section);
    });
    var nf = new Intl.NumberFormat('pt-BR');
    var IGN = 2.4; // duração da onda de ignição (s)

    var w = 0, h = 0, dpr = 1, nodes = [], extras = [], origin = null, initialCount = 0;
    var visible = false, q = 0, lastKey = '';
    var t0 = 0, u = -1; // u: segundos desde o desbloqueio (-1 = congelado)
    var spawned = 0, nextSpawn = 0, nextTick = 0, pulses = [], toastShown = false;

    function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }
    function mix(a, b, t) { return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))]; }
    function dot(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); }
    function setText(el, s) { if (el && el.textContent !== s) el.textContent = s; }

    // Grafo determinístico: cada nó se liga ao vizinho mais próximo que está mais perto do seu nó.
    function build() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      var F = w < 760 ? { x0: .05, x1: .97, y0: .3, y1: .58, ox: .1, oy: .54 } : { x0: .1, x1: .98, y0: .2, y1: .8, ox: .16, oy: .7 };
      var fx0 = F.x0 * w, fx1 = F.x1 * w, fy0 = F.y0 * h, fy1 = F.y1 * h;
      var area = (fx1 - fx0) * (fy1 - fy0);
      var n = Math.round(clamp(area / 3600, 70, 170)), spare = Math.round(n * .3);
      var md = Math.sqrt(area / (n + spare)) * .62;
      var seed = 11;
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      var pts = [{ x: F.ox * w, y: F.oy * h }];
      for (var tries = 0; pts.length < n + spare && tries < 9000; tries++) {
        var x = fx0 + rnd() * (fx1 - fx0), y = fy0 + rnd() * (fy1 - fy0), ok = true;
        for (var j = 0; j < pts.length && ok; j++) {
          var dx = pts[j].x - x, dy = pts[j].y - y;
          if (dx * dx + dy * dy < md * md) ok = false;
        }
        if (ok) pts.push({ x: x, y: y });
      }
      var o = pts[0];
      pts.forEach(function (p) { p.d = Math.hypot(p.x - o.x, p.y - o.y); });
      pts.sort(function (a, b) { return a.d - b.d; });
      var dMax = pts[pts.length - 1].d || 1;
      initialCount = Math.min(n, pts.length);
      extras = [];
      pts.forEach(function (p, k) {
        p.kids = 0; p.parent = -1; p.ign = 0; p.t = sstep(.12, .85, p.d / dMax); p.tw = rnd() * 6.28;
        if (!k) return;
        var best = -1, bd = Infinity, second = -1, sd = Infinity;
        for (var j = 0; j < k; j++) {
          var dd = Math.hypot(pts[j].x - p.x, pts[j].y - p.y);
          if (dd < bd) { second = best; sd = bd; best = j; bd = dd; } else if (dd < sd) { second = j; sd = dd; }
        }
        p.parent = best;
        pts[best].kids++;
        p.ign = pts[best].ign + .15 + bd / Math.max(w, h) * 2.4;
        if (second >= 0 && sd < md * 2.4 && rnd() < .4) extras.push([second, k]);
      });
      var igMax = 0, k;
      for (k = 0; k < initialCount; k++) igMax = Math.max(igMax, pts[k].ign);
      var s = IGN / (igMax || 1);
      pts.forEach(function (p, k) {
        p.ign *= s;
        p.start = k ? pts[p.parent].ign : 0;
        p.r = (k ? 1.5 : 4.5) + Math.sqrt(p.kids) * .8;
      });
      // Os nós mais distantes nascem depois, um por vez, enquanto a rede está viva.
      for (k = initialCount; k < pts.length; k++) {
        var born = k < initialCount + spawned;
        pts[k].start = born ? -10 : Infinity;
        pts[k].ign = born ? -9 : Infinity;
      }
      nodes = pts;
      origin = pts[0];
      lastKey = '';
    }

    function goLive(t, instant) {
      t0 = instant ? t - 100 : t;
      u = t - t0;
      nextSpawn = u + (instant ? .5 : IGN + 1);
      nextTick = u + (instant ? .3 : IGN + .4);
      section.classList.remove('is-frozen');
      section.classList.add('is-live');
      setText(you, 'Você · founder nº ' + nf.format(BASE.founders + 1));
    }

    function unlock(t) {
      netUnlocked = true;
      try { localStorage.setItem(NET_KEY, '1'); } catch (e) { /* armazenamento indisponível */ }
      goLive(t, reduced());
      document.dispatchEvent(new CustomEvent('ss:network-unlocked'));
      setTimeout(function () {
        toast.classList.add('is-on');
        setTimeout(function () { toast.classList.remove('is-on'); }, 5200);
      }, reduced() ? 0 : 1200);
    }

    // Rede viva: novos nós, pulsos de luz e contadores que não param.
    function step(dt) {
      if (u < IGN) return;
      if (u > nextSpawn && initialCount + spawned < nodes.length) {
        var p = nodes[initialCount + spawned];
        spawned++;
        p.start = u; p.ign = u + .7;
        extra.founders++;
        nextSpawn = u + 1 + Math.random() * 1.3;
      }
      if (u > nextTick) {
        if (Math.random() < .5) extra.founders++;
        extra.jobs += 1 + Math.floor(Math.random() * 7);
        if (Math.random() < .14) extra.startups++;
        if (Math.random() < .02) extra.cities++;
        nextTick = u + .45 + Math.random() * .7;
      }
      if (pulses.length < 36 && Math.random() < dt * 9) {
        var k = 1 + Math.floor(Math.random() * (initialCount + spawned - 1));
        if (nodes[k] && u > nodes[k].ign) pulses.push({ k: k, t: u, dur: .6 + Math.random() * .7 });
      }
      pulses = pulses.filter(function (pl) { return u - pl.t < pl.dur; });
    }

    function updateStats() {
      if (u < 0) return;
      var c = reduced() ? 1 : easeOut(clamp((u - .5) / 2.2, 0, 1));
      Object.keys(BASE).forEach(function (k) {
        setText(numEls[k], nf.format(Math.round(BASE[k] * c) + extra[k]));
        setText(deltaEls[k], '▲ +' + nf.format(Math.round(TODAY[k] * c) + extra[k]) + ' hoje');
      });
    }

    function draw() {
      var P = PAL[currentTheme()], live = u >= 0, rm = reduced();
      var k, p, a, col;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // Scroll: começa aproximada no seu nó e abre a rede conforme a página desce.
      var z = 1 + (1 - sstep(0, .75, q)) * .14;
      ctx.translate(origin.x, origin.y);
      ctx.scale(z, z);
      ctx.translate(-origin.x, -origin.y);

      // Fim da ponte: o tabuleiro chega pela esquerda até o seu nó.
      var deckA = live ? Math.min(1, u / .5) : 0;
      ctx.fillStyle = rgba(mix(P.idle, P.red, deckA), .35 + deckA * .5);
      ctx.beginPath();
      ctx.moveTo(-80, origin.y + 80);
      ctx.lineTo(origin.x - 6, origin.y + 3);
      ctx.lineTo(origin.x - 6, origin.y - 1);
      ctx.lineTo(-80, origin.y + 50);
      ctx.closePath();
      ctx.fill();
      for (k = 1; k < 7; k++) {
        var f = k / 7;
        ctx.fillStyle = rgba(live ? P.gold : P.idle, live ? .55 * deckA : .4);
        dot(lerp(-80, origin.x - 6, f), lerp(origin.y + 50, origin.y - 1, f) - 2, 1.2 + (1 - f) * 1.2);
      }

      // Onda de choque do desbloqueio.
      if (live && u < 2.4 && !rm) {
        for (var i = 0; i < 2; i++) {
          var e = (u - i * .3) / 1.9;
          if (e <= 0 || e >= 1) continue;
          ctx.beginPath();
          ctx.arc(origin.x, origin.y, easeOut(e) * Math.max(w, h) * .95, 0, 6.2832);
          ctx.strokeStyle = rgba(i ? P.gold : P.red, (1 - e) * .55);
          ctx.lineWidth = 2 * (1 - e) + .5;
          ctx.stroke();
        }
      }

      // Camada congelada: arestas tracejadas.
      ctx.setLineDash([2, 4]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = P.idleEdge;
      ctx.beginPath();
      for (k = 1; k < initialCount; k++) {
        p = nodes[k]; a = nodes[p.parent];
        if (live && u >= p.ign) continue;
        ctx.moveTo(a.x, a.y); ctx.lineTo(p.x, p.y);
      }
      extras.forEach(function (ed) {
        if (ed[1] >= initialCount) return;
        ctx.moveTo(nodes[ed[0]].x, nodes[ed[0]].y); ctx.lineTo(nodes[ed[1]].x, nodes[ed[1]].y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      if (live) {
        // A luz percorre cada aresta do pai até o filho.
        for (k = 1; k < nodes.length; k++) {
          p = nodes[k];
          if (!(u > p.start)) continue;
          a = nodes[p.parent];
          var pr = clamp((u - p.start) / (p.ign - p.start), 0, 1);
          col = mix(P.red, P.gold, p.t);
          ctx.strokeStyle = rgba(col, .5);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          var hx = lerp(a.x, p.x, pr), hy = lerp(a.y, p.y, pr);
          ctx.lineTo(hx, hy);
          ctx.stroke();
          if (pr < 1) { ctx.fillStyle = rgba(col, .9); dot(hx, hy, 1.6); }
        }
        extras.forEach(function (ed) {
          var m = Math.max(nodes[ed[0]].ign, nodes[ed[1]].ign);
          if (!(u > m)) return;
          ctx.strokeStyle = rgba(mix(P.red, P.gold, nodes[ed[1]].t), Math.min(1, (u - m) / .6) * .2);
          ctx.beginPath();
          ctx.moveTo(nodes[ed[0]].x, nodes[ed[0]].y);
          ctx.lineTo(nodes[ed[1]].x, nodes[ed[1]].y);
          ctx.stroke();
        });
        pulses.forEach(function (pl) {
          var b = nodes[pl.k], c = nodes[b.parent], e = (u - pl.t) / pl.dur;
          var x = lerp(c.x, b.x, e), y = lerp(c.y, b.y, e), cl = mix(P.red, P.gold, b.t);
          ctx.fillStyle = rgba(cl, .18 * P.halo); dot(x, y, 5);
          ctx.fillStyle = rgba(cl, .95); dot(x, y, 1.6);
        });
      }

      // Nós.
      for (k = 0; k < nodes.length; k++) {
        p = nodes[k];
        if (k >= initialCount && !(u > p.start)) continue;
        if (!live || u < p.ign) {
          ctx.fillStyle = rgba(P.idle, .9);
          dot(p.x, p.y, p.r * .85);
          continue;
        }
        var age = u - p.ign, pop = rm ? 1 : 1 + 1.6 * Math.exp(-age * 6);
        var tw = rm ? 1 : .8 + .2 * Math.sin(u * 1.7 + p.tw);
        col = k ? mix(P.red, P.gold, p.t) : P.red;
        if (p.r > 2.4 || pop > 1.3) { ctx.fillStyle = rgba(col, .14 * tw * P.halo); dot(p.x, p.y, p.r * 3.6 * pop); }
        ctx.fillStyle = rgba(col, .95 * tw);
        dot(p.x, p.y, p.r * pop);
      }

      // Seu nó: anel de origem.
      ctx.lineWidth = 1;
      if (live) {
        var ring = rm ? 0 : (u % 2.2) / 2.2;
        ctx.strokeStyle = rgba(P.red, .7 * (1 - ring));
        ctx.beginPath(); ctx.arc(origin.x, origin.y, 9 + ring * 16, 0, 6.2832); ctx.stroke();
      } else {
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = rgba(P.idle, .9);
        ctx.beginPath(); ctx.arc(origin.x, origin.y, 10, 0, 6.2832); ctx.stroke();
        ctx.setLineDash([]);
      }

      you.style.transform = 'translate(' + (origin.x - 10).toFixed(1) + 'px,' + (origin.y - 18).toFixed(1) + 'px) translateY(-100%)';
    }

    themeHandlers.push(function () { lastKey = ''; });
    observe(section, function (v) { visible = v; if (v) requestFrame(); });
    if (back) back.addEventListener('click', function () { if (crossing) crossing.goToStart(true); });

    function tick(t, dt) {
      if (!visible) return false;
      if (!w) build();
      var rect = section.getBoundingClientRect();
      q = clamp(-rect.top / Math.max(1, rect.height - window.innerHeight), 0, 1);
      if (u < 0 && netUnlocked) goLive(t, true);
      else if (u < 0 && bridgeCrossed && q > .06) unlock(t);
      if (u >= 0) u = t - t0;
      if (back) back.hidden = bridgeCrossed;
      head.style.transform = 'translate3d(0,' + (-q * 36).toFixed(1) + 'px,0)';

      var anim = u >= 0 && !reduced();
      if (anim) step(dt);
      updateStats();
      var key = [w, h, currentTheme(), q.toFixed(4), u >= 0].join('|');
      if (!anim && key === lastKey) return false;
      lastKey = key;
      draw();
      return anim;
    }

    return { tick: tick, resize: function () { w = 0; } };
  })();
  if (network) scenes.push(network);

  /* =========================================================
     A trilha completa — caminho browniano que se ilumina
     ========================================================= */
  (function () {
    var map = $('[data-trail]');
    if (!map) return;
    var svg = $('.trail__svg', map), base = $('[data-trail-base]', map), lit = $('[data-trail-lit]', map);
    var walker = $('[data-walker]', map), halo = $('[data-walker-halo]', map), topo = $('[data-topo]', map);
    var list = $('[data-trail-list]', map);
    var GAP = 150, PAD = 70;
    var nodes = [], samples = [], total = 1, Ls = 0, lastL = -1, built = false;

    // Retrato do palestrante principal de cada aula (sem foto livre disponível → iniciais).
    var PORTRAITS = [
      ['sam-altman'], ['paul-graham'], ['peter-thiel'], ['adora-cheung'], ['emmett-shear'],
      ['justin-kan'], [null, 'HR'], [null, 'KH'], [null, 'AS'], ['sam-altman'],
      [null, 'CL'], ['marc-andreessen'], [null, 'TB'], ['aaron-levie'], ['brian-chesky'],
      ['patrick-collison'], ['keith-rabois'], ['ben-horowitz'], ['reid-hoffman'], ['sam-altman']
    ];
    function avatar(i) {
      var pt = PORTRAITS[i];
      if (!pt) return '';
      return '<span class="tnode__avatar" aria-hidden="true">' +
        (pt[0] ? '<img src="assets/img/people/' + pt[0] + '.jpg" alt="" width="40" height="40" loading="lazy" decoding="async">' : '<b>' + pt[1] + '</b>') +
        '</span>';
    }

    // Itens da trilha (HTML real, acessível): um <li> por missão.
    list.innerHTML = LESSONS.map(function (l, i) {
      var firstOfStage = i === 0 || LESSONS[i - 1].stage !== l.stage;
      return '<li class="tnode">' +
        '<span class="tnode__dot" aria-hidden="true"></span>' +
        '<div class="tnode__card">' +
        (firstOfStage ? '<p class="tnode__stage mono">' + esc(stageLabel(l.stage)) + '</p>' : '') +
        '<p class="tnode__num mono">Missão ' + pad2(i + 1) + ' <span>· Aula ' + pad2(l.playlist) + '</span></p>' +
        '<h3 lang="en">' + esc(l.title) + '</h3>' +
        '<p class="tnode__meta">' + avatar(i) + '<span>' + esc(l.speakers) + '</span></p>' +
        '<p class="tnode__focus">' + esc(l.focus) + '</p>' +
        '</div></li>';
    }).join('');
    var items = $$('.tnode', list);

    function rng(seed) {
      return function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    }
    function gauss(r) { var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); }

    // Catmull-Rom → Bézier cúbica
    function smooth(pts) {
      var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ',' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) +
          ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ',' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) +
          ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
      }
      return d;
    }

    function build() {
      var W = map.clientWidth, H = PAD * 2 + GAP * (LESSONS.length - 1);
      if (W < 10) return;
      map.style.height = H + 'px';
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var r = rng(20141), x = 0.5, pts = [];
      nodes = LESSONS.map(function (l, i) {
        if (i) x = clamp(x + gauss(r) * 0.15 + (0.5 - x) * 0.25, 0.3, 0.7);
        return { x: x * W, y: PAD + i * GAP };
      });
      // Entre dois checkpoints: uma ponte browniana (começa e termina nos nós).
      nodes.forEach(function (n, i) {
        pts.push([n.x, n.y]);
        var m = nodes[i + 1];
        if (!m) return;
        var steps = 6, walk = [0], acc = 0;
        for (var k = 1; k <= steps; k++) { acc += gauss(r) * 16; walk.push(acc); }
        for (var j = 1; j < steps; j++) {
          var t = j / steps;
          var bx = walk[j] - t * walk[steps];
          pts.push([lerp(n.x, m.x, t) + bx, lerp(n.y, m.y, t) + gauss(r) * 4]);
        }
      });
      var d = smooth(pts);
      base.setAttribute('d', d);
      lit.setAttribute('d', d);
      total = lit.getTotalLength();
      lit.style.strokeDasharray = total + ' ' + total;

      // amostras para mapear "altura na tela" → comprimento do caminho
      samples = [];
      var maxY = -Infinity;
      for (var l = 0; l <= total; l += 6) {
        var p = lit.getPointAtLength(l);
        maxY = Math.max(maxY, p.y);
        samples.push({ l: l, y: maxY });
      }
      nodes.forEach(function (n) {
        var best = 0, bd = Infinity;
        samples.forEach(function (s, k) {
          var p = Math.abs(s.y - n.y);
          if (p < bd) { bd = p; best = s.l; }
        });
        n.l = best;
      });
      items.forEach(function (li, i) {
        var n = nodes[i];
        li.style.left = n.x.toFixed(1) + 'px';
        li.style.top = n.y.toFixed(1) + 'px';
        // card do lado oposto ao rumo do caminho (evita que a linha cruze o texto)
        var next = nodes[i + 1], prev = nodes[i - 1];
        var dir = next ? next.x - n.x : n.x - prev.x;
        var left = dir > 0;
        if (n.x - 340 < 0) left = false;
        if (n.x + 340 > W) left = true;
        li.classList.toggle('tnode--left', left);
        li.classList.toggle('tnode--right', !left);
      });

      // relevo topográfico discreto ao fundo
      var tr = rng(77), html = '';
      for (var c = 0; c < 5; c++) {
        var cx = (0.1 + tr() * 0.8) * W, cy = (0.08 + c * 0.2 + tr() * 0.08) * H;
        for (var ring = 1; ring <= 5; ring++) {
          var rad = ring * (26 + tr() * 8), seg = [];
          for (var a = 0; a < 12; a++) {
            var ang = a / 12 * 6.2832, rr = rad * (0.82 + tr() * 0.36);
            seg.push([cx + Math.cos(ang) * rr * 1.5, cy + Math.sin(ang) * rr]);
          }
          seg.push(seg[0], seg[1], seg[2]);
          html += '<path d="' + smooth(seg.slice(1)) + '"/>';
        }
      }
      topo.innerHTML = html;
      built = true;
      lastL = -1;
      requestFrame();
    }

    function lengthAtY(y) {
      if (!samples.length) return 0;
      var lo = 0, hi = samples.length - 1;
      if (y <= samples[0].y) return 0;
      if (y >= samples[hi].y) return total;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (samples[mid].y < y) lo = mid; else hi = mid; }
      return samples[hi].l;
    }

    build();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);

    scenes.push({
      tick: function (t, dt) {
        if (!built) return false;
        var rect = map.getBoundingClientRect(), vh = window.innerHeight;
        if (rect.bottom < -200 || rect.top > vh + 200) return false;
        var target = lengthAtY(vh * 0.62 - rect.top);
        Ls = reduced() ? target : Ls + (target - Ls) * (1 - Math.exp(-dt * 5));
        var moving = Math.abs(target - Ls) > 0.5;
        if (Math.abs(Ls - lastL) < 0.2) return moving;
        lastL = Ls;
        lit.style.strokeDashoffset = (total - Ls).toFixed(1);
        var p = lit.getPointAtLength(Math.max(0, Ls));
        walker.setAttribute('cx', p.x.toFixed(1)); walker.setAttribute('cy', p.y.toFixed(1));
        halo.setAttribute('cx', p.x.toFixed(1)); halo.setAttribute('cy', p.y.toFixed(1));
        map.classList.toggle('is-walking', Ls > 2 && Ls < total - 2);
        items.forEach(function (li, i) {
          var on = Ls >= nodes[i].l - 2;
          if (li._on !== on) {
            li._on = on;
            li.classList.toggle('is-lit', on);
            if (on && !reduced()) {
              li.classList.add('just-lit');
              setTimeout(function () { li.classList.remove('just-lit'); }, 1100);
            }
          }
          li.classList.toggle('is-current', on && (i === 19 || Ls < nodes[i + 1].l - 2));
        });
        return moving;
      }
    });
  })();

  /* =========================================================
     03 · Como funciona — linha de progressão
     ========================================================= */
  (function () {
    var track = $('.learn__track');
    if (!track) return;
    var steps = $$('.learn__step', track), lastP = -1;
    scenes.push({
      tick: function () {
        var r = track.getBoundingClientRect(), vh = window.innerHeight;
        if (r.bottom < 0 || r.top > vh) return false;
        var p = clamp((vh * 0.72 - r.top) / (r.height * 0.85), 0, 1);
        if (Math.abs(p - lastP) < 0.002) return false;
        lastP = p;
        track.style.setProperty('--p', p.toFixed(3));
        steps.forEach(function (s, i) { s.classList.toggle('is-on', p >= i * 0.45 + 0.02); });
        return false;
      }
    });
  })();

  /* =========================================================
     04 · Founder Passport (demonstrativo)
     ========================================================= */
  var floatTip = document.createElement('div');
  floatTip.className = 'float-tip';
  floatTip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(floatTip);
  function showFloat(el, html) {
    var r = el.getBoundingClientRect();
    floatTip.innerHTML = html;
    floatTip.style.left = (r.left + r.width / 2) + 'px';
    floatTip.style.top = r.top + 'px';
    floatTip.classList.add('is-on');
  }
  function hideFloat() { floatTip.classList.remove('is-on'); }
  window.addEventListener('scroll', hideFloat, { passive: true });

  (function () {
    var host = $('[data-passport]');
    if (!host) return;
    var game = SS.game;
    var today = game.startOfDay(new Date());

    // Histórico demonstrativo — os números exibidos são CALCULADOS a partir dele.
    var activity = (function () {
      var map = {}, seed = 7;
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      function set(off, n) { map[game.dayKey(game.addDays(today, -off))] = n; }
      for (var i = 0; i < 7; i++) set(i, 1 + Math.floor(rnd() * 3));
      for (var j = 40; j < 61; j++) set(j, 1 + Math.floor(rnd() * 3.4));
      [70, 74, 75, 81, 88, 93, 97, 104, 110, 111, 118, 126, 133, 140, 147, 160, 175, 190, 205, 230]
        .forEach(function (o) { set(o, 1 + Math.floor(rnd() * 2)); });
      return map;
    })();
    var progress = {
      completedLessons: LESSONS.slice(0, 7).map(function (l) { return l.id; }),
      completedChallenges: LESSONS.slice(0, 5).map(function (l) { return l.id; }),
      projects: 0,
      crossed: netUnlocked
    };

    var stats = game.streakStats(activity, today);
    var xp = game.computeXP(progress);
    var lvl = game.levelFor(xp);
    var achievements = game.evaluateAchievements(progress, stats);

    // Perfil (demonstrativo) — nome e foto editáveis aqui.
    var PROFILE = { name: 'Eric Boot', handle: 'ericboot', photo: 'assets/img/profile.jpg', startedDaysAgo: 62 };
    var prof = $('[data-profile]', host);
    if (prof) {
      var img = $('[data-avatar-img]', prof);
      img.src = PROFILE.photo;
      img.alt = 'Foto de perfil de ' + PROFILE.name;
      $('[data-profile-name]', prof).textContent = PROFILE.name;
      $('[data-profile-meta]', prof).textContent = '@' + PROFILE.handle + ' · Founder Level ' + pad2(lvl.level) + ' — ' + lvl.name;
      var started = game.addDays(today, -PROFILE.startedDaysAgo);
      $('[data-profile-since]', prof).textContent = 'Jornada iniciada em ' +
        new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(started);
      $('[data-avatar-lvl]', prof).textContent = 'LV ' + pad2(lvl.level);
      $('[data-chip="xp"]', prof).textContent = xp.toLocaleString('pt-BR');
      $('[data-chip="streak"]', prof).textContent = stats.current + ' dias';
      $('[data-chip="badges"]', prof).textContent = achievements.filter(function (a) { return a.unlocked; }).length + ' / ' + achievements.length;
      $('[data-chip="projects"]', prof).textContent = progress.projects;
      var ring = $('[data-avatar-ring]', prof), C = 2 * Math.PI * 47;
      ring.style.strokeDasharray = C.toFixed(1);
      ring.style.strokeDashoffset = C.toFixed(1);
      prof._ring = function () { ring.style.strokeDashoffset = (C * (1 - lvl.ratio)).toFixed(1); };
    }

    $('[data-level-num]', host).textContent = pad2(lvl.level);
    $('[data-level-name]', host).textContent = lvl.name;
    $('[data-xp-text]', host).textContent = xp.toLocaleString('pt-BR') + ' XP';
    $('[data-xp-next]', host).textContent = lvl.next ? 'Próximo nível: ' + lvl.next.xp.toLocaleString('pt-BR') : 'Nível máximo';
    var xpBar = $('[data-xp-bar]', host);
    $('[data-ladder]', host).innerHTML = SS.LEVELS.map(function (L) {
      var cls = L.level < lvl.level ? 'is-done' : L.level === lvl.level ? 'is-current' : '';
      return '<li class="' + cls + '" tabindex="0" data-tip="' + esc(L.name) + '|' + L.xp + '">' + pad2(L.level) + '</li>';
    }).join('');

    $('[data-stat="current"]', host).textContent = stats.current;
    $('[data-stat="longest"]', host).textContent = stats.longest;
    $('[data-stat="active"]', host).textContent = stats.activeDays;

    // Calendário estilo GitHub
    var cal = $('[data-cal]', host);
    var fmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
    function renderCal(range) {
      var start = game.addDays(today, -(range - 1));
      var lead = start.getDay();
      var cells = [], total = range + lead;
      for (var i = 0; i < lead; i++) cells.push('<i class="pad"></i>');
      var active = 0;
      for (var d = 0; d < range; d++) {
        var day = game.addDays(start, d), k = game.dayKey(day), n = activity[k] || 0;
        if (n) active++;
        var lv = n >= 4 ? 4 : n;
        cells.push('<i class="l' + lv + (d === range - 1 ? ' today' : '') + '" data-d="' + k + '" style="--n:' + d + '"></i>');
      }
      var cols = Math.ceil(total / 7);
      var avail = cal.clientWidth || 600;
      var gap = range > 100 ? 3 : 4;
      var size = clamp(Math.floor((avail - gap * (cols - 1)) / cols), 5, 22);
      cal.style.setProperty('--cell', size + 'px');
      cal.style.setProperty('--cal-gap', gap + 'px');
      cal.innerHTML = cells.join('');
      var label = range === 365 ? 'no último ano' : 'nos últimos ' + range + ' dias';
      cal.setAttribute('aria-label', 'Calendário de atividades: ' + active + ' dias ativos ' + label + '. Dados demonstrativos.');
    }
    var range = 90;
    renderCal(range);
    $$('[data-range]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        range = Number(b.getAttribute('data-range'));
        $$('[data-range]', host).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
        renderCal(range);
      });
    });
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { renderCal(range); }, 150); });
    cal.addEventListener('pointerover', function (e) {
      var k = e.target.getAttribute && e.target.getAttribute('data-d');
      if (!k) return;
      var p = k.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]), n = activity[k] || 0;
      showFloat(e.target, fmt.format(d) + ' — ' + (n ? n + (n > 1 ? ' atividades concluídas' : ' atividade concluída') : 'nenhuma atividade'));
    });
    cal.addEventListener('pointerleave', hideFloat);

    // Conquistas
    var ICONS = {
      commit: '<circle cx="24" cy="24" r="5"/><path d="M10 24h9M29 24h9"/>',
      users: '<circle cx="19" cy="20" r="4"/><circle cx="29" cy="20" r="4"/><path d="M12 32c1.5-4 4-6 7-6s5.5 2 7 6M22 32c1.5-4 4-6 7-6s5.5 2 7 6"/>',
      ship: '<path d="M16 27l8-8 8 8M16 34l8-8 8 8M24 13v6"/>',
      cube: '<path d="M24 13l10 5.8v11.4L24 36l-10-5.8V18.8z"/><path d="M24 24.6l10-5.8M24 24.6V36M24 24.6l-10-5.8"/>',
      streak: '<path d="M14 30h3v-4h-3zM19.5 30h3v-7h-3zM25 30h3v-10h-3zM30.5 30h3v-13h-3z"/>',
      one: '<circle cx="19" cy="24" r="6"/><path d="M31 18v12M28.5 20l2.5-2"/>',
      network: '<circle cx="17" cy="29" r="3"/><circle cx="31" cy="17" r="2.5"/><circle cx="33" cy="31" r="2.5"/><circle cx="21" cy="16" r="2"/><path d="M19.5 27l9.5-8.5M20 29.5l10.5 1.2M18 26.2l2.4-8.3"/>'
    };
    var badgeHost = $('[data-badges]', host);
    badgeHost.innerHTML = achievements.map(function (a) {
      return '<button type="button" class="badge' + (a.unlocked ? ' is-unlocked' : '') + '" data-badge="' + a.def.id + '" aria-label="' +
        esc(a.def.name + ': ' + a.def.desc + (a.unlocked ? ' Desbloqueada.' : ' Bloqueada.')) + '">' +
        '<svg viewBox="0 0 48 48" aria-hidden="true"><path class="b-frame" d="M24 2l20 11v22L24 46 4 35V13z"/><g class="b-icon">' + ICONS[a.def.icon] + '</g></svg>' +
        '<span>' + esc(a.def.name) + '</span></button>';
    }).join('');
    $('[data-badge-count]', host).textContent = achievements.filter(function (a) { return a.unlocked; }).length + ' / ' + achievements.length;
    // A travessia desbloqueia o Network Effect ao vivo.
    document.addEventListener('ss:network-unlocked', function () {
      progress.crossed = true;
      achievements = game.evaluateAchievements(progress, stats);
      var a = achievements.find(function (x) { return x.def.id === 'network-effect'; });
      var b = $('[data-badge="network-effect"]', badgeHost);
      if (b && a.unlocked) {
        b.classList.add('is-unlocked', 'just-unlocked');
        b.setAttribute('aria-label', a.def.name + ': ' + a.def.desc + ' Desbloqueada.');
      }
      var count = achievements.filter(function (x) { return x.unlocked; }).length + ' / ' + achievements.length;
      $('[data-badge-count]', host).textContent = count;
      if (prof) $('[data-chip="badges"]', prof).textContent = count;
    });
    function badgeTip(el) {
      var a = achievements.find(function (x) { return x.def.id === el.getAttribute('data-badge'); });
      showFloat(el, '<b>' + esc(a.def.name) + '</b>' + esc(a.def.desc) + (a.unlocked ? '' : ' (bloqueada)'));
    }
    function ladderTip(el) {
      var p = el.getAttribute('data-tip').split('|');
      showFloat(el, '<b>' + esc(p[0]) + '</b>A partir de ' + Number(p[1]).toLocaleString('pt-BR') + ' XP');
    }
    $$('.badge', badgeHost).forEach(function (b) {
      b.addEventListener('pointerenter', function () { badgeTip(b); });
      b.addEventListener('focus', function () { badgeTip(b); });
      b.addEventListener('click', function () { badgeTip(b); });
      b.addEventListener('pointerleave', hideFloat);
      b.addEventListener('blur', hideFloat);
    });
    $$('[data-ladder] li', host).forEach(function (li) {
      li.addEventListener('pointerenter', function () { ladderTip(li); });
      li.addEventListener('focus', function () { ladderTip(li); });
      li.addEventListener('pointerleave', hideFloat);
      li.addEventListener('blur', hideFloat);
    });

    // Jornada
    var done = progress.completedLessons.length;
    $('[data-j-done]', host).textContent = pad2(done);
    $('[data-j-pct]', host).textContent = Math.round(done / 20 * 100) + '% concluído';
    var ticks = '';
    for (var i = 0; i < 20; i++) ticks += '<i class="' + (i < done ? 'is-done' : i === done ? 'is-next' : '') + '"></i>';
    $('[data-ticks]', host).innerHTML = ticks;
    var next = LESSONS[done];
    $('[data-next-title]', host).textContent = 'Missão ' + pad2(done + 1) + ' — ' + next.title;
    $('[data-next-stage]', host).textContent = stageLabel(next.stage);

    // Primeira visualização: barra de XP + toast de conquista
    var shown = false;
    observe(host, function (vis) {
      if (!vis || shown) return;
      shown = true;
      xpBar.style.transform = 'scaleX(' + lvl.ratio.toFixed(3) + ')';
      if (prof && prof._ring) prof._ring();
      var a = achievements.find(function (x) { return x.def.id === 'consistency' && x.unlocked; });
      if (!a) return;
      var toast = $('[data-toast]', host);
      $('[data-toast-title]', host).textContent = a.def.name;
      $('[data-toast-quote]', host).textContent = '“' + a.def.quote + '”';
      setTimeout(function () {
        toast.classList.add('is-on');
        var b = $('[data-badge="consistency"]', host);
        if (b) b.classList.add('just-unlocked');
        setTimeout(function () { toast.classList.remove('is-on'); }, 4800);
      }, 1100);
    }, { threshold: 0.35 });
  })();

  /* =========================================================
     05 · Evolução de uma startup — maquete isométrica
     ========================================================= */
  (function () {
    var section = $('#evolucao'), svg = $('[data-iso]');
    if (!section || !svg) return;
    var EVO = [
      { name: 'IDEA', desc: 'Um problema que incomoda você — e outras pessoas.', users: 1, team: 1 },
      { name: 'VALIDATION', desc: 'Conversas reais antes de qualquer linha de código.', users: 12, team: 1 },
      { name: 'MVP', desc: 'A menor versão capaz de testar sua hipótese.', users: 100, team: 2 },
      { name: 'PRODUCT-MARKET FIT', desc: 'Quando as pessoas começam a puxar o produto.', users: 2500, team: 4 },
      { name: 'PRE-SEED', desc: 'Primeiros recursos, primeira equipe, fundamentos.', users: 12000, team: 8 },
      { name: 'SEED', desc: 'Um modelo de negócio que começa a se repetir.', users: 90000, team: 25 },
      { name: 'SERIES A', desc: 'Escala, métricas e operação.', users: 800000, team: 120 },
      { name: 'IPO', desc: 'Uma empresa construída para durar.', users: 12000000, team: 2000 }
    ];
    var S = 26, C = Math.cos(Math.PI / 6);
    function X(x, y) { return (x - y) * C * S; }
    function Y(x, y, z) { return (x + y) * 0.5 * S - z * S; }
    function P(x, y, z) { return X(x, y).toFixed(1) + ',' + Y(x, y, z).toFixed(1); }
    function poly(cls, pts) { return '<polygon class="' + cls + '" points="' + pts.join(' ') + '"/>'; }
    function seg(cls, a, b, extra) {
      return '<line class="' + cls + '" x1="' + X(a[0], a[1]).toFixed(1) + '" y1="' + Y(a[0], a[1], a[2]).toFixed(1) +
        '" x2="' + X(b[0], b[1]).toFixed(1) + '" y2="' + Y(b[0], b[1], b[2]).toFixed(1) + '"' + (extra || '') + '/>';
    }
    var wr = (function (seed) { return function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; })(99);

    function boxSvg(x, y, z, w, d, h, win) {
      var out = poly('f-r', [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)]) +
        poly('f-l', [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)]) +
        poly('f-top', [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]);
      if (win) {
        // faixas de janelas — algumas acendem e apagam devagar
        for (var zz = z + 0.45; zz < z + h - 0.25; zz += 0.55) {
          var lit1 = wr() < 0.32, lit2 = wr() < 0.32;
          out += seg('win' + (lit1 ? ' win--lit' : ''), [x + w, y + 0.18, zz], [x + w, y + d - 0.18, zz], lit1 ? ' style="--wd:' + (wr() * 6).toFixed(2) + 's"' : '');
          out += seg('win' + (lit2 ? ' win--lit' : ''), [x + 0.18, y + d, zz], [x + w - 0.18, y + d, zz], lit2 ? ' style="--wd:' + (wr() * 6).toFixed(2) + 's"' : '');
        }
      }
      return out;
    }

    // [estágio, x, y, z, w, d, h, acento, janelas]
    var BOXES = [
      [0, 7, 7, 0, 1, 1, 1, true],
      [1, 4.4, 7.2, 0, 0.6, 0.6, 0.6], [1, 9.8, 7.2, 0, 0.6, 0.6, 0.6], [1, 7.2, 4.4, 0, 0.6, 0.6, 0.6], [1, 7.2, 9.8, 0, 0.6, 0.6, 0.6],
      [2, 3.8, 3.4, 0, 2.2, 2.2, 1.6, false, true],
      [3, 8.6, 2.2, 0, 1.6, 1.6, 4.2, false, true], [3, 8.6, 2.2, 4.2, 1.6, 1.6, 0.35, true],
      [4, 3.8, 3.4, 1.6, 2.2, 2.2, 1.2, false, true], [4, 1.6, 7.6, 0, 1.6, 2.4, 1.4, false, true],
      [5, 1.2, 1.2, 0, 1.6, 1.6, 2.8, false, true], [5, 10.2, 5.4, 0, 1.2, 1.2, 2.2, false, true],
      [5, 9.4, 9.8, 0, 1.6, 1.2, 0.9], [5, 4.6, 9.6, 0, 1.8, 1.2, 1.2, false, true],
      [6, 5.6, 0.6, 0, 1.8, 1.8, 6.2, false, true], [6, 10.4, 0.6, 0, 1.1, 1.1, 3.0, false, true],
      [6, 1.4, 10.2, 0, 1.2, 1.2, 2.6, false, true], [6, 10.6, 8.2, 0, 1.0, 1.0, 3.4, false, true],
      [6, 4.1, 3.7, 2.8, 1.6, 1.6, 1.4, false, true],
      [7, 1.2, 4.4, 0, 1.3, 1.3, 9.2, false, true], [7, 1.2, 4.4, 9.2, 1.3, 1.3, 0.5, true],
      [7, 8.85, 2.45, 4.55, 1.1, 1.1, 2.4, false, true], [7, 6.0, 1.0, 6.2, 1.0, 1.0, 1.8, false, true]
    ];

    var html = '<g class="iso__world">';
    // placa base com grade
    html += '<g>' + poly('plate-r', [P(12, 0, 0), P(12, 12, 0), P(12, 12, -0.5), P(12, 0, -0.5)]) +
      poly('plate-l', [P(0, 12, 0), P(12, 12, 0), P(12, 12, -0.5), P(0, 12, -0.5)]) +
      poly('plate-top', [P(0, 0, 0), P(12, 0, 0), P(12, 12, 0), P(0, 12, 0)]);
    for (var g = 1; g < 12; g++) html += seg('grid-line', [g, 0, 0], [g, 12, 0]) + seg('grid-line', [0, g, 0], [12, g, 0]);
    html += '</g>';
    // linha de varredura percorrendo a maquete
    html += '<g class="scan" style="--sx:' + X(12, 0).toFixed(1) + 'px;--sy:' + Y(12, 0, 0).toFixed(1) + 'px">' + seg('scan__line', [0, 0, 0], [0, 12, 0]) + '</g>';

    var uid = 0;
    function flow(stage, pts, cls, dur, n) {
      var id = 'evo-path-' + (uid++);
      var d = 'M' + pts.map(function (p) { return P(p[0], p[1], p[2]); }).join(' L');
      var out = '<g class="el" data-s="' + stage + '"><path id="' + id + '" class="' + cls + '" d="' + d + '"/>';
      for (var k = 0; k < (n || 1); k++) {
        out += '<circle class="pulse" r="2.4"><animateMotion dur="' + dur + 's" begin="' + (-k * dur / (n || 1)).toFixed(2) + 's" repeatCount="indefinite"><mpath href="#' + id + '"/></animateMotion></circle>';
      }
      return out + '</g>';
    }
    // validação: sinais indo e voltando entre a ideia e os usuários
    html += flow(1, [[7.5, 7.5, 0], [4.7, 7.5, 0]], 'link', 1.8) + flow(1, [[7.5, 7.5, 0], [10.1, 7.5, 0]], 'link', 2.1) +
      flow(1, [[7.5, 7.5, 0], [7.5, 4.7, 0]], 'link', 1.6) + flow(1, [[7.5, 7.5, 0], [7.5, 10.1, 0]], 'link', 2.3);
    // seed: ruas conectando a operação
    html += flow(5, [[7.5, 7.5, 0], [2.4, 7.5, 0], [2.4, 2.0, 0]], 'road', 4.2, 2) +
      flow(5, [[7.5, 7.5, 0], [7.5, 6.0, 0], [10.8, 6.0, 0]], 'road', 3.2, 2) +
      flow(5, [[7.5, 7.5, 0], [5.5, 7.5, 0], [5.5, 10.2, 0]], 'road', 3.6, 2) +
      flow(6, [[9.4, 3.0, 0], [6.5, 3.0, 0], [6.5, 1.5, 0]], 'road', 3.0, 2);

    var order = BOXES.map(function (b, i) { return { b: b, i: i }; }).sort(function (a, c) {
      var A = a.b, B = c.b;
      return (A[1] + A[4] / 2 + A[2] + A[5] / 2 + A[3] * 0.01) - (B[1] + B[4] / 2 + B[2] + B[5] / 2 + B[3] * 0.01);
    });
    var stagger = {};
    BOXES.forEach(function (b) { stagger[b[0]] = 0; });
    var delays = BOXES.map(function (b) { var dl = stagger[b[0]]++ * 0.12 + (b[3] > 0 ? 0.25 : 0); return dl; });
    order.forEach(function (o) {
      var b = o.b;
      html += '<g class="el grow' + (b[7] ? ' accent' : '') + '" data-s="' + b[0] + '" style="--d:' + delays[o.i].toFixed(2) + 's">' +
        boxSvg(b[1], b[2], b[3], b[4], b[5], b[6], b[8]) + '</g>';
    });

    // cabos de suspensão entre as torres — a Golden Gate dentro da empresa
    function cable(stage, a, m, b) {
      var id = 'evo-path-' + (uid++);
      return '<g class="el" data-s="' + stage + '"><path id="' + id + '" class="cable" d="M' + P(a[0], a[1], a[2]) + ' Q' + P(m[0], m[1], m[2]) + ' ' + P(b[0], b[1], b[2]) + '"/>' +
        '<circle class="pulse pulse--hot" r="2.6"><animateMotion dur="2.6s" repeatCount="indefinite"><mpath href="#' + id + '"/></animateMotion></circle></g>';
    }
    html += cable(6, [9.4, 3.0, 4.55], [8.0, 2.3, 3.6], [6.5, 1.5, 6.2]);
    html += cable(7, [1.85, 5.05, 9.7], [4.2, 3.3, 6.0], [6.5, 1.5, 6.2]);
    // farol do IPO
    var bx = X(1.85, 5.05).toFixed(1), by = Y(1.85, 5.05, 9.7).toFixed(1);
    html += '<g class="el" data-s="7"><circle class="beacon" cx="' + bx + '" cy="' + by + '" r="4">' +
      '<animate attributeName="r" values="4;34" dur="2.4s" repeatCount="indefinite"/>' +
      '<animate attributeName="opacity" values=".9;0" dur="2.4s" repeatCount="indefinite"/></circle>' +
      '<circle class="beacon__core" cx="' + bx + '" cy="' + by + '" r="3"/></g>';
    html += '<g data-bursts></g></g>';
    svg.innerHTML = html;
    var els = $$('.el', svg), bursts = $('[data-bursts]', svg);

    var rail = $('[data-evo-rail]');
    rail.innerHTML = EVO.map(function (e, i) {
      return '<li><button type="button" aria-label="Etapa ' + (i + 1) + ': ' + esc(e.name) + '"><span>' + pad2(i + 1) + '</span> ' + esc(e.name) + '</button></li>';
    }).join('');
    var railItems = $$('li', rail);
    railItems.forEach(function (li, i) {
      $('button', li).addEventListener('click', function () {
        var top = section.getBoundingClientRect().top + window.scrollY;
        var total = section.offsetHeight - window.innerHeight;
        window.scrollTo({ top: top + total * ((i + 0.5) / EVO.length), behavior: reduced() ? 'instant' : 'smooth' });
      });
    });

    // HUD: contadores ilustrativos
    var fmtCompact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
    var hud = { users: $('[data-hud="users"]'), team: $('[data-hud="team"]'), blocks: $('[data-hud="blocks"]') };
    var hudVal = { users: 1, team: 1, blocks: 1 }, hudFrom = {}, hudTo = {}, hudT0 = 0, hudRaf = 0;
    function hudRender(k, v) {
      hud[k].textContent = k === 'users' ? fmtCompact.format(Math.round(v)) : Math.round(v).toLocaleString('pt-BR') + (k === 'team' && v >= 2000 ? '+' : '');
    }
    function hudStep() {
      var t = clamp((now() - hudT0) / 1.1, 0, 1), e = easeOut(t);
      Object.keys(hudTo).forEach(function (k) {
        // interpolação logarítmica — o crescimento parece exponencial, como deve
        var a = Math.log(hudFrom[k] + 1), b = Math.log(hudTo[k] + 1);
        hudVal[k] = Math.exp(lerp(a, b, e)) - 1;
        hudRender(k, hudVal[k]);
      });
      hudRaf = t < 1 ? requestAnimationFrame(hudStep) : 0;
    }
    function hudGo(i) {
      var blocks = BOXES.filter(function (b) { return b[0] <= i; }).length;
      hudFrom = { users: hudVal.users, team: hudVal.team, blocks: hudVal.blocks };
      hudTo = { users: EVO[i].users, team: EVO[i].team, blocks: blocks };
      if (reduced()) { Object.keys(hudTo).forEach(function (k) { hudVal[k] = hudTo[k]; hudRender(k, hudTo[k]); }); return; }
      hudT0 = now();
      if (!hudRaf) hudRaf = requestAnimationFrame(hudStep);
    }

    function burst(i) {
      if (reduced()) return;
      var bs = BOXES.filter(function (b) { return b[0] === i; });
      if (!bs.length) return;
      var cx = 0, cy = 0;
      bs.forEach(function (b) { cx += b[1] + b[4] / 2; cy += b[2] + b[5] / 2; });
      cx /= bs.length; cy /= bs.length;
      var r = 1.4, el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      el.setAttribute('class', 'burst');
      el.setAttribute('points', [P(cx - r, cy - r, 0), P(cx + r, cy - r, 0), P(cx + r, cy + r, 0), P(cx - r, cy + r, 0)].join(' '));
      bursts.appendChild(el);
      setTimeout(function () { el.remove(); }, 1400);
    }

    var stageBox = $('.evo__stage', section), numEl = $('[data-evo-num]'), nameEl = $('[data-evo-name]'), descEl = $('[data-evo-desc]');
    var current = -1, swapTimer;
    function setStage(i) {
      if (i === current) return;
      var forward = i > current;
      current = i;
      els.forEach(function (el) { el.classList.toggle('on', Number(el.getAttribute('data-s')) <= i); });
      railItems.forEach(function (li, k) {
        li.classList.toggle('is-done', k < i);
        li.classList.toggle('is-current', k === i);
      });
      numEl.textContent = pad2(i + 1) + ' / 08';
      stageBox.classList.add('is-swapping');
      clearTimeout(swapTimer);
      swapTimer = setTimeout(function () {
        nameEl.textContent = EVO[i].name;
        descEl.textContent = EVO[i].desc;
        stageBox.classList.remove('is-swapping');
      }, reduced() ? 0 : 180);
      hudGo(i);
      if (forward) burst(i);
    }
    setStage(0);

    // parallax suave com o mouse e com o scroll
    var art = $('.evo__art', section), mouse = [0, 0], cur = [0, 0], lastF = -1;
    if (mqHover.matches) {
      section.addEventListener('pointermove', function (e) {
        mouse[0] = e.clientX / window.innerWidth * 2 - 1;
        mouse[1] = e.clientY / window.innerHeight * 2 - 1;
        requestFrame();
      }, { passive: true });
    }
    scenes.push({
      tick: function (t, dt) {
        var r = section.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return false;
        var total = Math.max(1, r.height - window.innerHeight);
        var p = clamp(-r.top / total, 0, 0.9999);
        var f = p * EVO.length;
        setStage(Math.floor(f));
        if (Math.abs(f - lastF) > 0.002) {
          lastF = f;
          railItems[current].style.setProperty('--f', (f - current).toFixed(3));
        }
        var k = reduced() ? 1 : 1 - Math.exp(-dt * 3);
        cur[0] += (mouse[0] - cur[0]) * k;
        cur[1] += (mouse[1] - cur[1]) * k;
        art.style.setProperty('--px', (cur[0] * -14).toFixed(2) + 'px');
        art.style.setProperty('--py', (cur[1] * -10 + (p - 0.5) * -40).toFixed(2) + 'px');
        art.style.setProperty('--rot', (cur[0] * 2).toFixed(2) + 'deg');
        return Math.abs(mouse[0] - cur[0]) + Math.abs(mouse[1] - cur[1]) > 0.001;
      }
    });
  })();

  /* =========================================================
     06 · Chamada final — a ponte vista de longe, caminho iluminado
     ========================================================= */
  (function () {
    var section = $('.finale'), canvas = $('.finale__canvas');
    if (!canvas || !canvas.getContext) return;
    var view = new SS.BridgeView(canvas, { checkpointZ: G.DECK_HW - 0.6, path: true, land: true, fogStart: 1600, fogEnd: 9000, fogMax: 0.75, lowFog: 0.8 });
    view.setTheme(currentTheme());
    var visible = false, t0 = -1, lastKey = '', mouse = 0, cur = 0;
    themeHandlers.push(function (t) { view.setTheme(t); lastKey = ''; });
    observe(section, function (v, e) {
      visible = v;
      if (v && t0 < 0 && e.intersectionRatio > 0.3) t0 = now();
      if (v) requestFrame();
    }, { threshold: [0, 0.35] });
    if (mqHover.matches) {
      window.addEventListener('pointermove', function (e) {
        if (!visible) return;
        mouse = e.clientX / window.innerWidth * 2 - 1;
        requestFrame();
      }, { passive: true });
    }
    scenes.push({
      resize: function () { view.resize(); lastKey = ''; },
      tick: function (t, dt) {
        if (!visible) return false;
        var anim = false;
        cur += (mouse - cur) * (reduced() ? 1 : 1 - Math.exp(-dt * 2));
        if (Math.abs(mouse - cur) > 0.001) anim = true;
        var path = 0;
        if (t0 >= 0) {
          path = reduced() ? 1 : easeInOut(clamp((now() - t0 - 0.3) / 2.8, 0, 1));
          if (path < 1) anim = true;
        }
        var tw = path >= 1 && !reduced() ? Math.round(now() * 20) / 20 : -1;
        if (tw >= 0) anim = true;
        var key = [cur.toFixed(4), path.toFixed(4), view.theme, view.w, view.h, tw].join('|');
        if (key === lastKey) return anim;
        lastKey = key;
        view.state.twinkle = tw;
        var c = byAspect(view.w, view.h, CAMS.finale.wide, CAMS.finale.tall);
        view.setCamera(V.add(c.pos, [cur * 120, 0, 0]), c.target, c.fov);
        view.state.path = path;
        view.state.lit = Math.floor(path * 20 + 0.001);
        view.render();
        return anim;
      }
    });
  })();

  applyTheme(currentTheme(), false);
  requestFrame();

  // Ganchos de inspeção para ajuste fino das câmeras (somente leitura em produção).
  SS.debug = { cams: CAMS, redraw: function () { scenes.forEach(function (s) { if (s.resize) s.resize(); }); requestFrame(); } };
})();
