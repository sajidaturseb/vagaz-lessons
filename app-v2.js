(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const isRussian = params.get('lang') === 'ru';
  const t = (tt, ru) => isRussian ? ru : tt;
  const tatarLessons = Array.isArray(window.VAGAZ_LESSONS) ? window.VAGAZ_LESSONS : [];
  const lessons = isRussian ? (Array.isArray(window.VAGAZ_LESSONS_RU) ? window.VAGAZ_LESSONS_RU : []) : tatarLessons;
  const byNumber = new Map(lessons.map(lesson => [lesson.n, lesson]));
  const requested = Number(params.get('lesson')) || Number((location.hash.match(/lesson-(\d+)/) || [])[1]);
  const presetGroup = params.get('group') || '';
  const endpoint = 'https://kxwhwmxzmtvueksyayvz.supabase.co/functions/v1/submit-vagaz-assignment';
  const localPreview = location.protocol === 'file:' || ['127.0.0.1', 'localhost'].includes(location.hostname);
  const $ = id => document.getElementById(id);
  let current = byNumber.get(requested) || lessons[0];
  let attemptId = '';
  const groups = Array.from({ length: 3 }, (_, index) => `Дагват, 1 курс — ${index + 1} группа`);

  function fillGroupSelect(id, placeholder) {
    const select = $(id);
    select.replaceChildren(new Option(placeholder, ''));
    const block = document.createElement('optgroup');
    block.label = t('1 курс', '1 курс');
    for (const group of groups) {
      const number = groups.indexOf(group) + 1;
      block.append(new Option(t(`1 курс — ${number} төркем`, `1 курс — ${number} группа`), group));
    }
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
    if (isRussian) url.searchParams.set('lang', 'ru');
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
        intro: [t('Дәрес белән танышу', 'Знакомство с уроком'), '1 / 3', '33.33%'],
        identity: [t('Укучы турында мәгълүмат', 'Сведения об ученике'), '2 / 3', '66.67%'],
        assignment: [t('Гамәли бирем', 'Практическое задание'), '3 / 3', '100%'],
        submitted: [t('Эш тәмам', 'Работа завершена'), '3 / 3', '100%']
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
      link.href = `?lesson=${lesson.n}${isRussian ? '&lang=ru' : ''}`;
      link.append(node('span', String(lesson.n), 'number'), node('strong', lesson.title));
      cards.append(link);
      $('teacherLesson').add(new Option(`${lesson.n}. ${lesson.title}`, String(lesson.n)));
    }
    if (current) $('teacherLesson').value = String(current.n);
    fillGroupSelect('teacherGroup', t('Төркемне сайлагыз', 'Выберите группу'));
    fillGroupSelect('studentGroup', t('Төркемне сайлагыз', 'Выберите группу'));
    if (groups.includes(presetGroup)) {
      $('teacherGroup').value = presetGroup;
      $('studentGroup').value = presetGroup;
    }
  }

  function renderLesson(lesson) {
    current = lesson;
    attemptId = '';
    document.title = t(`${lesson.n} нче дәрес — Вәгазь дәресләре`, `Урок ${lesson.n} — Уроки проповеди`);
    $('coursePill').textContent = t(`${lesson.n} нче дәрес`, `Урок ${lesson.n}`);
    $('introTitle').textContent = lesson.title;
    $('introTheme').textContent = `${t('Дәреснең темасы', 'Тема урока')}: ${lesson.theme}`;
    $('introGoal').textContent = lesson.goal;
    $('specificPractice').textContent = t(`Тема: «${lesson.title}». Дәресне укыгач, аның төп фикерен, дәрестә китерелгән дәлилне һәм тыңлаучыга аңлаешлы тормышчан мисалны берләштереп, кыска чыгыш планы төзегез.`, `Тема: «${lesson.title}». Прочитайте урок и составьте краткий план выступления: главная мысль, приведённый довод и понятный жизненный пример.`);
    const article = $('lessonReading');
    article.replaceChildren();
    for (const section of lesson.sections) {
      const card = node('section', undefined, 'reading-card');
      card.append(node('h2', section.heading));
      for (const block of section.paragraphs) {
        card.append(node('p', block, block.startsWith(t('Чыганак:', 'Источник:')) ? 'source' : ''));
      }
      article.append(card);
    }
    $('draft').value = '';
    $('submitStatus').textContent = '';
  }

  function setupLanguage() {
    document.documentElement.lang = isRussian ? 'ru' : 'tt';
    const switcher = document.createElement('nav');
    switcher.className = 'language-switch';
    switcher.setAttribute('aria-label', 'Тел / Язык');
    for (const [text, lang] of [['Татарча', 'tt'], ['Русский', 'ru']]) {
      const link = document.createElement('a');
      const url = new URL(location.href);
      if (lang === 'tt') url.searchParams.delete('lang');
      else url.searchParams.set('lang', 'ru');
      link.href = url.toString();
      link.textContent = text;
      link.lang = lang;
      if ((lang === 'ru') === isRussian) link.setAttribute('aria-current', 'page');
      switcher.append(link);
    }
    document.querySelector('.top').insertBefore(switcher, $('coursePill'));
    if (!isRussian) return;
    const set = (selector, value) => {
      const element = document.querySelector(selector);
      if (element) element.textContent = value;
    };
    const label = (selector, value) => {
      const element = document.querySelector(selector);
      if (element?.firstChild) element.firstChild.textContent = value;
    };
    document.title = 'Уроки проповеди';
    document.querySelector('meta[name="description"]').content = '25 уроков проповеди с практическими заданиями';
    set('.brand strong', 'Уроки проповеди');
    set('.brand small', '25 УРОКОВ');
    set('#coursePill', '25 уроков');
    set('#home .eyebrow', 'УРОКИ ПРОПОВЕДИ');
    set('#home h1', 'Уроки и практические задания');
    set('#home .lead', 'В 25 уроках учимся готовить выступления. Сначала читаем текст, затем составляем план по теме урока.');
    set('#home .teacher-panel .eyebrow', 'ДЛЯ ПРЕПОДАВАТЕЛЯ');
    set('#home .teacher-panel h2', 'Ссылка на урок');
    set('#home .teacher-panel > p:nth-of-type(2)', 'Выберите урок и группу, затем отправьте ученику готовую ссылку.');
    label('#home .teacher-panel label:nth-of-type(1)', 'Урок');
    label('#home .teacher-panel label:nth-of-type(2)', 'Группа');
    set('#copyLinkBtn', 'Скопировать ссылку');
    set('#home .journal-pending', 'Журнал письменных работ →');
    set('#intro .eyebrow', 'ТЕКСТ УРОКА');
    set('#intro .goal-card strong', 'Цель урока');
    set('#intro .closing-card strong', 'Подготовка к заданию');
    set('#intro .closing-card p', 'После чтения попробуйте своими словами изложить главную мысль, проверенный довод и понятный жизненный пример.');
    set('#toAssignment', 'Перейти к заданию');
    set('#backToIntro', '← Вернуться к тексту урока');
    set('#identity .eyebrow', 'СВЕДЕНИЯ ОБ УЧЕНИКЕ');
    set('#identity h1', 'Кто выполняет задание?');
    set('#identity .lead', 'Напишите имя и фамилию и выберите группу, чтобы преподаватель увидел вашу работу.');
    label('#identity label:nth-of-type(1)', 'Имя и фамилия');
    label('#identity label:nth-of-type(2)', 'Группа');
    set('#startAssignment', 'Начать задание');
    set('#backToText', '← Вернуться к тексту урока');
    set('#assignment .eyebrow', 'ПРАКТИЧЕСКОЕ ЗАДАНИЕ');
    set('#assignment h1', 'Подготовка проповеди');
    set('#assignment .lead', 'Составьте план выступления по теме урока своими словами.');
    const steps = [
      ['1. Слушатель', 'К кому вы обращаетесь?'],
      ['2. Главная мысль', 'Что вы хотите передать в нескольких фразах?'],
      ['3. Довод', 'Укажите довод из урока и его источник.'],
      ['4. Жизненный пример', 'Приведите один понятный слушателю пример.'],
      ['5. Итог', 'Сформулируйте бережный и практический вывод.'],
      ['6. Выступление', 'Попробуйте выступить своими словами по плану.']
    ];
    document.querySelectorAll('#assignment .assignment-step').forEach((step, index) => {
      step.querySelector('strong').textContent = steps[index][0];
      step.querySelector('span').textContent = steps[index][1];
    });
    label('#assignment label', 'План вашего выступления');
    $('draft').placeholder = 'Запишите слушателя, главную мысль, довод, пример и итог';
    set('#submitAssignment', 'Отправить работу');
    set('#previewNote', 'Это местный просмотр. Работа сейчас не отправляется в журнал.');
    set('#submitted .eyebrow', 'РАБОТА ОТПРАВЛЕНА');
    set('#submitted h1', 'Спасибо!');
    set('#submitted .lead', 'Ваша работа записана в журнале преподавателя.');
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

  setupLanguage();
  renderHome();
  $('previewNote').hidden = !localPreview;
  const homeButton = node('button', t('← Барлык дәресләр', '← Все уроки'), 'secondary back');
  homeButton.type = 'button';
  $('intro').prepend(homeButton);
  homeButton.addEventListener('click', () => {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    history.pushState(null, '', url);
    document.title = t('Вәгазь дәресләре', 'Уроки проповеди');
    $('coursePill').textContent = t('25 дәрес', '25 уроков');
    show('home');
  });
  if (byNumber.has(requested)) {
    renderLesson(current);
    show('intro');
  } else {
    document.title = t('Вәгазь дәресләре', 'Уроки проповеди');
    show('home');
  }

  $('copyLinkBtn').addEventListener('click', async () => {
    const copied = await copyText(lessonUrl($('teacherLesson').value), $('teacherLink'));
    $('copyNote').textContent = copied
      ? t('Дәрес сылтамасы күчерелде.', 'Ссылка на урок скопирована.')
      : t('Сылтама сайланды. Аны Ctrl+C белән күчереп алыгыз.', 'Ссылка выделена. Скопируйте её с помощью Ctrl+C.');
  });
  $('toAssignment').addEventListener('click', () => show('identity'));
  $('backToIntro').addEventListener('click', () => show('intro'));
  $('startAssignment').addEventListener('click', () => {
    const name = $('studentName').value.trim();
    const group = $('studentGroup').value;
    if (!name || !group) {
      $('identityError').textContent = t('Исем-фамилияне языгыз һәм группагызны сайлагыз.', 'Напишите имя и фамилию и выберите группу.');
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
      status.textContent = t('Исем-фамилияне һәм группаны яңадан тикшерегез.', 'Проверьте имя, фамилию и группу.');
      return;
    }
    if (answer.length < 20) {
      status.textContent = t('Эшегезне тулырак языгыз.', 'Напишите работу подробнее.');
      return;
    }
    if (answer.length > 10000) {
      status.textContent = t('Эшегез 10 000 хәрефтән озынрак. Кыскартып җибәрегез.', 'Работа превышает 10 000 знаков. Сократите её.');
      return;
    }
    if (localPreview) {
      status.textContent = t('Бу — җирле карау. Эш әлегә журналга җибәрелми.', 'Это местный просмотр. Работа сейчас не отправляется в журнал.');
      return;
    }
    attemptId ||= crypto.randomUUID();
    $('submitAssignment').disabled = true;
    status.textContent = '';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: name,
          group,
          lessonId: current.n,
          lessonTitle: tatarLessons[current.n - 1].title,
          answer,
          attemptId
        })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error('submission_failed');
      $('submittedSummary').textContent = `${name} · ${group} · ${t(`${current.n} нче дәрес`, `урок ${current.n}`)}`;
      show('submitted');
    } catch {
      status.textContent = t('Эшегез журналга теркәлмәде. Кабат җибәрергә кирәк.', 'Работа не записана в журнале. Отправьте ещё раз.');
    } finally {
      $('submitAssignment').disabled = false;
    }
  });
})();
