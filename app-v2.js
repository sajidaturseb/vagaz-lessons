(() => {
  'use strict';

  const lessons = Array.isArray(window.VAGAZ_LESSONS) ? window.VAGAZ_LESSONS : [];
  const byNumber = new Map(lessons.map(lesson => [lesson.n, lesson]));
  const params = new URLSearchParams(location.search);
  const requested = Number(params.get('lesson')) || Number((location.hash.match(/lesson-(\d+)/) || [])[1]);
  const presetGroup = params.get('group') || '';
  const endpoint = 'https://kxwhwmxzmtvueksyayvz.supabase.co/functions/v1/submit-vagaz-assignment';
  const localPreview = ['127.0.0.1', 'localhost'].includes(location.hostname);
  const $ = id => document.getElementById(id);
  let current = byNumber.get(requested) || lessons[0];
  let attemptId = '';
  const groups = Array.from({ length: 3 }, (_, index) => `Дагват, 1 курс — ${index + 1} группа`);

  function fillGroupSelect(id, placeholder) {
    const select = $(id);
    select.replaceChildren(new Option(placeholder, ''));
    const block = document.createElement('optgroup');
    block.label = 'Дагват, 1 курс';
    for (const group of groups) block.append(new Option(group, group));
    select.add(block);
  }

  function node(tag, value, className) {
    const element = document.createElement(tag);
    if (value !== undefined) element.textContent = value;
    if (className) element.className = className;
    return element;
  }

  function lessonUrl(number) {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('lesson', String(number));
    const group = $('teacherGroup').value.trim();
    if (group) url.searchParams.set('group', group);
    url.hash = '';
    return url.toString();
  }

  function show(screen) {
    for (const id of ['home', 'intro', 'identity', 'assignment', 'submitted']) $(id).hidden = id !== screen;
    $('progress').hidden = screen === 'home';
    if (screen !== 'home') {
      const stages = {
        intro: ['Дәрес белән танышу', '1 / 3', '33.33%'],
        identity: ['Укучы турында мәгълүмат', '2 / 3', '66.67%'],
        assignment: ['Гамәли бирем', '3 / 3', '100%'],
        submitted: ['Эш тәмам', '3 / 3', '100%']
      };
      const [name, count, width] = stages[screen];
      $('stageName').textContent = name;
      $('stageCount').textContent = count;
      $('stageFill').style.width = width;
    }
    window.scrollTo(0, 0);
  }

  function renderHome() {
    const cards = $('lessonCards');
    cards.replaceChildren();
    $('teacherLesson').replaceChildren();
    for (const lesson of lessons) {
      const link = node('a', undefined, 'lesson-card');
      link.href = `?lesson=${lesson.n}`;
      link.append(node('span', String(lesson.n), 'number'), node('strong', lesson.title));
      cards.append(link);
      $('teacherLesson').add(new Option(`${lesson.n}. ${lesson.title}`, String(lesson.n)));
    }
    if (current) $('teacherLesson').value = String(current.n);
    fillGroupSelect('teacherGroup', 'Группаны сайлагыз');
    fillGroupSelect('studentGroup', 'Выберите группу');
    if (groups.includes(presetGroup)) {
      $('teacherGroup').value = presetGroup;
      $('studentGroup').value = presetGroup;
    }
  }

  function renderLesson(lesson) {
    current = lesson;
    attemptId = '';
    document.title = `${lesson.n} нче дәрес — Вәгазь дәресләре`;
    $('coursePill').textContent = `${lesson.n} нче дәрес`;
    $('introTitle').textContent = lesson.title;
    $('introTheme').textContent = `Дәреснең темасы: ${lesson.theme}`;
    $('introGoal').textContent = lesson.goal;
    $('specificPractice').textContent = `Тема: «${lesson.title}». Дәресне укыгач, аның төп фикерен, дәрестә китерелгән дәлилне һәм тыңлаучыга аңлаешлы тормышчан мисалны берләштереп, кыска чыгыш планы төзегез.`;
    const article = $('lessonReading');
    article.replaceChildren();
    for (const section of lesson.sections) {
      const card = node('section', undefined, 'reading-card');
      card.append(node('h2', section.heading));
      for (const block of section.paragraphs) {
        card.append(node('p', block, block.startsWith('Чыганак:') ? 'source' : ''));
      }
      article.append(card);
    }
    $('draft').value = '';
    $('submitStatus').textContent = '';
  }

  async function copyText(value, fallback) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      if (fallback) {
        fallback.hidden = false;
        fallback.value = value;
        fallback.focus();
        fallback.select();
      }
      return false;
    }
  }

  renderHome();
  $('previewNote').hidden = !localPreview;
  const homeButton = node('button', '← Барлык дәресләр', 'secondary back');
  homeButton.type = 'button';
  $('intro').prepend(homeButton);
  homeButton.addEventListener('click', () => {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    history.pushState(null, '', url);
    document.title = 'Вәгазь дәресләре';
    $('coursePill').textContent = '25 дәрес';
    show('home');
  });
  if (byNumber.has(requested)) {
    renderLesson(current);
    show('intro');
  } else {
    document.title = 'Вәгазь дәресләре';
    show('home');
  }

  $('copyLinkBtn').addEventListener('click', async () => {
    const copied = await copyText(lessonUrl($('teacherLesson').value), $('teacherLink'));
    $('copyNote').textContent = copied
      ? 'Дәрес сылтамасы күчерелде.'
      : 'Сылтама сайланды. Аны Ctrl+C белән күчереп алыгыз.';
  });
  $('toAssignment').addEventListener('click', () => show('identity'));
  $('backToIntro').addEventListener('click', () => show('intro'));
  $('startAssignment').addEventListener('click', () => {
    const name = $('studentName').value.trim();
    const group = $('studentGroup').value;
    if (!name || !group) {
      $('identityError').textContent = 'Исем-фамилияне языгыз һәм группагызны сайлагыз.';
      $('identityError').hidden = false;
      return;
    }
    $('identityError').hidden = true;
    $('identitySummary').textContent = `${name} · ${group}`;
    show('assignment');
  });
  $('backToText').addEventListener('click', () => show('intro'));
  $('submitAssignment').addEventListener('click', async () => {
    const name = $('studentName').value.trim();
    const group = $('studentGroup').value;
    const answer = $('draft').value.trim();
    const status = $('submitStatus');
    if (!name || !groups.includes(group)) {
      status.textContent = 'Исем-фамилияне һәм группаны яңадан тикшерегез.';
      return;
    }
    if (answer.length < 20) {
      status.textContent = 'Эшегезне тулырак языгыз.';
      return;
    }
    if (answer.length > 10000) {
      status.textContent = 'Эшегез 10 000 хәрефтән озынрак. Кыскартып җибәрегез.';
      return;
    }
    if (localPreview) {
      status.textContent = 'Бу — җирле карау. Эш әлегә журналга җибәрелми.';
      return;
    }
    attemptId ||= crypto.randomUUID();
    $('submitAssignment').disabled = true;
    status.textContent = 'Эш җибәрелә…';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: name,
          group,
          lessonId: current.n,
          lessonTitle: current.title,
          answer,
          attemptId
        })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error('submission_failed');
      $('submittedSummary').textContent = `${name} · ${group} · ${current.n} нче дәрес`;
      show('submitted');
    } catch {
      status.textContent = 'Эшне җибәреп булмады. Интернетны тикшереп, кабатлап карагыз.';
    } finally {
      $('submitAssignment').disabled = false;
    }
  });
})();
