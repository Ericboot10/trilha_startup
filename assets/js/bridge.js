/*
 * Golden Gate — renderizador 2.5D em Canvas 2D.
 *
 * A ponte é descrita em metros (x ao longo do vão, y para cima, z lateral),
 * projetada por uma câmera em perspectiva e desenhada com o algoritmo do
 * pintor. Sem WebGL nem modelos 3D: leve, nítido e fácil de manter.
 * A cena só é redesenhada quando a câmera ou o estado mudam.
 */
(function () {
  'use strict';
  var SS = (window.SS = window.SS || {});

  var G = {
    TOWER_H: 227, SADDLE: 224, DECK_Y: 67, DECK_T: 7.6, DECK_HW: 14.5,
    CABLE_Z: 16, SPAN: 1280, SIDE: 343, CABLE_LOW: 72
  };
  G.X_START = -G.SIDE - 70;
  G.X_END = G.SPAN + G.SIDE + 70;
  SS.BRIDGE = G;

  /* Posição (x) de cada checkpoint ao longo do tabuleiro. */
  SS.checkpointX = function (i, n) {
    n = n || 20;
    var a = -G.SIDE + 60, b = G.SPAN + G.SIDE - 60;
    return a + (b - a) * (i / (n - 1));
  };

  function cableY(x) {
    if (x >= 0 && x <= G.SPAN) {
      var t = (x - G.SPAN / 2) / (G.SPAN / 2);
      return G.CABLE_LOW + (G.SADDLE - G.CABLE_LOW) * t * t;
    }
    var u = Math.min(1, x < 0 ? -x / G.SIDE : (x - G.SPAN) / G.SIDE);
    var anchor = G.DECK_Y + 3;
    return G.SADDLE + (anchor - G.SADDLE) * u - 22 * Math.sin(Math.PI * u);
  }

  /* ---------- vetores ---------- */
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  SS.vec = { sub: sub, add: add, scale: scale, norm: norm };

  /* ---------- cores ---------- */
  function hex(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function shadec(a, k) { return [Math.min(255, a[0] * k), Math.min(255, a[1] * k), Math.min(255, a[2] * k)]; }
  function css(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : a) + ')'; }

  var RAW = {
    dark: {
      skyTop: '#03040a', skyHorizon: '#161a26', waterHorizon: '#0e1118', water: '#05060a',
      fog: '#15171c', hills: '#0b0c0f', hillsFar: '#111216',
      bridge: '#D9463B', deck: '#A9352D', pier: '#26262a', lamp: '#FFD6A6', red: '#E5483D', locked: '#4a4b4f',
      land: '#2a2c32', landEdge: '#62666f',
      reflect: 0.22, glow: 1, lowFog: 0.55
    },
    light: {
      skyTop: '#A9CBE6', skyHorizon: '#FCE4C2', waterHorizon: '#EBD9C0', water: '#C4C2B8',
      fog: '#F2E7D8', hills: '#BDB2A1', hillsFar: '#D3C9BA',
      bridge: '#C83F35', deck: '#A5352C', pier: '#B3AA9D', lamp: '#FFFFFF', red: '#C83F35', locked: '#A39B90',
      land: '#D8D0C3', landEdge: '#F2EDE4',
      reflect: 0.16, glow: 0, lowFog: 0.6
    }
  };
  var PAL = {};
  Object.keys(RAW).forEach(function (k) {
    var o = {}, r = RAW[k];
    Object.keys(r).forEach(function (p) { o[p] = typeof r[p] === 'string' ? hex(r[p]) : r[p]; });
    PAL[k] = o;
  });

  /* ---------- geometria (construída uma vez) ---------- */
  var FACES = [
    { n: [1, 0, 0], i: [1, 3, 7, 5], s: 0.80 },
    { n: [-1, 0, 0], i: [0, 4, 6, 2], s: 0.62 },
    { n: [0, 1, 0], i: [2, 6, 7, 3], s: 1.06 },
    { n: [0, -1, 0], i: [0, 1, 5, 4], s: 0.42 },
    { n: [0, 0, 1], i: [4, 5, 7, 6], s: 0.93 },
    { n: [0, 0, -1], i: [0, 2, 3, 1], s: 0.74 }
  ];

  function range(a, b, n) { var out = []; for (var i = 0; i <= n; i++) out.push(a + (b - a) * (i / n)); return out; }

  function ridge(seed, xBase, xAmp, z0, z1, n, hBase, hAmp) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      var y = hBase + hAmp * (0.55 * Math.sin(t * 9 + seed * 2) + 0.3 * Math.sin(t * 23 + seed) + 0.15 * Math.sin(t * 47 + seed * 3));
      pts.push([xBase + xAmp * Math.sin(t * 5 + seed), Math.max(8, y), z0 + (z1 - z0) * t]);
    }
    return pts;
  }

  var GEO = (function () {
    var boxes = [];
    function box(cx, cy, cz, hx, hy, hz, tone, detail) {
      boxes.push({ c: [cx, cy, cz], h: [hx, hy, hz], tone: tone, detail: detail || null });
    }
    [0, G.SPAN].forEach(function (X) {
      box(X, 4, 0, 24, 9, 30, 'pier');
      var segs = [[13, 62, 9.5, 5.2], [62, 104, 8.6, 4.6], [104, 146, 7.8, 4.2], [146, 187, 7.0, 3.8], [187, 227, 6.2, 3.4]];
      [-1, 1].forEach(function (s) {
        segs.forEach(function (sg) {
          box(X, (sg[0] + sg[1]) / 2, s * G.CABLE_Z, sg[2], (sg[1] - sg[0]) / 2, sg[3], 'bridge', 'groove');
        });
      });
      [[44, 51], [99, 105], [141, 147], [182, 188], [213, 226]].forEach(function (st) {
        box(X, (st[0] + st[1]) / 2, 0, 4.4, (st[1] - st[0]) / 2, G.CABLE_Z - 3.6, 'bridge');
      });
    });
    for (var x = G.X_START; x < G.X_END - 1; x += 32) {
      box(x + 16, G.DECK_Y - G.DECK_T / 2, 0, 16, G.DECK_T / 2, G.DECK_HW, 'deck', 'truss');
    }
    // pilares dos vãos laterais e ancoragens
    [-G.SIDE, G.SPAN + G.SIDE].forEach(function (X) {
      box(X + (X < 0 ? -18 : 18), 30, 0, 22, 33, 22, 'pier');
    });
    [-G.SIDE * 0.5, G.SPAN + G.SIDE * 0.5].forEach(function (X) {
      [-1, 1].forEach(function (s) { box(X, (G.DECK_Y - G.DECK_T) / 2, s * (G.DECK_HW - 2), 2.6, (G.DECK_Y - G.DECK_T) / 2, 2.6, 'bridge'); });
    });

    var cables = [];
    [-1, 1].forEach(function (s) {
      var xs = range(-G.SIDE, 0, 14).concat(range(0, G.SPAN, 72).slice(1), range(G.SPAN, G.SPAN + G.SIDE, 14).slice(1));
      cables.push(xs.map(function (x) { return [x, cableY(x), s * G.CABLE_Z]; }));
    });

    var hangers = [], k = 0;
    for (var hx = -G.SIDE + 15.2; hx < G.SPAN + G.SIDE; hx += 15.2) {
      if (Math.abs(hx) < 11 || Math.abs(hx - G.SPAN) < 11) continue;
      var top = cableY(hx) - 0.5;
      if (top - G.DECK_Y < 2.5) continue;
      hangers.push({ x: hx, top: top, k: k++ });
    }

    var lamps = [];
    for (var lx = G.X_START + 25; lx < G.X_END; lx += 50) {
      lamps.push([lx, G.DECK_Y + 7, -(G.DECK_HW - 1)], [lx, G.DECK_Y + 7, G.DECK_HW - 1]);
    }

    var ridges = [
      { pts: ridge(1.3, 3900, 300, -6500, 5200, 70, 210, 170), far: true },
      { pts: ridge(0.4, 1950, 160, -3200, 2600, 80, 120, 115), far: false }
    ];
    /* Terra firme nas duas cabeceiras, em terraços topográficos:
       Presidio (São Francisco) e Marin Headlands. A ponte pousa no terraço
       com altura próxima à do tabuleiro. */
    function landmass(cx, cz, rx, rz, heights, shift, seed) {
      return heights.map(function (hgt, k) {
        var f = 1 - k * 0.13, pts = [], N = 30;
        for (var i = 0; i < N; i++) {
          var a = i / N * 6.2832;
          var r = 1 + 0.07 * Math.sin(3 * a + seed + k) + 0.04 * Math.sin(7 * a + seed * 2);
          pts.push([cx + k * shift + Math.cos(a) * rx * f * r, cz + Math.sin(a) * rz * f * r]);
        }
        return { lo: k ? heights[k - 1] : 0, hi: hgt, pts: pts, c: [cx + k * shift, cz] };
      });
    }
    var land = [
      landmass(-640, 0, 460, 520, [10, 28, 48, 70, 92, 112], -20, 1.7),
      landmass(2050, -80, 560, 900, [16, 44, 80, 118, 160, 205, 245], 35, 0.6)
    ];

    return { boxes: boxes, cables: cables, hangers: hangers, lamps: lamps, ridges: ridges, land: land };
  })();

  /* ---------- recorte no plano próximo ---------- */
  var NEAR = 2;
  function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function clipPoly(pts) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      var ain = a[2] >= NEAR, bin = b[2] >= NEAR;
      if (ain) out.push(a);
      if (ain !== bin) out.push(lerp3(a, b, (NEAR - a[2]) / (b[2] - a[2])));
    }
    return out;
  }
  function clipSeg(a, b) {
    var ain = a[2] >= NEAR, bin = b[2] >= NEAR;
    if (!ain && !bin) return null;
    if (ain && bin) return [a, b];
    var p = lerp3(a, b, (NEAR - a[2]) / (b[2] - a[2]));
    return ain ? [a, p] : [p, b];
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sstep(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  /* ---------- view ---------- */
  function BridgeView(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.o = Object.assign({
      fogStart: 200, fogEnd: 4000, fogMax: 0.93, checkpointZ: 0, drawCheckpoints: true,
      reflection: true, hills: true, path: false, lowFog: 1, land: false
    }, opts || {});
    this.P = PAL.dark;
    this.theme = 'dark';
    this.state = { fogBoost: 0, revealX: Infinity, lit: 0, highlight: -1, path: 0, glow: -1, glowAmt: 1, frontier: null, twinkle: -1 };
    this.cam = null;
    this.resize();
  }

  BridgeView.prototype.setTheme = function (t) { this.theme = PAL[t] ? t : 'dark'; this.P = PAL[this.theme]; };

  BridgeView.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.lite = this.w < 760;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.lite ? 1.5 : 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  };

  BridgeView.prototype.setCamera = function (pos, target, fov) {
    var f = norm(sub(target, pos));
    var r = norm([-f[2], 0, f[0]]);
    var u = cross(r, f);
    this.cam = { pos: pos, f: f, r: r, u: u, focal: (this.h / 2) / Math.tan(fov * Math.PI / 360), cx: this.w / 2, cy: this.h / 2 };
  };

  BridgeView.prototype.toCam = function (p) {
    var c = this.cam, d0 = p[0] - c.pos[0], d1 = p[1] - c.pos[1], d2 = p[2] - c.pos[2];
    return [
      d0 * c.r[0] + d1 * c.r[1] + d2 * c.r[2],
      d0 * c.u[0] + d1 * c.u[1] + d2 * c.u[2],
      d0 * c.f[0] + d1 * c.f[1] + d2 * c.f[2]
    ];
  };
  BridgeView.prototype.scr = function (q) {
    var c = this.cam;
    return [c.cx + c.focal * q[0] / q[2], c.cy - c.focal * q[1] / q[2]];
  };
  BridgeView.prototype.project = function (p) {
    if (!this.cam) return null;
    var q = this.toCam(p);
    if (q[2] < NEAR) return null;
    var s = this.scr(q);
    return { x: s[0], y: s[1], z: q[2], scale: this.cam.focal / q[2] };
  };

  BridgeView.prototype.horizon = function () {
    var f = this.cam.f, l = Math.hypot(f[0], f[2]) || 1;
    var q = this.toCam(add(this.cam.pos, [f[0] / l * 1e6, 0, f[2] / l * 1e6]));
    return this.cam.cy - this.cam.focal * q[1] / q[2];
  };

  BridgeView.prototype.fogAt = function (z, x) {
    var o = this.o, st = this.state;
    var f = Math.pow(clamp((z - o.fogStart) / (o.fogEnd - o.fogStart), 0, 1), 0.85) * o.fogMax;
    if (st.revealX !== Infinity) f = Math.max(f, sstep(st.revealX - 60, st.revealX + 280, x) * 0.86);
    return 1 - (1 - f) * (1 - st.fogBoost);
  };

  BridgeView.prototype.pushSeg = function (prims, a, b, base, worldW, minW, maxW, bias, alpha, glow, zAbs) {
    var cl = clipSeg(this.toCam(a), this.toCam(b));
    if (!cl) return;
    var z = (cl[0][2] + cl[1][2]) / 2;
    var w = clamp(worldW * this.cam.focal / z, 0, maxW);
    var al = alpha;
    if (w < minW) { al *= Math.max(0.15, w / minW); w = minW; }
    var fog = this.fogAt(z, (a[0] + b[0]) / 2);
    if (glow) fog *= 0.55;
    prims.push({ t: 1, z: zAbs != null ? zAbs : z + (bias || 0), a: this.scr(cl[0]), b: this.scr(cl[1]), w: w, col: css(mixc(base, this.P.fog, fog)), al: al, glow: glow });
  };

  BridgeView.prototype.pushDot = function (prims, p, base, worldR, minR, maxR, bias, halo, ring) {
    var q = this.toCam(p);
    if (q[2] < NEAR) return;
    var s = this.scr(q);
    var r = clamp(worldR * this.cam.focal / q[2], minR, maxR);
    var fog = this.fogAt(q[2], p[0]) * (halo ? 0.5 : 1);
    prims.push({ t: 2, z: q[2] + (bias || 0), x: s[0], y: s[1], r: r, col: css(mixc(base, this.P.fog, fog)), halo: halo, ring: ring, fog: fog });
  };

  BridgeView.prototype.pushBox = function (prims, b, my) {
    var P = this.P, camPos = this.cam.pos, hh = b.h;
    var c = [b.c[0], b.c[1] * my, b.c[2]];
    var corners = [];
    for (var i = 0; i < 8; i++) {
      corners.push(this.toCam([
        c[0] + (i & 1 ? hh[0] : -hh[0]),
        c[1] + (i & 2 ? hh[1] : -hh[1]),
        c[2] + (i & 4 ? hh[2] : -hh[2])
      ]));
    }
    var base = b.tone === 'pier' ? P.pier : b.tone === 'deck' ? P.deck : P.bridge;
    for (var fi = 0; fi < 6; fi++) {
      var F = FACES[fi], n = F.n;
      var fc = [c[0] + n[0] * hh[0], c[1] + n[1] * hh[1], c[2] + n[2] * hh[2]];
      if (n[0] * (camPos[0] - fc[0]) + n[1] * (camPos[1] - fc[1]) + n[2] * (camPos[2] - fc[2]) <= 0) continue;
      var poly = clipPoly([corners[F.i[0]], corners[F.i[1]], corners[F.i[2]], corners[F.i[3]]]);
      if (poly.length < 3) continue;
      var z = 0, pts = [];
      for (var k = 0; k < poly.length; k++) { z += poly[k][2]; pts.push(this.scr(poly[k])); }
      z /= poly.length;
      var shade = F.s;
      if (my < 0 && n[1] !== 0) shade = n[1] > 0 ? 0.42 : 1.06;
      var lit = shadec(base, shade);
      var fog = this.fogAt(z, fc[0]);
      prims.push({ t: 0, z: z, pts: pts, col: css(mixc(lit, P.fog, fog)) });

      if (this.lite || !b.detail || n[1] !== 0) continue;
      var px = this.cam.focal / z;
      var dark = shadec(lit, 0.68);
      if (b.detail === 'groove' && 2 * (n[0] ? hh[2] : hh[0]) * px > 12) {
        for (var g = -1; g <= 1; g += 2) {
          var off = g * (n[0] ? hh[2] : hh[0]) / 3;
          var gx = fc[0] + (n[0] ? 0 : off), gz = fc[2] + (n[0] ? off : 0);
          this.pushSeg(prims, [gx, c[1] - hh[1] + 1.5, gz], [gx, c[1] + hh[1] - 1.5, gz], dark, 0.5, 0.5, 2, 0, 1, false, z - 0.02);
        }
      }
      if (b.detail === 'truss' && n[2] && 2 * hh[1] * px > 5) {
        var y0 = c[1] - hh[1], y1 = c[1] + hh[1], zf = fc[2] + n[2] * 0.05;
        for (var t = 0; t < 4; t++) {
          var xa = c[0] - hh[0] + t * 8, xb = xa + 8;
          var segA = t % 2 ? [xa, y1, zf] : [xa, y0, zf], segB = t % 2 ? [xb, y0, zf] : [xb, y1, zf];
          this.pushSeg(prims, segA, segB, shadec(lit, 0.62), 0.35, 0.5, 2, 0, 0.9, false, z - 0.05);
          this.pushSeg(prims, [xa, y0, zf], [xa, y1, zf], shadec(lit, 0.62), 0.35, 0.5, 2, 0, 0.9, false, z - 0.05);
        }
      }
    }
  };

  BridgeView.prototype.collect = function (mirror) {
    var prims = [], P = this.P, st = this.state, o = this.o, my = mirror ? -1 : 1, self = this;
    GEO.boxes.forEach(function (b) { self.pushBox(prims, b, my); });

    GEO.cables.forEach(function (pts) {
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        self.pushSeg(prims, [a[0], a[1] * my, a[2]], [b[0], b[1] * my, b[2]], P.bridge, 1.15, 0.7, 6, 0, 1);
      }
    });

    GEO.hangers.forEach(function (hg) {
      if (self.lite && hg.k % 2) return;
      [-1, 1].forEach(function (s) {
        var z = s * G.CABLE_Z;
        self.pushSeg(prims, [hg.x, G.DECK_Y * my, z], [hg.x, hg.top * my, z], P.bridge, 0.32, 0.55, 2.4, 0, 0.95);
      });
    });

    if (P.glow) {
      GEO.lamps.forEach(function (l) {
        self.pushDot(prims, [l[0], l[1] * my, l[2]], P.lamp, 0.32, 0.45, 2.2, -0.5, true, false);
      });
    }

    var cz = o.checkpointZ;
    if (o.path && st.path > 0) {
      var xs = SS.checkpointX(0), xe = SS.checkpointX(19), lim = xs + (xe - xs) * st.path, step = 24;
      for (var x = xs; x < lim; x += step) {
        var x2 = Math.min(lim, x + step);
        self.pushSeg(prims, [x, (G.DECK_Y + 0.6) * my, cz], [x2, (G.DECK_Y + 0.6) * my, cz], P.red, 0.9, 0.9, 4, -2, 1, true);
      }
    }

    if (o.drawCheckpoints) {
      for (var i = 0; i < 20; i++) {
        var lit = i < st.lit, hi = st.highlight === i;
        var p = [SS.checkpointX(i), (G.DECK_Y + 1.6) * my, cz];
        if (lit || hi) self.pushDot(prims, p, P.red, hi ? 2.4 : 1.5, hi ? 3 : 1.6, hi ? 9 : 6, -3, true, hi);
        else self.pushDot(prims, p, P.locked, 0.9, 1, 3.5, -3, false, false);
      }
    }
    prims.sort(function (a, b) { return b.z - a.z; });
    return prims;
  };

  BridgeView.prototype.draw = function (prims, alphaMul) {
    var ctx = this.ctx, glow = this.P.glow;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var i = 0; i < prims.length; i++) {
      var p = prims[i];
      if (p.t === 0) {
        ctx.globalAlpha = alphaMul;
        ctx.beginPath();
        ctx.moveTo(p.pts[0][0], p.pts[0][1]);
        for (var k = 1; k < p.pts.length; k++) ctx.lineTo(p.pts[k][0], p.pts[k][1]);
        ctx.closePath();
        ctx.fillStyle = p.col;
        ctx.fill();
        ctx.strokeStyle = p.col;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      } else if (p.t === 1) {
        if (p.glow) {
          ctx.globalAlpha = 0.22 * alphaMul;
          ctx.strokeStyle = p.col;
          ctx.lineWidth = p.w * 5;
          ctx.beginPath(); ctx.moveTo(p.a[0], p.a[1]); ctx.lineTo(p.b[0], p.b[1]); ctx.stroke();
        }
        ctx.globalAlpha = p.al * alphaMul;
        ctx.strokeStyle = p.col;
        ctx.lineWidth = p.w;
        ctx.beginPath(); ctx.moveTo(p.a[0], p.a[1]); ctx.lineTo(p.b[0], p.b[1]); ctx.stroke();
      } else {
        if (p.halo) {
          ctx.globalAlpha = (glow ? 0.22 : 0.16) * alphaMul * (1 - p.fog * 0.6);
          ctx.fillStyle = p.col;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.6, 0, 6.283); ctx.fill();
        }
        if (p.ring) {
          ctx.globalAlpha = 0.85 * alphaMul;
          ctx.strokeStyle = p.col;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.2, 0, 6.283); ctx.stroke();
        }
        ctx.globalAlpha = alphaMul;
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  BridgeView.prototype.drawRidges = function () {
    var ctx = this.ctx, P = this.P, self = this;
    GEO.ridges.forEach(function (rd) {
      var top = rd.pts, poly = [];
      for (var i = 0; i < top.length; i++) poly.push(self.toCam(top[i]));
      for (var j = top.length - 1; j >= 0; j--) poly.push(self.toCam([top[j][0], 0, top[j][2]]));
      var cl = clipPoly(poly);
      if (cl.length < 3) return;
      var z = 0;
      ctx.beginPath();
      for (var k = 0; k < cl.length; k++) {
        var s = self.scr(cl[k]);
        z += cl[k][2];
        if (k) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]);
      }
      z /= cl.length;
      var fog = Math.min(1, self.fogAt(z, 0) * (rd.far ? 0.92 : 0.7) + (rd.far ? 0.12 : 0.05));
      ctx.fillStyle = css(mixc(rd.far ? P.hillsFar : P.hills, P.fog, fog));
      ctx.fill();
    });
  };

  BridgeView.prototype.drawLand = function () {
    var ctx = this.ctx, P = this.P, self = this, camPos = this.cam.pos;
    GEO.land.forEach(function (mass) {
      mass.forEach(function (t, k) {
        var n = t.pts.length, walls = [];
        for (var i = 0; i < n; i++) {
          var a = t.pts[i], b = t.pts[(i + 1) % n];
          var mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
          var nx = b[1] - a[1], nz = -(b[0] - a[0]);
          if (nx * (mx - t.c[0]) + nz * (mz - t.c[1]) < 0) { nx = -nx; nz = -nz; }
          if (nx * (camPos[0] - mx) + nz * (camPos[2] - mz) <= 0) continue;
          var q = clipPoly([self.toCam([a[0], t.lo, a[1]]), self.toCam([b[0], t.lo, b[1]]), self.toCam([b[0], t.hi, b[1]]), self.toCam([a[0], t.hi, a[1]])]);
          if (q.length < 3) continue;
          var z = 0; q.forEach(function (v) { z += v[2]; }); z /= q.length;
          var lam = 0.55 + 0.25 * Math.abs(nx) / (Math.hypot(nx, nz) || 1);
          walls.push({ z: z, q: q, col: css(mixc(shadec(P.land, lam), P.fog, self.fogAt(z, mx))) });
        }
        walls.sort(function (u, v) { return v.z - u.z; });
        walls.forEach(function (wl) {
          ctx.beginPath();
          wl.q.forEach(function (v, j) { var sp = self.scr(v); if (j) ctx.lineTo(sp[0], sp[1]); else ctx.moveTo(sp[0], sp[1]); });
          ctx.closePath();
          ctx.fillStyle = wl.col; ctx.fill();
          ctx.strokeStyle = wl.col; ctx.lineWidth = 0.6; ctx.stroke();
        });
        var top = clipPoly(t.pts.map(function (p) { return self.toCam([p[0], t.hi, p[1]]); }));
        if (top.length < 3) return;
        var tz = 0; top.forEach(function (v) { tz += v[2]; }); tz /= top.length;
        var fog = self.fogAt(tz, t.c[0]);
        ctx.beginPath();
        top.forEach(function (v, j) { var sp = self.scr(v); if (j) ctx.lineTo(sp[0], sp[1]); else ctx.moveTo(sp[0], sp[1]); });
        ctx.closePath();
        ctx.fillStyle = css(mixc(shadec(P.land, 1.05 + k * 0.03), P.fog, fog));
        ctx.fill();
        // curva de nível na borda de cada terraço
        ctx.strokeStyle = css(mixc(P.landEdge, P.fog, fog), 0.9);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
    });
  };

  BridgeView.prototype.render = function () {
    if (!this.cam) return;
    var ctx = this.ctx, P = this.P, w = this.w, h = this.h, st = this.state, o = this.o;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalAlpha = 1;
    var hz = clamp(this.horizon(), -h, h * 2);

    if (hz > 0) {
      var sky = ctx.createLinearGradient(0, 0, 0, hz);
      sky.addColorStop(0, css(mixc(P.skyTop, P.fog, st.fogBoost * 0.6)));
      sky.addColorStop(1, css(P.skyHorizon));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, hz + 1);
      this.drawCelestial(hz);
    }
    if (hz < h) {
      var water = ctx.createLinearGradient(0, Math.max(0, hz), 0, h);
      water.addColorStop(0, css(P.waterHorizon));
      water.addColorStop(1, css(P.water));
      ctx.fillStyle = water;
      ctx.fillRect(0, Math.max(0, hz), w, h - Math.max(0, hz));
    }

    if (o.hills) this.drawRidges();

    var band = ctx.createLinearGradient(0, hz - h * 0.16, 0, hz + h * 0.05);
    band.addColorStop(0, css(P.fog, 0));
    band.addColorStop(0.75, css(P.fog, 0.7));
    band.addColorStop(1, css(P.fog, 0));
    ctx.fillStyle = band;
    ctx.fillRect(0, hz - h * 0.16, w, h * 0.21);

    if (o.reflection && hz < h) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, hz, w, h - hz); ctx.clip();
      this.draw(this.collect(true), P.reflect * (1 - st.fogBoost));
      // ondulação da água
      ctx.fillStyle = css(P.water, 0.38);
      for (var i = 0; i < 46; i++) {
        var y = hz + (h - hz) * Math.pow(i / 46, 1.7);
        ctx.fillRect(0, y, w, 0.6 + i * 0.05);
      }
      ctx.restore();
    }


    if (hz > 0 && hz < h) this.drawCelestialReflection(hz);

    if (o.land) this.drawLand();

    this.draw(this.collect(false), 1);

    var lf = P.lowFog * o.lowFog;
    if (lf > 0) {
      var low = ctx.createLinearGradient(0, hz - h * 0.07, 0, hz + h * 0.14);
      low.addColorStop(0, css(P.fog, 0));
      low.addColorStop(0.45, css(P.fog, lf));
      low.addColorStop(1, css(P.fog, 0));
      ctx.fillStyle = low;
      ctx.fillRect(0, hz - h * 0.07, w, h * 0.21);
    }

    if (st.frontier != null) {
      var fp = this.project([st.frontier, G.DECK_Y + 4, o.checkpointZ]);
      if (fp) {
        var FR = clamp(fp.scale * 120, 50, 220);
        var fg = ctx.createRadialGradient(fp.x, fp.y, 0, fp.x, fp.y, FR);
        fg.addColorStop(0, css(P.red, P.glow ? 0.2 : 0.12));
        fg.addColorStop(1, css(P.red, 0));
        ctx.fillStyle = fg;
        ctx.fillRect(fp.x - FR, fp.y - FR, FR * 2, FR * 2);
      }
    }

    if (st.glow >= 0) {
      var gp = this.project([SS.checkpointX(st.glow), G.DECK_Y + 2, o.checkpointZ]);
      if (gp) {
        var R = clamp(gp.scale * 70, 40, 140);
        var rg = ctx.createRadialGradient(gp.x, gp.y, 0, gp.x, gp.y, R);
        rg.addColorStop(0, css(P.red, (P.glow ? 0.32 : 0.2) * st.glowAmt));
        rg.addColorStop(1, css(P.red, 0));
        ctx.fillStyle = rg;
        ctx.fillRect(gp.x - R, gp.y - R, R * 2, R * 2);
      }
    }

    if (st.twinkle >= 0) this.drawTwinkle(hz);
  };

  /* Posição do astro: sol nascendo colado no horizonte (claro) ou lua cheia alta no céu (escuro). */
  BridgeView.prototype.celestialAt = function (hz) {
    var w = this.w, h = this.h, light = this.theme === 'light';
    var r = clamp(Math.min(w, h) * (light ? 0.055 : 0.05), 20, 58);
    return {
      light: light, r: r, x: w * (w < 760 ? 0.72 : 0.68),
      y: light ? hz - r * 0.55 : Math.max(r * 1.6, hz * 0.3)
    };
  };

  BridgeView.prototype.drawCelestial = function (hz) {
    var ctx = this.ctx, P = this.P, st = this.state, w = this.w;
    var c = this.celestialAt(hz), vis = 1 - st.fogBoost * 0.85;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w, hz + 1); ctx.clip();
    var i, g, a;
    if (!c.light) {
      /* estrelas: posições determinísticas, mais fracas perto do horizonte */
      for (i = 0; i < 140; i++) {
        var rx = Math.sin(i * 12.9898 + 78.233) * 43758.5453, ry = Math.sin(i * 39.346 + 11.135) * 24634.6345, rs = Math.sin(i * 7.77 + 3.1) * 9301.7;
        rx -= Math.floor(rx); ry -= Math.floor(ry); rs -= Math.floor(rs);
        var sx = rx * w, sy = Math.pow(ry, 1.25) * hz * 0.94;
        a = (0.25 + rs * 0.6) * (1 - sy / hz * 0.8) * vis;
        if (st.twinkle >= 0) a *= 0.8 + 0.2 * Math.sin(st.twinkle * 1.7 + i * 2.3);
        ctx.fillStyle = css([226, 232, 255], a);
        var sz = rs > 0.93 ? 1.9 : rs > 0.6 ? 1.2 : 0.8;
        ctx.fillRect(sx, sy, sz, sz);
      }
      /* sem lua no mobile: só as estrelas */
      if (w < 760) { ctx.restore(); return; }
      /* halo da lua */
      var R = c.r * 7;
      g = ctx.createRadialGradient(c.x, c.y, c.r * 0.8, c.x, c.y, R);
      g.addColorStop(0, css([170, 190, 235], 0.26 * vis));
      g.addColorStop(0.35, css([120, 145, 210], 0.09 * vis));
      g.addColorStop(1, css([120, 145, 210], 0));
      ctx.fillStyle = g; ctx.fillRect(c.x - R, c.y - R, R * 2, R * 2);
      /* disco: lua cheia com mares e crateras suaves */
      ctx.globalAlpha = vis;
      var mg = ctx.createRadialGradient(c.x - c.r * 0.3, c.y - c.r * 0.3, c.r * 0.1, c.x, c.y, c.r);
      mg.addColorStop(0, '#FBFCFF'); mg.addColorStop(1, '#D3D9E8');
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.clip();
      var spots = [[-0.32, -0.22, 0.34, 0.16], [0.28, -0.3, 0.22, 0.12], [0.1, 0.28, 0.4, 0.13], [-0.4, 0.3, 0.16, 0.1], [0.46, 0.12, 0.14, 0.1]];
      for (i = 0; i < spots.length; i++) {
        ctx.fillStyle = 'rgba(120,132,165,' + spots[i][3] + ')';
        ctx.beginPath(); ctx.arc(c.x + spots[i][0] * c.r, c.y + spots[i][1] * c.r, spots[i][2] * c.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else {
      /* brilho do amanhecer no horizonte */
      var hg = ctx.createRadialGradient(c.x, hz, 0, c.x, hz, w * 0.7);
      hg.addColorStop(0, css([255, 196, 130], 0.55 * vis));
      hg.addColorStop(0.4, css([255, 214, 170], 0.2 * vis));
      hg.addColorStop(1, css([255, 214, 170], 0));
      ctx.save(); ctx.translate(0, hz); ctx.scale(1, 0.55); ctx.translate(0, -hz);
      ctx.fillStyle = hg; ctx.fillRect(0, hz - w, w, w * 2);
      ctx.restore();
      /* raios de luz em leque */
      ctx.globalAlpha = vis;
      for (i = 0; i < 9; i++) {
        var ang = -Math.PI / 2 + (i - 4) * 0.2, wd = 0.045, L = Math.max(w, hz) * 1.1;
        var rg = ctx.createRadialGradient(c.x, c.y, c.r, c.x, c.y, L);
        rg.addColorStop(0, 'rgba(255,236,190,0.22)'); rg.addColorStop(1, 'rgba(255,236,190,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + Math.cos(ang - wd) * L, c.y + Math.sin(ang - wd) * L);
        ctx.lineTo(c.x + Math.cos(ang + wd) * L, c.y + Math.sin(ang + wd) * L);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      var R2 = c.r * 6;
      g = ctx.createRadialGradient(c.x, c.y, c.r * 0.6, c.x, c.y, R2);
      g.addColorStop(0, css([255, 214, 140], 0.7 * vis));
      g.addColorStop(0.3, css([255, 200, 130], 0.22 * vis));
      g.addColorStop(1, css([255, 200, 130], 0));
      ctx.fillStyle = g; ctx.fillRect(c.x - R2, c.y - R2, R2 * 2, R2 * 2);
      ctx.globalAlpha = vis;
      var sg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      sg.addColorStop(0, '#FFFBEA'); sg.addColorStop(0.7, '#FFE59A'); sg.addColorStop(1, '#FFC770');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  /* Rastro de luz do sol/lua refletido na água. */
  BridgeView.prototype.drawCelestialReflection = function (hz) {
    var ctx = this.ctx, st = this.state, w = this.w, h = this.h;
    var c = this.celestialAt(hz), vis = (1 - st.fogBoost) * (c.light ? 0.5 : 0.38);
    var col = c.light ? [255, 214, 140] : [200, 214, 245], depth = Math.min(h - hz, h * 0.4);
    if (depth <= 0 || (!c.light && w < 760)) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, hz, w, h - hz); ctx.clip();
    for (var i = 0; i < 38; i++) {
      var u = i / 38, y = hz + depth * Math.pow(u, 1.5);
      var sh = Math.sin(i * 2.7) * 0.5 + 0.5, half = c.r * (0.5 + u * 2.4) * (0.45 + sh * 0.55);
      var g = ctx.createLinearGradient(c.x - half, 0, c.x + half, 0);
      g.addColorStop(0, css(col, 0)); g.addColorStop(0.5, css(col, vis * (1 - u) * (0.5 + sh * 0.5))); g.addColorStop(1, css(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(c.x - half, y, half * 2, 1 + u * 2.2);
    }
    ctx.restore();
  };

  /* Luzes dos checkpoints piscando de forma aleatória e fraca, com reflexo leve na água. */
  BridgeView.prototype.drawTwinkle = function (hz) {
    var ctx = this.ctx, P = this.P, st = this.state, o = this.o, t = st.twinkle;
    if (st.lit < 1) return;
    /* Três pontos de luz por vez: a cada intervalo sorteia 3 checkpoints distintos e o pulso sobe e desce suave. */
    var SLOT = 2.46, COUNT = Math.min(3, st.lit), slot = Math.floor(t / SLOT), u = t / SLOT - slot;
    function pick(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    var chosen = [];
    for (var q = 0; chosen.length < COUNT; q++) {
      var c = Math.floor(pick(slot * 7 + q * 13.37) * st.lit);
      if (chosen.indexOf(c) < 0) chosen.push(c);
    }
    var k = Math.pow(Math.sin(Math.PI * u), 2);
    for (var ci = 0; ci < chosen.length; ci++) {
      var i = chosen[ci];
      var x = SS.checkpointX(i);
      var p = this.project([x, G.DECK_Y + 1.6, o.checkpointZ]);
      if (p) {
        var R = clamp(p.scale * 34, 10, 46);
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
        g.addColorStop(0, css(P.red, 0.34 * k));
        g.addColorStop(1, css(P.red, 0));
        ctx.fillStyle = g;
        ctx.fillRect(p.x - R, p.y - R, R * 2, R * 2);
      }
      if (o.reflection) {
        var m = this.project([x, -(G.DECK_Y + 1.6), o.checkpointZ]);
        if (m && m.y > hz) {
          var Rr = clamp(m.scale * 34, 10, 46);
          ctx.save();
          ctx.beginPath(); ctx.rect(0, hz, this.w, this.h - hz); ctx.clip();
          ctx.translate(m.x, m.y); ctx.scale(0.55, 2.6);
          var rg2 = ctx.createRadialGradient(0, 0, 0, 0, 0, Rr);
          rg2.addColorStop(0, css(P.red, 0.13 * k));
          rg2.addColorStop(1, css(P.red, 0));
          ctx.fillStyle = rg2;
          ctx.fillRect(-Rr, -Rr, Rr * 2, Rr * 2);
          ctx.restore();
        }
      }
    }
  };

  SS.BridgeView = BridgeView;
})();
