(() => {
  const homeView = document.getElementById("view-home");
  const guideView = document.getElementById("view-guide");
  if (!homeView || !guideView) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let switching = false;
  const demoControllers = new Map();

  function setHash(view) {
    const next = view === "guide" ? "#guide" : "#";
    if (location.hash !== next && !(view === "home" && (!location.hash || location.hash === "#"))) {
      history.replaceState(null, "", next === "#" ? location.pathname + location.search : next);
    }
  }

  async function showView(name, { push = true } = {}) {
    if (switching) return;
    const target = name === "guide" ? guideView : homeView;
    const other = name === "guide" ? homeView : guideView;
    if (!target.hidden && other.hidden) {
      if (push) setHash(name);
      return;
    }
    switching = true;
    other.classList.add("is-leaving");
    await new Promise((r) => setTimeout(r, prefersReduced ? 0 : 280));
    other.hidden = true;
    other.classList.remove("is-leaving");
    target.hidden = false;
    target.classList.add("is-entering");
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    if (push) setHash(name);
    if (name === "guide") startVisibleDemos();
    await new Promise((r) => setTimeout(r, prefersReduced ? 0 : 420));
    target.classList.remove("is-entering");
    switching = false;
  }

  function routeFromHash() {
    const h = (location.hash || "").replace(/^#/, "");
    showView(h === "guide" ? "guide" : "home", { push: false });
  }

  document.querySelectorAll("[data-open-guide]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      showView("guide");
    });
  });
  document.querySelectorAll("[data-open-home]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      showView("home");
    });
  });
  window.addEventListener("hashchange", routeFromHash);

  const toc = document.querySelectorAll(".toc-chip");
  const sections = [...document.querySelectorAll(".guide-section[id]")];
  toc.forEach((chip) => {
    chip.addEventListener("click", () => {
      document.getElementById(chip.getAttribute("data-jump"))?.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "start",
      });
    });
  });
  if ("IntersectionObserver" in window && sections.length) {
    const tocObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          toc.forEach((c) => c.classList.toggle("is-active", c.getAttribute("data-jump") === entry.target.id));
        });
      },
      { rootMargin: "-35% 0px -50% 0px", threshold: 0.1 }
    );
    sections.forEach((s) => tocObs.observe(s));
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, prefersReduced ? Math.min(ms, 40) : ms));
  }

  function moveCursor(cursor, x, y) {
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
  }

  function centerOf(el, stage) {
    const a = el.getBoundingClientRect();
    const b = stage.getBoundingClientRect();
    return {
      x: a.left - b.left + a.width * 0.65,
      y: a.top - b.top + a.height * 0.55,
    };
  }

  async function typeInto(field, text, delay = 50) {
    field.classList.add("is-focus");
    field.textContent = "";
    const caret = document.createElement("span");
    caret.className = "caret";
    field.appendChild(caret);
    for (const ch of text) {
      caret.insertAdjacentText("beforebegin", ch);
      await sleep(delay);
    }
    await sleep(180);
    field.classList.remove("is-focus");
    caret.remove();
  }

  async function clickEl(cursor, el, stage) {
    const p = centerOf(el, stage);
    moveCursor(cursor, p.x, p.y);
    cursor.classList.add("is-on");
    await sleep(260);
    cursor.classList.add("is-click");
    el.classList.add("is-press");
    await sleep(200);
    el.classList.remove("is-press");
    cursor.classList.remove("is-click");
  }

  function setCaption(node, text) {
    const label = node.querySelector("[data-caption-text]");
    if (label) label.textContent = text;
    node.classList.add("is-on");
  }

  function setBoot(el, mode, text) {
    el.textContent = text;
    el.classList.toggle("is-ready", mode === "ready");
    el.classList.toggle("is-wait", mode === "wait");
  }

  function resetAuthFields(stage, { tab = "login", promoVisible = false } = {}) {
    const tabLogin = stage.querySelector('[data-tab="login"]');
    const tabReg = stage.querySelector('[data-tab="register"]');
    const promo = stage.querySelector("[data-field=promo]");
    const email = stage.querySelector("[data-field=email]");
    const pass = stage.querySelector("[data-field=pass]");
    const btn = stage.querySelector("[data-btn=submit]");
    const row = stage.querySelector("[data-auth-row]");
    const done = stage.querySelector("[data-reg-done]");
    const form = stage.querySelector("[data-auth-form]");

    if (form) form.hidden = false;
    if (done) done.hidden = true;

    tabLogin?.classList.toggle("is-active", tab === "login");
    tabReg?.classList.toggle("is-active", tab === "register");
    if (promo) promo.hidden = !promoVisible;
    if (row) {
      const forgot = row.querySelector("[data-forgot]");
      if (forgot) forgot.hidden = tab !== "login";
    }
    if (email) {
      email.textContent = "you@example.com";
      email.style.color = "#9CA3AF";
    }
    if (pass) {
      pass.textContent = "••••••••";
      pass.style.color = "#9CA3AF";
    }
    if (promo) {
      promo.textContent = "Необязательно";
      promo.style.color = "#9CA3AF";
    }
    if (btn) {
      btn.classList.add("is-wait");
      btn.textContent = "Ожидание канала…";
    }
  }

  /** Shared: wait gray → green countdown → unlock black button */
  async function playBootstrapReady(stage, stopSignal, caption) {
    const boot = stage.querySelector("[data-boot]");
    const btn = stage.querySelector("[data-btn=submit]");
    setBoot(boot, "wait", "Подключение… подождите");
    btn.classList.add("is-wait");
    btn.textContent = "Ожидание канала…";
    setCaption(caption, "Каналу нужно пару секунд, чтобы подготовиться");
    await sleep(1600);
    if (stopSignal.stopped) return false;

    let sec = 119;
    setBoot(
      boot,
      "ready",
      `Канал готов. Осталось ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")} — войдите или зарегистрируйтесь`
    );
    setCaption(caption, "Готово — теперь можно войти или зарегистрироваться");
    btn.classList.remove("is-wait");
    // tick a few seconds for the animation
    for (let i = 0; i < 3; i++) {
      if (stopSignal.stopped) return false;
      await sleep(700);
      sec -= 1;
      setBoot(
        boot,
        "ready",
        `Канал готов. Осталось ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")} — войдите или зарегистрируйтесь`
      );
    }
    return true;
  }

  async function runRegister(stage, stopSignal) {
    const cursor = stage.querySelector(".demo-cursor");
    const caption = stage.querySelector(".demo-caption");
    const tabReg = stage.querySelector('[data-tab="register"]');
    const email = stage.querySelector("[data-field=email]");
    const pass = stage.querySelector("[data-field=pass]");
    const promo = stage.querySelector("[data-field=promo]");
    const btn = stage.querySelector("[data-btn=submit]");
    const form = stage.querySelector("[data-auth-form]");
    const done = stage.querySelector("[data-reg-done]");

    while (!stopSignal.stopped) {
      resetAuthFields(stage, { tab: "login", promoVisible: false });
      cursor.classList.add("is-on");
      moveCursor(cursor, 40, 50);

      const ok = await playBootstrapReady(stage, stopSignal, caption);
      if (!ok || stopSignal.stopped) break;

      btn.textContent = "Войти";
      await clickEl(cursor, tabReg, stage);
      tabReg.classList.add("is-active");
      stage.querySelector('[data-tab="login"]')?.classList.remove("is-active");
      if (promo) promo.hidden = false;
      const forgot = stage.querySelector("[data-forgot]");
      if (forgot) forgot.hidden = true;
      btn.textContent = "Зарегистрироваться";
      setCaption(caption, "Переключаемся на регистрацию");
      await sleep(650);
      if (stopSignal.stopped) break;

      moveCursor(cursor, ...Object.values(centerOf(email, stage)));
      setCaption(caption, "Введите email");
      email.style.color = "#000";
      await typeInto(email, "you@mail.ru", 42);
      if (stopSignal.stopped) break;

      moveCursor(cursor, ...Object.values(centerOf(pass, stage)));
      setCaption(caption, "Придумайте пароль");
      pass.style.color = "#000";
      await typeInto(pass, "••••••••", 60);
      if (stopSignal.stopped) break;

      moveCursor(cursor, ...Object.values(centerOf(promo, stage)));
      setCaption(caption, "Промокод или реферальный код — необязательно");
      promo.style.color = "#000";
      await typeInto(promo, "SILENT30", 45);
      if (stopSignal.stopped) break;

      await clickEl(cursor, btn, stage);
      setCaption(caption, "Откройте письмо и подтвердите email");
      if (form) form.hidden = true;
      if (done) done.hidden = false;
      await sleep(2400);
      if (stopSignal.stopped) break;
    }
  }

  async function runLogin(stage, stopSignal) {
    const cursor = stage.querySelector(".demo-cursor");
    const caption = stage.querySelector(".demo-caption");
    const email = stage.querySelector("[data-field=email]");
    const pass = stage.querySelector("[data-field=pass]");
    const btn = stage.querySelector("[data-btn=submit]");
    const boot = stage.querySelector("[data-boot]");

    while (!stopSignal.stopped) {
      resetAuthFields(stage, { tab: "login", promoVisible: false });
      cursor.classList.add("is-on");

      // Login: channel already ready (same screen as register, without promo)
      setBoot(
        boot,
        "ready",
        "Канал готов. Осталось 1:42 — войдите или зарегистрируйтесь"
      );
      btn.classList.remove("is-wait");
      btn.textContent = "Войти";
      setCaption(caption, "Тот же экран — переключаемся на «Войти»");
      await sleep(1100);
      if (stopSignal.stopped) break;

      moveCursor(cursor, ...Object.values(centerOf(email, stage)));
      setCaption(caption, "Введите email аккаунта");
      email.style.color = "#000";
      await typeInto(email, "you@mail.ru", 40);
      if (stopSignal.stopped) break;

      moveCursor(cursor, ...Object.values(centerOf(pass, stage)));
      setCaption(caption, "И пароль");
      pass.style.color = "#000";
      await typeInto(pass, "••••••••", 60);
      if (stopSignal.stopped) break;

      await clickEl(cursor, btn, stage);
      setCaption(caption, "Готово — открывается главный экран");
      btn.textContent = "Вход…";
      await sleep(2200);
      if (stopSignal.stopped) break;
    }
  }

  async function runConnect(stage, stopSignal) {
    const cursor = stage.querySelector(".demo-cursor");
    const caption = stage.querySelector(".demo-caption");
    const toggle = stage.querySelector("[data-toggle]");
    const status = stage.querySelector("[data-status]");

    while (!stopSignal.stopped) {
      toggle.classList.remove("is-on", "is-connecting");
      status.classList.remove("is-on");
      status.textContent = "Отключено";
      setCaption(caption, "Один тумблер — включает и выключает VPN");
      cursor.classList.add("is-on");
      const p = centerOf(toggle, stage);
      moveCursor(cursor, p.x - 36, p.y + 18);
      await sleep(800);
      if (stopSignal.stopped) break;

      setCaption(caption, "Нажимаем — соединение устанавливается");
      moveCursor(cursor, p.x, p.y);
      await sleep(350);
      cursor.classList.add("is-click");
      toggle.classList.add("is-connecting");
      status.textContent = "Подключение…";
      await sleep(220);
      cursor.classList.remove("is-click");
      await sleep(1300);
      toggle.classList.remove("is-connecting");
      toggle.classList.add("is-on");
      status.classList.add("is-on");
      status.textContent = "Подключено";
      setCaption(caption, "Готово — весь трафик идёт через защищённый канал");
      await sleep(2200);
      if (stopSignal.stopped) break;

      setCaption(caption, "Выключается тем же нажатием");
      await clickEl(cursor, toggle, stage);
      toggle.classList.remove("is-on");
      status.classList.remove("is-on");
      status.textContent = "Отключено";
      await sleep(1300);
    }
  }

  async function runExclusions(stage, stopSignal) {
    const cursor = stage.querySelector(".demo-cursor");
    const caption = stage.querySelector(".demo-caption");
    const menu = stage.querySelector("[data-menu]");
    const list = stage.querySelector("[data-excl]");
    const openBtn = stage.querySelector("[data-open-excl]");
    const items = [...stage.querySelectorAll("[data-app]")];

    while (!stopSignal.stopped) {
      menu.hidden = false;
      list.hidden = true;
      items.forEach((it) => {
        it.querySelector(".demo-check")?.classList.remove("is-on");
        it.classList.remove("is-hot");
      });
      openBtn.classList.remove("is-hot");
      setCaption(caption, "Зачем: игры, банк, лаунчеры — иногда лучше мимо VPN");
      cursor.classList.add("is-on");
      moveCursor(cursor, 48, 70);
      await sleep(1100);
      if (stopSignal.stopped) break;

      openBtn.classList.add("is-hot");
      await clickEl(cursor, openBtn, stage);
      setCaption(caption, "Меню → «Исключения приложений»");
      await sleep(400);
      menu.hidden = true;
      list.hidden = false;
      await sleep(500);
      if (stopSignal.stopped) break;

      setCaption(caption, "Отмеченные приложения идут мимо VPN-туннеля");
      for (const app of items.slice(0, 2)) {
        if (stopSignal.stopped) break;
        app.classList.add("is-hot");
        await clickEl(cursor, app, stage);
        app.querySelector(".demo-check")?.classList.add("is-on");
        await sleep(400);
        app.classList.remove("is-hot");
      }
      if (stopSignal.stopped) break;
      setCaption(caption, "Остальной трафик по-прежнему через Silent VPN");
      await sleep(2400);
    }
  }

  async function runSubscription(stage, stopSignal) {
    const cursor = stage.querySelector(".demo-cursor");
    const caption = stage.querySelector(".demo-caption");
    const menu = stage.querySelector("[data-menu]");
    const plans = stage.querySelector("[data-sub-plans]");
    const wait = stage.querySelector("[data-sub-wait]");
    const ok = stage.querySelector("[data-sub-ok]");
    const openBtn = stage.querySelector("[data-open-sub]");
    const planBtn = stage.querySelector('[data-plan="monthly"]');

    while (!stopSignal.stopped) {
      menu.hidden = false;
      plans.hidden = true;
      wait.hidden = true;
      ok.hidden = true;
      openBtn.classList.remove("is-hot");
      planBtn?.classList.remove("is-press");
      setCaption(caption, "Меню → «Подписка» — выбор тарифа и оплата");
      cursor.classList.add("is-on");
      moveCursor(cursor, 48, 70);
      await sleep(1000);
      if (stopSignal.stopped) break;

      openBtn.classList.add("is-hot");
      await clickEl(cursor, openBtn, stage);
      setCaption(caption, "Открываем раздел подписки");
      await sleep(350);
      menu.hidden = true;
      plans.hidden = false;
      await sleep(700);
      if (stopSignal.stopped) break;

      setCaption(caption, "Выбираем тариф — откроется оплата в браузере");
      await clickEl(cursor, planBtn, stage);
      await sleep(400);
      plans.hidden = true;
      wait.hidden = false;
      setCaption(caption, "Ждём подтверждения от YuMoney");
      await sleep(2200);
      if (stopSignal.stopped) break;

      wait.hidden = true;
      ok.hidden = false;
      setCaption(caption, "Готово — подписка активирована на весь аккаунт");
      await sleep(2400);
    }
  }

  async function runBonuses(stage, stopSignal) {
    const cursor = stage.querySelector(".demo-cursor");
    const caption = stage.querySelector(".demo-caption");
    const menu = stage.querySelector("[data-menu]");
    const page = stage.querySelector("[data-bonuses]");
    const openBtn = stage.querySelector("[data-open-bonuses]");
    const copyBtn = stage.querySelector("[data-copy-ref]");
    const copyMsg = stage.querySelector("[data-copy-msg]");
    const promoField = stage.querySelector("[data-field=promo-check]");
    const checkBtn = stage.querySelector("[data-check-promo]");
    const promoMsg = stage.querySelector("[data-promo-msg]");

    while (!stopSignal.stopped) {
      menu.hidden = false;
      page.hidden = true;
      openBtn.classList.remove("is-hot");
      if (copyMsg) copyMsg.hidden = true;
      if (promoMsg) promoMsg.hidden = true;
      if (promoField) {
        promoField.textContent = "Введите код";
        promoField.style.color = "#9CA3AF";
      }
      setCaption(caption, "Меню → «Бонусы» — рефералка и промокоды");
      cursor.classList.add("is-on");
      moveCursor(cursor, 48, 70);
      await sleep(1000);
      if (stopSignal.stopped) break;

      openBtn.classList.add("is-hot");
      await clickEl(cursor, openBtn, stage);
      setCaption(caption, "Открываем бонусную программу");
      await sleep(350);
      menu.hidden = true;
      page.hidden = false;
      await sleep(700);
      if (stopSignal.stopped) break;

      setCaption(caption, "Копируем ссылку и отправляем другу");
      await clickEl(cursor, copyBtn, stage);
      if (copyMsg) copyMsg.hidden = false;
      await sleep(1200);
      if (stopSignal.stopped) break;

      moveCursor(cursor, ...Object.values(centerOf(promoField, stage)));
      setCaption(caption, "Или проверяем промокод");
      promoField.style.color = "#000";
      await typeInto(promoField, "SILENT20", 45);
      if (stopSignal.stopped) break;

      await clickEl(cursor, checkBtn, stage);
      if (promoMsg) promoMsg.hidden = false;
      setCaption(caption, "Скидка применена к тарифу");
      await sleep(2400);
    }
  }

  async function runSessions(stage, stopSignal) {
    const cursor = stage.querySelector(".demo-cursor");
    const caption = stage.querySelector(".demo-caption");
    const menu = stage.querySelector("[data-menu]");
    const page = stage.querySelector("[data-sessions]");
    const openBtn = stage.querySelector("[data-open-sessions]");
    const android = stage.querySelector('[data-session="android"]');
    const renameBtn = android?.querySelector("[data-rename]");
    const customLabel = android?.querySelector("[data-custom-label]");
    const sub = stage.querySelector("[data-sessions-sub]");

    while (!stopSignal.stopped) {
      menu.hidden = false;
      page.hidden = true;
      openBtn.classList.remove("is-hot");
      android?.classList.remove("is-hot");
      if (customLabel) {
        customLabel.hidden = true;
        customLabel.textContent = "";
      }
      if (sub) sub.textContent = "VPN онлайн: 1 из 2";
      setCaption(caption, "Сессия — вход с устройства. До 3 одновременно");
      cursor.classList.add("is-on");
      moveCursor(cursor, 48, 70);
      await sleep(1100);
      if (stopSignal.stopped) break;

      openBtn.classList.add("is-hot");
      await clickEl(cursor, openBtn, stage);
      setCaption(caption, "Меню → «Сессии»");
      await sleep(350);
      menu.hidden = true;
      page.hidden = false;
      await sleep(800);
      if (stopSignal.stopped) break;

      setCaption(caption, "Зелёная точка — VPN онлайн на этом устройстве");
      await sleep(1600);
      if (stopSignal.stopped) break;

      android?.classList.add("is-hot");
      setCaption(caption, "Можно подписать устройство — чтобы не перепутать");
      await clickEl(cursor, renameBtn, stage);
      if (customLabel) {
        customLabel.hidden = false;
        customLabel.textContent = "Телефон";
      }
      await sleep(1400);
      if (stopSignal.stopped) break;

      setCaption(caption, "Лишнюю сессию можно удалить крестиком");
      await sleep(2200);
      android?.classList.remove("is-hot");
    }
  }

  const runners = {
    overview: runConnect,
    register: runRegister,
    login: runLogin,
    connect: runConnect,
    exclusions: runExclusions,
    subscription: runSubscription,
    bonuses: runBonuses,
    sessions: runSessions,
  };

  function stopDemo(id) {
    const ctrl = demoControllers.get(id);
    if (ctrl) ctrl.stopped = true;
  }

  function startDemo(stage) {
    const id = stage.getAttribute("data-demo");
    if (!id || !runners[id]) return;
    stopDemo(id);
    const signal = { stopped: false };
    demoControllers.set(id, signal);
    runners[id](stage, signal);
  }

  function startVisibleDemos() {
    document.querySelectorAll(".demo-stage[data-demo]").forEach((stage) => {
      const rect = stage.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9 && rect.bottom > 80) startDemo(stage);
    });
  }

  if ("IntersectionObserver" in window) {
    const demoObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-demo");
          if (entry.isIntersecting && entry.intersectionRatio > 0.35) startDemo(entry.target);
          else stopDemo(id);
        });
      },
      { threshold: [0.35, 0.6] }
    );
    document.querySelectorAll(".demo-stage[data-demo]").forEach((s) => demoObs.observe(s));
  }

  if ((location.hash || "").replace(/^#/, "") === "guide") {
    homeView.hidden = true;
    guideView.hidden = false;
    startVisibleDemos();
  } else {
    guideView.hidden = true;
    homeView.hidden = false;
  }
})();
