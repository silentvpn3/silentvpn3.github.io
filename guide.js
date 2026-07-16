(() => {
  const homeView = document.getElementById("view-home");
  const guideView = document.getElementById("view-guide");
  if (!homeView || !guideView) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let switching = false;
  const demoControllers = new Map();

  function setHash(view) {
    const next = view === "guide" ? "#guide" : "#";
    if (location.hash !== next && !(view === "home" && (location.hash === "" || location.hash === "#"))) {
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

  /* —— TOC —— */
  const toc = document.querySelectorAll(".toc-chip");
  const sections = [...document.querySelectorAll(".guide-section[id]")];

  toc.forEach((chip) => {
    chip.addEventListener("click", () => {
      const id = chip.getAttribute("data-jump");
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
    });
  });

  if ("IntersectionObserver" in window && sections.length) {
    const tocObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          toc.forEach((c) => c.classList.toggle("is-active", c.getAttribute("data-jump") === id));
        });
      },
      { rootMargin: "-35% 0px -50% 0px", threshold: 0.1 }
    );
    sections.forEach((s) => tocObs.observe(s));
  }

  /* —— Helpers —— */
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, prefersReduced ? 0 : ms));
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

  async function typeInto(field, text, delay = 55) {
    field.classList.add("is-focus");
    field.textContent = "";
    const caret = document.createElement("span");
    caret.className = "caret";
    field.appendChild(caret);
    for (const ch of text) {
      caret.insertAdjacentText("beforebegin", ch);
      await sleep(delay);
    }
    await sleep(200);
    field.classList.remove("is-focus");
    caret.remove();
  }

  async function clickEl(cursor, el, stage) {
    const p = centerOf(el, stage);
    moveCursor(cursor, p.x, p.y);
    cursor.classList.add("is-on");
    await sleep(280);
    cursor.classList.add("is-click");
    el.classList.add("is-press");
    await sleep(220);
    el.classList.remove("is-press");
    cursor.classList.remove("is-click");
  }

  function setCaption(node, text) {
    const label = node.querySelector("[data-caption-text]");
    if (label) label.textContent = text;
    node.classList.add("is-on");
  }

  /* —— Demo runners —— */
  async function runRegister(stage, stopSignal) {
    const cursor = stage.querySelector(".demo-cursor");
    const caption = stage.querySelector(".demo-caption");
    const tabReg = stage.querySelector('[data-tab="register"]');
    const tabLogin = stage.querySelector('[data-tab="login"]');
    const email = stage.querySelector("[data-field=email]");
    const pass = stage.querySelector("[data-field=pass]");
    const promo = stage.querySelector("[data-field=promo]");
    const btn = stage.querySelector("[data-btn=submit]");
    const title = stage.querySelector("[data-screen-title]");
    const sub = stage.querySelector("[data-screen-sub]");

    while (!stopSignal.stopped) {
      tabLogin.classList.add("is-active");
      tabReg.classList.remove("is-active");
      email.textContent = "Email";
      pass.textContent = "Пароль";
      promo.textContent = "Промо / реф (необязательно)";
      email.style.color = "#bbb";
      pass.style.color = "#bbb";
      promo.style.color = "#bbb";
      title.textContent = "Добро пожаловать";
      sub.textContent = "Войдите или создайте аккаунт";
      btn.textContent = "Войти";
      setCaption(caption, "Откройте приложение — сразу экран входа");
      cursor.classList.add("is-on");
      moveCursor(cursor, 40, 40);
      await sleep(900);
      if (stopSignal.stopped) break;

      await clickEl(cursor, tabReg, stage);
      tabReg.classList.add("is-active");
      tabLogin.classList.remove("is-active");
      title.textContent = "Регистрация";
      sub.textContent = "Один аккаунт — ПК и телефон";
      btn.textContent = "Создать аккаунт";
      setCaption(caption, "Нажмите «Регистрация»");
      await sleep(700);
      if (stopSignal.stopped) break;

      const pe = centerOf(email, stage);
      moveCursor(cursor, pe.x, pe.y);
      setCaption(caption, "Введите email — на него придёт подтверждение");
      email.style.color = "#000";
      await typeInto(email, "you@mail.ru", 45);
      if (stopSignal.stopped) break;

      const pp = centerOf(pass, stage);
      moveCursor(cursor, pp.x, pp.y);
      setCaption(caption, "Придумайте пароль");
      pass.style.color = "#000";
      await typeInto(pass, "••••••••", 70);
      if (stopSignal.stopped) break;

      const pr = centerOf(promo, stage);
      moveCursor(cursor, pr.x, pr.y);
      setCaption(caption, "Сюда — промокод или реферальный код (можно пусто)");
      promo.style.color = "#000";
      await typeInto(promo, "SILENT30", 50);
      if (stopSignal.stopped) break;

      await clickEl(cursor, btn, stage);
      setCaption(caption, "Готово — откройте письмо и подтвердите email");
      title.textContent = "Проверьте почту";
      sub.textContent = "После подтверждения — доступ к VPN";
      btn.textContent = "Письмо отправлено";
      btn.classList.add("is-dim");
      await sleep(2200);
      btn.classList.remove("is-dim");
      if (stopSignal.stopped) break;
      await sleep(600);
    }
  }

  async function runLogin(stage, stopSignal) {
    const cursor = stage.querySelector(".demo-cursor");
    const caption = stage.querySelector(".demo-caption");
    const email = stage.querySelector("[data-field=email]");
    const pass = stage.querySelector("[data-field=pass]");
    const btn = stage.querySelector("[data-btn=submit]");
    const form = stage.querySelector("[data-form]");
    const main = stage.querySelector("[data-main]");
    const toggle = stage.querySelector("[data-toggle]");
    const status = stage.querySelector("[data-status]");

    while (!stopSignal.stopped) {
      form.hidden = false;
      main.hidden = true;
      toggle.classList.remove("is-on", "is-spinning");
      status.classList.remove("is-on");
      status.textContent = "Отключено";
      email.textContent = "Email";
      pass.textContent = "Пароль";
      email.style.color = "#bbb";
      pass.style.color = "#bbb";
      btn.textContent = "Войти";
      setCaption(caption, "Уже есть аккаунт — вкладка «Вход»");
      cursor.classList.add("is-on");
      await sleep(700);
      if (stopSignal.stopped) break;

      const pe = centerOf(email, stage);
      moveCursor(cursor, pe.x, pe.y);
      setCaption(caption, "Введите email аккаунта");
      email.style.color = "#000";
      await typeInto(email, "you@mail.ru", 40);
      if (stopSignal.stopped) break;

      const pp = centerOf(pass, stage);
      moveCursor(cursor, pp.x, pp.y);
      setCaption(caption, "И пароль");
      pass.style.color = "#000";
      await typeInto(pass, "••••••••", 65);
      if (stopSignal.stopped) break;

      await clickEl(cursor, btn, stage);
      setCaption(caption, "Вход выполнен — открывается главный экран");
      await sleep(500);
      form.hidden = true;
      main.hidden = false;
      await sleep(900);
      if (stopSignal.stopped) break;

      await clickEl(cursor, toggle, stage);
      toggle.classList.add("is-spinning");
      setCaption(caption, "Тумблер включает полный VPN");
      await sleep(900);
      toggle.classList.remove("is-spinning");
      toggle.classList.add("is-on");
      status.classList.add("is-on");
      status.textContent = "Подключено";
      setCaption(caption, "Готово: трафик идёт через защищённый канал");
      await sleep(2400);
      if (stopSignal.stopped) break;
    }
  }

  async function runConnect(stage, stopSignal) {
    const cursor = stage.querySelector(".demo-cursor");
    const caption = stage.querySelector(".demo-caption");
    const toggle = stage.querySelector("[data-toggle]");
    const status = stage.querySelector("[data-status]");
    const hint = stage.querySelector("[data-hint]");

    while (!stopSignal.stopped) {
      toggle.classList.remove("is-on", "is-spinning");
      status.classList.remove("is-on");
      status.textContent = "Отключено";
      if (hint) hint.textContent = "До 3 устройств онлайн";
      setCaption(caption, "На главном экране — один тумблер");
      cursor.classList.add("is-on");
      const p = centerOf(toggle, stage);
      moveCursor(cursor, p.x - 40, p.y + 20);
      await sleep(800);
      if (stopSignal.stopped) break;

      moveCursor(cursor, p.x, p.y);
      setCaption(caption, "Нажмите сюда — VPN включается");
      await sleep(400);
      cursor.classList.add("is-click");
      toggle.classList.add("is-spinning");
      await sleep(250);
      cursor.classList.remove("is-click");
      await sleep(1000);
      toggle.classList.remove("is-spinning");
      toggle.classList.add("is-on");
      status.classList.add("is-on");
      status.textContent = "Подключено";
      if (hint) hint.textContent = "Мессенджеры · браузер · стриминг";
      setCaption(caption, "Статус «Подключено» — можно пользоваться сетью");
      await sleep(2200);
      if (stopSignal.stopped) break;

      setCaption(caption, "Ещё раз — выключить туннель");
      await clickEl(cursor, toggle, stage);
      toggle.classList.remove("is-on");
      status.classList.remove("is-on");
      status.textContent = "Отключено";
      await sleep(1400);
    }
  }

  async function runExclusions(stage, stopSignal) {
    const cursor = stage.querySelector(".demo-cursor");
    const caption = stage.querySelector(".demo-caption");
    const menu = stage.querySelector("[data-menu]");
    const list = stage.querySelector("[data-excl]");
    const items = [...stage.querySelectorAll("[data-app]")];
    const openBtn = stage.querySelector("[data-open-excl]");

    while (!stopSignal.stopped) {
      menu.hidden = false;
      list.hidden = true;
      items.forEach((it) => {
        it.querySelector(".demo-check").classList.remove("is-on");
        it.classList.remove("is-hot");
      });
      openBtn.classList.remove("is-hot");
      setCaption(caption, "Зачем исключения: часть приложений лучше мимо VPN");
      cursor.classList.add("is-on");
      moveCursor(cursor, 48, 60);
      await sleep(1100);
      if (stopSignal.stopped) break;

      openBtn.classList.add("is-hot");
      await clickEl(cursor, openBtn, stage);
      setCaption(caption, "Меню → «Исключения»");
      await sleep(450);
      menu.hidden = true;
      list.hidden = false;
      await sleep(500);
      if (stopSignal.stopped) break;

      setCaption(caption, "Отметьте приложения, которые идут мимо туннеля");
      for (const app of items.slice(0, 2)) {
        if (stopSignal.stopped) break;
        app.classList.add("is-hot");
        await clickEl(cursor, app, stage);
        app.querySelector(".demo-check").classList.add("is-on");
        await sleep(450);
        app.classList.remove("is-hot");
      }
      if (stopSignal.stopped) break;

      setCaption(caption, "Игры / лаунчеры / банк — частый выбор. Остальное — через VPN");
      await sleep(2600);
      if (stopSignal.stopped) break;
      await sleep(400);
    }
  }

  const runners = {
    register: runRegister,
    login: runLogin,
    connect: runConnect,
    exclusions: runExclusions,
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
      const visible = rect.top < window.innerHeight * 0.9 && rect.bottom > 80;
      if (visible) startDemo(stage);
    });
  }

  if ("IntersectionObserver" in window) {
    const demoObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const stage = entry.target;
          const id = stage.getAttribute("data-demo");
          if (entry.isIntersecting && entry.intersectionRatio > 0.35) {
            startDemo(stage);
          } else {
            stopDemo(id);
          }
        });
      },
      { threshold: [0.35, 0.6] }
    );
    document.querySelectorAll(".demo-stage[data-demo]").forEach((s) => demoObs.observe(s));
  }

  /* Boot */
  if ((location.hash || "").replace(/^#/, "") === "guide") {
    homeView.hidden = true;
    guideView.hidden = false;
    startVisibleDemos();
  } else {
    guideView.hidden = true;
    homeView.hidden = false;
  }
})();
