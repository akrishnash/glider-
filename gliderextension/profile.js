(function () {
  var GLIDER_STORAGE_KEY = 'glider_profile';

  var DEFAULT_PROFILE = {
    personal: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      linkedin: '',
      github: '',
      portfolio: '',
      city: '',
      state: '',
      country: ''
    },
    professional: {
      current_title: '',
      years_experience: '',
      salary_expectation: '',
      notice_period: ''
    },
    resume: {
      file_base64: '',
      filename: ''
    },
    custom_answers: {}
  };

  var LABEL_TO_PROFILE_KEY = [
    { patterns: ['first name', 'fname', 'given name', 'firstname'], key: 'personal.first_name' },
    { patterns: ['last name', 'lname', 'surname', 'family name', 'lastname'], key: 'personal.last_name' },
    { patterns: ['full name'], key: 'personal.full_name_composite' },
    { patterns: ['name'], key: 'personal.first_name' },
    { patterns: ['email', 'e-mail', 'e-mail address', 'email address'], key: 'personal.email' },
    { patterns: ['phone', 'mobile', 'telephone', 'contact number', 'phone number'], key: 'personal.phone' },
    { patterns: ['linkedin', 'linkedin url', 'linkedin profile'], key: 'personal.linkedin' },
    { patterns: ['github', 'github url', 'github profile'], key: 'personal.github' },
    { patterns: ['portfolio', 'website', 'personal website', 'portfolio url'], key: 'personal.portfolio' },
    { patterns: ['city', 'location', 'current city'], key: 'personal.city' },
    { patterns: ['state', 'region', 'province'], key: 'personal.state' },
    { patterns: ['country'], key: 'personal.country' },
    { patterns: ['current title', 'current role', 'job title', 'title'], key: 'professional.current_title' },
    { patterns: ['years of experience', 'years experience', 'experience (years)', 'yoe'], key: 'professional.years_experience' },
    { patterns: ['salary', 'compensation', 'ctc', 'expected salary', 'salary expectation', 'pay'], key: 'professional.salary_expectation' },
    { patterns: ['notice period', 'notice', 'when can you start'], key: 'professional.notice_period' },
    { patterns: ['cover letter', 'why us', 'motivation', 'why do you want to work here', 'why are you interested'], key: 'custom_answers.cover_letter' },
    { patterns: ['resume', 'cv', 'upload resume', 'attach resume'], key: 'resume' }
  ];

  function getProfile() {
    return new Promise(function (resolve) {
      chrome.storage.local.get([GLIDER_STORAGE_KEY], function (result) {
        var stored = result[GLIDER_STORAGE_KEY] || {};
        resolve(deepMerge(JSON.parse(JSON.stringify(DEFAULT_PROFILE)), stored));
      });
    });
  }

  function setProfile(profile) {
    return new Promise(function (resolve) {
      chrome.storage.local.set({ glider_profile: profile }, resolve);
    });
  }

  function deepMerge(target, source) {
    for (var i = 0, keys = Object.keys(source); i < keys.length; i++) {
      var key = keys[i];
      if (
        source[key] != null &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        target[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  function getFieldLabel(el) {
    var text = '';
    if (el.labels && el.labels.length > 0) {
      text = el.labels[0].innerText || '';
    }
    if (!text && el.placeholder) text = el.placeholder;
    if (!text && el.getAttribute('aria-label')) text = el.getAttribute('aria-label');
    if (!text && el.name) text = el.name;
    var labelEl =
      el.closest('label') ||
      (el.id && document.querySelector('label[for="' + el.id + '"]'));
    if (!text && labelEl) text = labelEl.innerText || '';
    var parent = el.closest('div');
    if (!text && parent) {
      var firstText = parent.querySelector('label, .label, [class*="label"]');
      if (firstText) text = firstText.innerText || '';
      if (!text) text = parent.innerText || '';
    }
    return (text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function getLeverNameKey(name) {
    if (!name) return null;
    var n = name.toLowerCase();
    if (n === 'name') return 'personal.first_name';
    if (n === 'email') return 'personal.email';
    if (n === 'phone') return 'personal.phone';
    if (n === 'org') return 'professional.current_title';
    if (n.indexOf('linkedin') !== -1) return 'personal.linkedin';
    if (n.indexOf('github') !== -1) return 'personal.github';
    return null;
  }

  function matchLabelToProfileKey(labelText, nameAttr) {
    var profile = window.__gliderProfileCache || {};

    function getValue(path) {
      if (path === 'personal.full_name_composite') {
        var first =
          profile.personal && profile.personal.first_name
            ? String(profile.personal.first_name).trim()
            : '';
        var last =
          profile.personal && profile.personal.last_name
            ? String(profile.personal.last_name).trim()
            : '';
        return [first, last].filter(Boolean).join(' ') || '';
      }
      var parts = path.split('.');
      var v = profile;
      for (var i = 0; i < parts.length; i++) {
        if (v == null) return '';
        v = v[parts[i]];
      }
      return v != null ? String(v).trim() : '';
    }

    function getResume() {
      return profile.resume && profile.resume.file_base64 && profile.resume.filename
        ? profile.resume
        : null;
    }

    if (nameAttr) {
      var leverKey = getLeverNameKey(nameAttr);
      if (leverKey && leverKey !== 'resume') {
        var lv = getValue(leverKey);
        if (lv) return { key: leverKey, value: lv };
      }
    }

    var normalized = (labelText || '').toLowerCase().replace(/\s+/g, ' ');

    for (var i = 0; i < LABEL_TO_PROFILE_KEY.length; i++) {
      var entry = LABEL_TO_PROFILE_KEY[i];
      for (var j = 0; j < entry.patterns.length; j++) {
        if (normalized.indexOf(entry.patterns[j]) !== -1) {
          if (entry.key === 'resume') {
            var res = getResume();
            if (res) return { key: 'resume', value: res };
            return null;
          }
          if (entry.key === null) continue;
          var val = getValue(entry.key);
          if (val) return { key: entry.key, value: val };
          return null;
        }
      }
    }

    if (profile.custom_answers && typeof profile.custom_answers === 'object') {
      var entries = Object.keys(profile.custom_answers);
      for (var k = 0; k < entries.length; k++) {
        var q = entries[k];
        var a = profile.custom_answers[q];
        if (typeof a !== 'string') continue;
        var qNorm = q.toLowerCase();
        if (normalized.indexOf(qNorm) !== -1 || qNorm.indexOf(normalized) !== -1) {
          if (a.trim()) return { key: 'custom_answers.' + q, value: a.trim() };
          return null;
        }
      }
    }

    if (
      normalized.indexOf('cover letter') !== -1 ||
      normalized.indexOf('why') !== -1 ||
      normalized.indexOf('motivation') !== -1
    ) {
      var cv = getValue('custom_answers.cover_letter');
      if (cv) return { key: 'custom_answers.cover_letter', value: cv };
    }

    return null;
  }

  window.GliderProfile = {
    getProfile: getProfile,
    setProfile: setProfile,
    getFieldLabel: getFieldLabel,
    matchLabelToProfileKey: matchLabelToProfileKey,
    DEFAULT_PROFILE: DEFAULT_PROFILE,
    GLIDER_STORAGE_KEY: GLIDER_STORAGE_KEY
  };
})();
