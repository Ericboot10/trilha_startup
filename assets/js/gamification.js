/*
 * Regras de progressão: XP, Founder Level, streak e conquistas.
 * Funções puras — recebem o estado do aluno e devolvem valores calculados,
 * para que a camada de persistência possa ser trocada por um backend.
 */
(function () {
  'use strict';
  var SS = (window.SS = window.SS || {});

  function dayKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

  function computeXP(progress) {
    var r = SS.XP_RULES;
    return progress.completedLessons.length * r.lesson +
      progress.completedChallenges.length * r.challenge +
      progress.projects * r.project;
  }

  function levelFor(xp) {
    var L = SS.LEVELS, cur = L[0];
    for (var i = 0; i < L.length; i++) if (xp >= L[i].xp) cur = L[i];
    var next = L[cur.level] || null;
    return {
      level: cur.level, name: cur.name, xp: xp, floor: cur.xp,
      next: next, ratio: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1
    };
  }

  /* activity: { 'AAAA-MM-DD': quantidade de atividades válidas } */
  function streakStats(activity, today) {
    today = startOfDay(today || new Date());
    var cursor = activity[dayKey(today)] ? today : addDays(today, -1);
    var current = 0;
    while (activity[dayKey(cursor)]) { current++; cursor = addDays(cursor, -1); }

    var keys = Object.keys(activity).filter(function (k) { return activity[k] > 0; }).sort();
    var longest = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      var p = k.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
      run = prev && dayKey(addDays(prev, 1)) === k ? run + 1 : 1;
      if (run > longest) longest = run;
      prev = d;
    });
    return { current: current, longest: longest, activeDays: keys.length };
  }

  function evaluateAchievements(progress, stats) {
    var interview = progress.completedChallenges.filter(function (id) {
      var l = SS.LESSONS.find(function (x) { return x.id === id; });
      return l && l.challenge.type === 'interview';
    }).length;
    var s = {
      lessons: progress.completedLessons.length,
      challenges: progress.completedChallenges.length,
      interviewChallenges: interview,
      projects: progress.projects,
      longestStreak: stats.longest,
      crossed: !!progress.crossed
    };
    return SS.ACHIEVEMENTS.map(function (a) {
      return { def: a, unlocked: !!a.test(s) };
    });
  }

  SS.game = {
    dayKey: dayKey, startOfDay: startOfDay, addDays: addDays,
    computeXP: computeXP, levelFor: levelFor,
    streakStats: streakStats, evaluateAchievements: evaluateAchievements
  };
})();
