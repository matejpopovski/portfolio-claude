/* MatejOS Terminal: a small shell over the portfolio data. */
(() => {
  'use strict';
  const MOS = window.MOS;
  const { D, esc } = MOS;
  const first = D.name.split(' ')[0].toLowerCase();
  const PS = `${first}@MatejOS ~ %`;
  const pad = (s, n) => String(s) + ' '.repeat(Math.max(1, n - String(s).length));
  const link = (url, label) => `<a href="${esc(url)}"${/^https?:/.test(url) ? ' target="_blank" rel="noopener"' : ''}>${esc(label || url)}</a>`;

  const APP_ALIASES = {
    about: 'about', 'about.txt': 'about', 'about me.txt': 'about', projects: 'projects', files: 'projects', experience: 'experience',
    timeline: 'experience', skills: 'skills', packages: 'skills', mail: 'mail', contact: 'mail', terminal: 'terminal',
    snake: 'snake', 'snake.app': 'snake', settings: 'settings', trash: 'trash',
  };

  MOS.apps.terminal = {
    title: `${first} — zsh`, icon: 'terminal', size: [720, 470], min: [320, 240], focus: '.term__input',
    render(body, win) {
      body.innerHTML = `
        <div class="term">
          <div class="term__out" role="log" aria-live="polite" aria-label="Terminal output"></div>
          <form class="term__line" autocomplete="off">
            <label class="term__ps" for="ti-${win.el.dataset.id}">${esc(PS)}</label>
            <input id="ti-${win.el.dataset.id}" class="term__input" type="text" spellcheck="false" autocapitalize="off" autocorrect="off" enterkeyhint="go" aria-label="Command" />
          </form>
        </div>`;
      const out = body.querySelector('.term__out');
      const input = body.querySelector('.term__input');
      const term = body.querySelector('.term');
      const hist = MOS.session.get('termHist', []);
      let hi = hist.length;
      let busy = false;

      const print = (html, cls = '') => {
        const d = document.createElement('div');
        d.className = 'term__o ' + cls;
        d.innerHTML = html;
        out.append(d);
        term.scrollTop = term.scrollHeight;
        return d;
      };
      const sleep = (ms) => MOS.wait(MOS.reduced() ? 0 : ms);

      const projectList = () => D.projects.map((p, i) => `<span class="t-dim">${String(i + 1).padStart(2, '0')}</span>  ${esc(pad(p.title, 30))}<span class="t-dim">${esc(pad(p.area, 24))}${esc(p.year)}</span>`).join('\n');

      const findProject = (arg) => {
        const n = parseInt(arg, 10);
        if (!isNaN(n) && n >= 1 && n <= D.projects.length) return n - 1;
        const a = arg.toLowerCase();
        const i = D.projects.findIndex((p) => p.title.toLowerCase() === a);
        return i >= 0 ? i : D.projects.findIndex((p) => p.title.toLowerCase().includes(a));
      };

      const C = {
        help: { d: 'list commands', f: () => {
          const rows = Object.entries(C).filter(([, v]) => v.d).map(([k, v]) => `  <span class="t-acc">${esc(pad(k, 13))}</span>${esc(v.d)}`);
          return `MatejOS zsh, version 26. Commands:\n${rows.join('\n')}\n\n<span class="t-dim">Tab completes, ↑/↓ walks history. There may be a few undocumented ones.</span>`;
        } },
        whoami: { d: 'who is this', f: () => `<b>${esc(D.name)}</b>\n${esc(D.title)}\n${esc(D.role)} · ${esc(D.location)}` },
        about: { d: 'cat about.txt', f: () => D.about.map(esc).join('\n\n') },
        ls: { d: 'list files (ls projects, ls skills)', f: (a) => {
          if (/^projects?\/?$/.test(a)) return projectList() + `\n\n<span class="t-dim">open a project with</span> open &lt;number&gt;`;
          if (/^skills?\/?$/.test(a)) return C.skills.f();
          if (a) return `ls: ${esc(a)}: No such file or directory`;
          return '<span class="t-acc">About Me.txt</span>   <span class="t-blue">projects/</span>   <span class="t-blue">experience/</span>   <span class="t-blue">skills/</span>   Mail.app   Snake.app   <span class="t-dim">.secrets</span>';
        } },
        cat: { f: (a) => {
          if (/about/i.test(a)) return C.about.f();
          if (/secret/i.test(a)) return 'Try: sudo hire matej · rm -rf / · neofetch · fortune · the Konami code';
          if (/hello_world/i.test(a)) { MOS.wm.open('code'); return 'Opening hello_world.cpp from the Trash…'; }
          return a ? `cat: ${esc(a)}: No such file or directory` : 'usage: cat about.txt';
        } },
        projects: { d: 'list projects', f: () => C.ls.f('projects') },
        open: { d: 'open <n|name|app>', f: (a) => {
          if (!a) return 'usage: open &lt;project number | project name | app&gt;';
          const app = APP_ALIASES[a.toLowerCase()];
          if (app) { MOS.wm.open(app); return `Opening ${esc(a)}…`; }
          const i = findProject(a);
          if (i >= 0) { MOS.wm.open('project', i); return `Opening ${esc(D.projects[i].title)}…`; }
          return `open: ${esc(a)}: not found. Try <span class="t-acc">ls projects</span>.`;
        } },
        experience: { d: 'work & education timeline', f: () => D.timeline.map((t) => `<span class="t-acc">${esc(t.year)}</span>  ${esc(pad(t.title, 36))}<span class="t-dim">${esc(t.org)} · ${esc(t.duration)}</span>`).join('\n') },
        education: { d: 'degrees', f: () => D.education.map((e) => `<span class="t-acc">${esc(e.years)}</span>  ${esc(e.degree)}\n             <span class="t-dim">${esc(e.school)}</span>`).join('\n') },
        courses: { d: 'coursework repos', f: () => D.courses.map((c) => `<span class="t-acc">${esc(pad(c.code, 9))}</span>${link(c.url, c.name)}`).join('\n') },
        skills: { d: 'the toolbox', f: () => D.stack.map((g) => `<span class="t-acc">${esc(pad(g.group, 18))}</span>${esc(g.items.join(', '))}`).join('\n') },
        contact: { d: 'ways to reach me', f: () => D.links.map((l) => `<span class="t-acc">${esc(pad(l.label, 10))}</span>${link(l.url, l.url.replace(/^mailto:|^https?:\/\/(www\.)?/, ''))}`).join('\n') + '\n\n<span class="t-dim">or type</span> mail <span class="t-dim">to write one here</span>' },
        mail: { f: () => { MOS.wm.open('mail'); return 'Opening Mail…'; } },
        github: { f: () => { const l = D.links.find((x) => /github/i.test(x.label)); if (l) window.open(l.url, '_blank', 'noopener'); return l ? `Opening ${link(l.url)}` : 'No GitHub link found.'; } },
        linkedin: { f: () => { const l = D.links.find((x) => /linked/i.test(x.label)); if (l) window.open(l.url, '_blank', 'noopener'); return l ? `Opening ${link(l.url)}` : 'No LinkedIn link found.'; } },
        neofetch: { d: 'system info', f: () => {
          const logo = [
            ['t-tom', '██▄    ▄██'],
            ['t-tom', '███▄  ▄███'],
            ['t-sun', '██ ▀██▀ ██'],
            ['t-mint', '██      ██'],
            ['t-mint', '██      ██'],
          ].map(([c, l]) => `<span class="${c}">${l}</span>`).join('\n');
          const info = [
            `<b class="t-acc">${esc(first)}</b>@<b class="t-acc">MatejOS</b>`,
            '<span class="t-dim">-----------------</span>',
            `<span class="t-acc">OS</span>: MatejOS 26 “Badger”`,
            `<span class="t-acc">Host</span>: ${esc(D.name)}`,
            `<span class="t-acc">Role</span>: ${esc(D.title)}`,
            `<span class="t-acc">Kernel</span>: ${esc(D.role)}`,
            `<span class="t-acc">Uptime</span>: ${esc(D.yearsExperience)} years experience`,
            `<span class="t-acc">Packages</span>: ${D.stack.reduce((n, g) => n + g.items.length, 0)} (stack), ${D.projects.length} projects`,
            `<span class="t-acc">Shell</span>: zsh-ish 26  <span class="t-tom">●</span><span class="t-sun">●</span><span class="t-mint">●</span><span class="t-blue">●</span><span class="t-lil">●</span>`,
          ];
          return `<div class="t-neo"><div class="t-logo">${logo}</div><div>${info.join('\n')}</div></div>`;
        } },
        fortune: { d: 'a random fact', f: () => `${esc(D.name.split(' ')[0])} ${esc(D.verbs[Math.floor(Math.random() * D.verbs.length)])}.` },
        snake: { d: 'play Snake', f: () => { MOS.wm.open('snake'); return 'Launching Snake.app… (arrows/WASD, space to pause)'; } },
        theme: { d: 'theme light|dark|auto', f: (a) => {
          const t = a || (document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
          if (!['light', 'dark', 'auto'].includes(t)) return 'usage: theme light|dark|auto';
          MOS.setTheme(t); return `Appearance set to ${t}.`;
        } },
        wallpaper: { d: 'wallpaper [name|next]', f: (a) => {
          const w = MOS.walls.find((x) => x.id === a || x.name.toLowerCase().startsWith((a || '').toLowerCase()) && a);
          const id = w ? w.id : MOS.nextWall();
          MOS.setWall(id);
          return `Wallpaper: ${esc(MOS.walls.find((x) => x.id === id).name)}. Available: ${MOS.walls.map((x) => x.id).join(', ')}`;
        } },
        date: { f: () => new Date().toString() },
        echo: { f: (a) => esc(a) },
        pwd: { f: () => `/Users/${esc(first)}` },
        cd: { f: (a) => (a && !/^~|\/Users/.test(a) ? `cd: ${esc(a)}: Permission denied (you're a guest here)` : '') },
        uname: { f: () => 'MatejOS 26.0 Badger arm64 curious' },
        history: { d: 'command history', f: () => hist.map((c, k) => `${String(k + 1).padStart(4)}  ${esc(c)}`).join('\n') || '(empty)' },
        clear: { d: 'clear the screen', f: () => { out.innerHTML = ''; return null; } },
        exit: { d: 'close terminal', f: () => { setTimeout(() => MOS.wm.requestClose(win), 120); return 'logout'; } },
        hello: { f: () => `Hi! I'm ${esc(D.name.split(' ')[0])}. Type <span class="t-acc">help</span> to look around.` },
        ping: { f: () => 'PONG. Matej usually replies faster by email, though.' },
        vim: { f: () => 'You would never get out. Not opening it.' },
        shutdown: { f: () => { setTimeout(() => MOS.power('shutdown'), 400); return 'Shutting down…'; } },
        reboot: { f: () => { setTimeout(() => MOS.power('reboot'), 400); return 'Rebooting…'; } },
        sleep: { f: () => { setTimeout(() => MOS.power('sleep'), 300); return 'zzz'; } },
      };
      C.hi = C.hello; C.emacs = C.vim; C.nano = C.vim; C.restart = C.reboot;

      const run = async (raw) => {
        const line = raw.trim();
        print(`<span class="term__ps">${esc(PS)}</span> ${esc(raw)}`, 'term__cmd');
        if (!line) return;
        hist.push(line); if (hist.length > 60) hist.shift();
        MOS.session.set('termHist', hist); hi = hist.length;

        if (/^(sudo\s+)?rm\s+-(rf|fr)\s+(\/|\/\*|~|\*)\s*$/.test(line)) {
          print('<span class="t-tom">rm: deleting /System/Matej… </span>');
          await sleep(700);
          MOS.power('bsod');
          return;
        }
        if (/^sudo\s+hire\s+(matej|me|him|popovski)/i.test(line)) {
          busy = true;
          print('[sudo] password for recruiter: ********');
          await sleep(500);
          print('<span class="t-dim">Verifying credentials…</span> <span class="t-mint">ok</span>');
          await sleep(400);
          const bar = print('');
          for (let k = 0; k <= 20; k++) {
            bar.innerHTML = `Hiring ${esc(D.name)}  [<span class="t-mint">${'█'.repeat(k)}</span>${'░'.repeat(20 - k)}] ${k * 5}%`;
            await sleep(45);
          }
          print(`<span class="t-mint">✔ Success.</span> Excellent decision. Opening Mail so you can make it official…`);
          await sleep(700);
          busy = false;
          MOS.wm.open('mail', "Let's work together");
          return;
        }
        if (/^sudo\b/.test(line)) { print(`${esc(first)} is not in the sudoers file. This incident will be reported.\n<span class="t-dim">(only one sudo command works here. hint: it involves hiring)</span>`); return; }
        if (/^rm\b/.test(line)) { print("rm: refusing to delete Matej's work. Try something more dramatic."); return; }

        const [cmd, ...rest] = line.split(/\s+/);
        const arg = rest.join(' ');
        const key = cmd.toLowerCase();
        if (key === 'cat' && /^about/i.test(arg)) { print(C.about.f()); return; }
        const c = C[key];
        if (!c) { print(`zsh: command not found: ${esc(cmd)}. Try <span class="t-acc">help</span>.`, 't-err'); return; }
        const res = c.f(arg);
        if (res != null && res !== '') print(res);
      };

      body.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (busy) return;
        const v = input.value;
        input.value = '';
        run(v);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) { hi--; input.value = hist[hi]; } }
        else if (e.key === 'ArrowDown') { e.preventDefault(); if (hi < hist.length - 1) { hi++; input.value = hist[hi]; } else { hi = hist.length; input.value = ''; } }
        else if (e.key === 'Tab') {
          e.preventDefault();
          const v = input.value;
          const parts = v.split(' ');
          let pool;
          if (parts.length === 1) pool = Object.keys(C);
          else if (parts[0] === 'open') pool = [...Object.keys(APP_ALIASES), ...D.projects.map((p) => p.title.toLowerCase())];
          else if (parts[0] === 'ls') pool = ['projects', 'skills'];
          else if (parts[0] === 'theme') pool = ['light', 'dark', 'auto'];
          else if (parts[0] === 'wallpaper') pool = MOS.walls.map((w) => w.id);
          else pool = [];
          const last = parts[parts.length - 1].toLowerCase();
          const m = pool.filter((p) => p.startsWith(last));
          if (m.length === 1) { parts[parts.length - 1] = m[0]; input.value = parts.join(' ') + (parts.length === 1 ? ' ' : ''); }
          else if (m.length > 1) print(m.join('   '), 't-dim');
        } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
        else if (e.key === 'c' && e.ctrlKey && !window.getSelection().toString()) { e.preventDefault(); print(`<span class="term__ps">${esc(PS)}</span> ${esc(input.value)}^C`, 'term__cmd'); input.value = ''; }
      });
      term.addEventListener('click', () => { if (!window.getSelection().toString()) input.focus({ preventScroll: true }); });

      const last = new Date().toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      print(`<span class="t-dim">Last login: ${esc(last)} on ttys000</span>\nWelcome to <b>MatejOS</b>. Type <span class="t-acc">help</span> to see what this shell can do,\nor try <span class="t-acc">whoami</span>, <span class="t-acc">ls projects</span>, <span class="t-acc">neofetch</span>.`);
      win.run = run;
    },
  };
})();
