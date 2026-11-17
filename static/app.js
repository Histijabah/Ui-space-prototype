/* UI-ScholarHub shared script (replaces app.py)
   Data is kept in the browser: localStorage for records, IndexedDB for uploaded files. */
(function () {
  'use strict';

  var ALLOWED_EXT = ['pdf', 'doc', 'docx', 'txt'];
  var MAX_UPLOAD = 10 * 1024 * 1024; // 10 MB, same as the old MAX_CONTENT_LENGTH
  var FACULTIES = ['Arts', 'Education', 'Law', 'Pharmacy', 'Science', 'Social Sciences', 'Technology', 'The Social Sciences'];
  var OUTPUT_TYPES = ['Thesis', 'Dissertation', 'Journal Article', 'Conference Paper', 'Project Report', 'Book', 'Dataset'];

  /* ---------- small helpers ---------- */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function nextId(list) { return list.reduce(function (m, r) { return Math.max(m, r.id); }, 0) + 1; }
  function now() { return new Date().toISOString(); }
  function go(url) { window.location.href = url; }
  function params() { return new URLSearchParams(window.location.search); }

  /* ---------- flash messages (shown on the next page, like Flask flash) ---------- */
  function flash(msg) {
    var list = JSON.parse(sessionStorage.getItem('sh_flash') || '[]');
    list.push(msg);
    sessionStorage.setItem('sh_flash', JSON.stringify(list));
  }
  function showFlash(msg) { flash(msg); renderFlash(); }
  function renderFlash() {
    var box = document.getElementById('flash-area');
    if (!box) return;
    var list = JSON.parse(sessionStorage.getItem('sh_flash') || '[]');
    sessionStorage.removeItem('sh_flash');
    box.innerHTML = list.length
      ? '<div class="flash">' + list.map(function (m) { return '<div>' + esc(m) + '</div>'; }).join('') + '</div>'
      : '';
  }

  /* ---------- password hashing: PBKDF2-HMAC-SHA256, 120,000 rounds ---------- */
  function toHex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function fromHex(hex) { var a = new Uint8Array(hex.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16); return a; }
  async function pbkdf2(password, salt) {
    var key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    return toHex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: 120000 }, key, 256));
  }
  async function hashPassword(password) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    return toHex(salt) + '$' + await pbkdf2(password, salt);
  }
  async function checkPassword(password, stored) {
    try {
      var parts = stored.split('$');
      var digest = await pbkdf2(password, fromHex(parts[0]));
      if (digest.length !== parts[1].length) return false;
      var diff = 0;
      for (var i = 0; i < digest.length; i++) diff |= digest.charCodeAt(i) ^ parts[1].charCodeAt(i);
      return diff === 0;
    } catch (e) { return false; }
  }

  /* ---------- tables: users, outputs, audit ---------- */
  var Users = { all: function () { return load('sh_users', []); }, set: function (v) { save('sh_users', v); } };
  var Outputs = { all: function () { return load('sh_outputs', []); }, set: function (v) { save('sh_outputs', v); } };
  var Audit = { all: function () { return load('sh_audit', []); }, set: function (v) { save('sh_audit', v); } };

  function audit(userId, action, outputId) {
    var list = Audit.all();
    list.push({ id: nextId(list), user_id: userId, action: action, output_id: outputId || null, created_at: now() });
    Audit.set(list);
  }

  /* ---------- uploaded files (IndexedDB) ---------- */
  function openFilesDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('scholarhub_files', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('files'); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  async function saveFile(name, blob) {
    var d = await openFilesDB();
    return new Promise(function (resolve, reject) {
      var tx = d.transaction('files', 'readwrite');
      tx.objectStore('files').put(blob, name);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }
  async function getFile(name) {
    var d = await openFilesDB();
    return new Promise(function (resolve, reject) {
      var req = d.transaction('files').objectStore('files').get(name);
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  /* ---------- first-run setup: librarian account + sample records ---------- */
  async function initDb() {
    var users = Users.all();
    if (!users.some(function (u) { return u.email === 'admin@ui.edu.ng'; })) {
      users.push({ id: nextId(users), name: 'Repository Librarian', email: 'admin@ui.edu.ng',
        password_hash: await hashPassword('Admin@12345'), role: 'librarian', created_at: now() });
      Users.set(users);
    }
    if (Outputs.all().length === 0) {
      var samples = [
        ['Machine Learning Approaches for Student Performance Prediction', 'Adebayo T.; Okafor N.', 'A study of supervised learning methods for predicting student performance.', 'machine learning, education, prediction', 'Science', 'Computer Science', 'Project Report', 2025],
        ['Digital Library Services and User Experience in Nigerian Universities', 'Ibrahim K.; Bello A.', 'An assessment of digital library service use and user experience.', 'digital library, usability, Nigeria', 'Social Sciences', 'Library and Information Science', 'Journal Article', 2024],
        ['Mobile Learning Adoption Among University Students', 'Ojo M.; Yusuf R.', 'Factors influencing adoption of mobile learning services among students.', 'mobile learning, adoption, students', 'Education', 'Educational Technology', 'Thesis', 2025],
        ['Data Privacy Practices in Higher Education Systems', 'Okoro P.; Adekunle S.', 'A review of privacy practices for student information systems.', 'privacy, data protection, higher education', 'Technology', 'Computer Science', 'Conference Paper', 2023],
        ['Open Access Repositories and Scholarly Visibility', 'Lawal F.; Eze C.', 'The role of institutional repositories in scholarly communication.', 'open access, repository, visibility', 'Arts', 'Communication and Language Arts', 'Journal Article', 2024]
      ];
      Outputs.set(samples.map(function (s, i) {
        return { id: i + 1, title: s[0], authors: s[1], abstract: s[2], keywords: s[3], faculty: s[4], department: s[5],
          output_type: s[6], year: s[7], file_name: null, access_level: 'open', status: 'approved', submitted_by: null,
          moderation_note: null, views: 0, downloads: 0, created_at: now() };
      }));
    }
  }

  /* ---------- session ---------- */
  function currentUser() {
    var uid = Number(localStorage.getItem('sh_user_id'));
    if (!uid) return null;
    return Users.all().filter(function (u) { return u.id === uid; })[0] || null;
  }
  function logout() { localStorage.removeItem('sh_user_id'); go('index.html'); }
  function requireLogin() {
    if (currentUser()) return true;
    flash('Please log in first.');
    go('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop()));
    return false;
  }
  function requireRole(roles) {
    var u = currentUser();
    if (!u || roles.indexOf(u.role) === -1) { go('error.html?code=403'); return false; }
    return true;
  }
  function safeNext(next) { return /^[a-z-]+\.html(\?[^\s]*)?$/i.test(next || '') ? next : 'index.html'; }

  /* ---------- search (used by the Search page and the API helpers) ---------- */
  function searchOutputs(f) {
    f = f || {};
    var q = (f.q || '').trim().toLowerCase();
    var rows = Outputs.all().filter(function (o) {
      if (o.status !== 'approved') return false;
      if (q && ![o.title, o.authors, o.keywords, o.abstract].some(function (t) { return t.toLowerCase().indexOf(q) !== -1; })) return false;
      if (f.faculty && o.faculty !== f.faculty) return false;
      if (f.department && o.department.toLowerCase().indexOf(f.department.toLowerCase()) === -1) return false;
      if (f.author && o.authors.toLowerCase().indexOf(f.author.toLowerCase()) === -1) return false;
      if (f.output_type && o.output_type !== f.output_type) return false;
      if (/^\d+$/.test(f.year || '') && o.year !== Number(f.year)) return false;
      return true;
    });
    rows.sort(function (a, b) { return b.year - a.year || b.id - a.id; });
    return rows;
  }

  /* ---------- page header (nav depends on who is logged in) ---------- */
  function renderNav() {
    var nav = document.getElementById('main-nav');
    if (!nav) return;
    var u = currentUser();
    var html = '<a href="index.html">Search</a>';
    if (u) {
      html += '<a href="deposit.html">Deposit</a><a href="my-outputs.html">My Items</a>';
      if (u.role === 'librarian' || u.role === 'admin') html += '<a href="admin.html">Librarian</a>';
      html += '<a href="index.html" id="logout-link">Logout</a>';
    } else {
      html += '<a href="login.html">Login</a><a class="btn small" href="register.html">Register</a>';
    }
    nav.innerHTML = html;
    var out = document.getElementById('logout-link');
    if (out) out.addEventListener('click', function (e) { e.preventDefault(); logout(); });
  }

  /* ---------- JSON helpers for web/mobile clients (replace the old /api routes) ---------- */
  var PUBLIC_FIELDS = ['id', 'title', 'authors', 'abstract', 'keywords', 'faculty', 'department', 'output_type', 'year', 'access_level', 'views', 'downloads'];
  function publicView(o) { var r = {}; PUBLIC_FIELDS.forEach(function (k) { r[k] = o[k]; }); return r; }
  function countBy(rows, key) {
    var m = {}; rows.forEach(function (r) { m[r[key]] = (m[r[key]] || 0) + 1; });
    return Object.keys(m).map(function (k) { var o = { count: m[k] }; o[key] = key === 'year' ? Number(k) : k; return o; });
  }
  var API = {
    outputs: function (filters) { return searchOutputs(filters).map(publicView); },
    output: function (id) {
      var o = Outputs.all().filter(function (r) { return r.id === Number(id) && r.status === 'approved'; })[0];
      return o ? publicView(o) : { error: 'Not found' };
    },
    facets: function () {
      var rows = Outputs.all().filter(function (o) { return o.status === 'approved'; });
      var byKey = function (k, desc) { return countBy(rows, k).sort(function (a, b) { return desc ? b[k] - a[k] : String(a[k]).localeCompare(b[k]); }); };
      return { faculties: byKey('faculty'), types: byKey('output_type'), years: byKey('year', true) };
    },
    register: async function (data) {
      data = data || {};
      var name = (data.name || '').trim(), email = (data.email || '').trim().toLowerCase(), password = data.password || '';
      if (!/(@ui\.edu\.ng|@dlc\.ui\.edu\.ng)$/.test(email) || password.length < 8 || !name)
        return { error: 'Valid name, UI/DLC email and 8+ character password required' };
      var users = Users.all();
      if (users.some(function (u) { return u.email === email; })) return { error: 'Email already registered' };
      var id = nextId(users);
      users.push({ id: id, name: name, email: email, password_hash: await hashPassword(password), role: 'depositor', created_at: now() });
      Users.set(users);
      return { id: id, message: 'registered' };
    },
    oai: function (verb) {
      verb = verb || 'Identify';
      var rows = Outputs.all().filter(function (o) { return o.status === 'approved'; }).sort(function (a, b) { return a.id - b.id; });
      if (verb === 'Identify') return { repositoryName: 'UI-ScholarHub', protocolVersion: '2.0', metadataPrefix: 'oai_dc' };
      if (verb === 'ListRecords') return { metadataPrefix: 'oai_dc', records: rows.map(function (r) {
        return { identifier: 'oai:ui-scholarhub:' + r.id, title: r.title, creator: r.authors, description: r.abstract, date: String(r.year), type: r.output_type }; }) };
      if (verb === 'ListSets') return { sets: Array.from(new Set(rows.map(function (r) { return r.faculty; }))).sort() };
      if (verb === 'ListMetadataFormats') return { metadataFormats: ['oai_dc'] };
      if (verb === 'ListIdentifiers') return { identifiers: rows.map(function (r) { return 'oai:ui-scholarhub:' + r.id; }) };
      return { error: 'Unsupported verb in prototype' };
    }
  };

  /* ---------- start-up: every page waits for this before it runs ---------- */
  var ready = initDb().then(function () { renderNav(); renderFlash(); });

  window.App = {
    ready: ready, esc: esc, go: go, params: params, flash: flash, showFlash: showFlash,
    FACULTIES: FACULTIES, OUTPUT_TYPES: OUTPUT_TYPES, ALLOWED_EXT: ALLOWED_EXT, MAX_UPLOAD: MAX_UPLOAD,
    Users: Users, Outputs: Outputs, nextId: nextId, now: now, audit: audit,
    hashPassword: hashPassword, checkPassword: checkPassword,
    saveFile: saveFile, getFile: getFile,
    currentUser: currentUser, logout: logout, requireLogin: requireLogin, requireRole: requireRole, safeNext: safeNext,
    searchOutputs: searchOutputs,
    login: function (id) { localStorage.setItem('sh_user_id', String(id)); }
  };
  window.ScholarHubAPI = API;
})();
