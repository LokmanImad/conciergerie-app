// Optional local browser QA. Uses an existing Chrome/Chromium installation.
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const base = process.env.SITE_PREVIEW_URL || "http://127.0.0.1:4173";
const menuOnly = process.argv.includes("--menu-only");
const executable =
  process.env.BROWSER_EXECUTABLE ||
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe";
const profile = await mkdtemp(resolve(tmpdir(), "asad-chrome-"));
const child = spawn(
  executable,
  [
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
const pending = new Map();
let socket;
let id = 0;
const errors = [];
async function connect() {
  for (let i = 0; i < 80; i++) {
    try {
      const lines = (
        await readFile(resolve(profile, "DevToolsActivePort"), "utf8")
      )
        .trim()
        .split("\n");
      return `ws://127.0.0.1:${lines[0]}${lines[1].trim()}`;
    } catch {
      await new Promise((done) => setTimeout(done, 100));
    }
  }
  throw new Error("Le navigateur local ne démarre pas.");
}
function command(method, params = {}, sessionId) {
  const requestId = ++id;
  return new Promise((done, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error(`Timeout: ${method}`));
    }, 15000);
    pending.set(requestId, { done, reject, timer });
    socket.send(
      JSON.stringify({
        id: requestId,
        method,
        params,
        ...(sessionId ? { sessionId } : {}),
      }),
    );
  });
}
try {
  socket = new WebSocket(await connect());
  await new Promise((done, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Connexion au navigateur impossible.")),
      10000,
    );
    socket.onopen = () => {
      clearTimeout(timer);
      done();
    };
    socket.onerror = (error) => {
      clearTimeout(timer);
      reject(error);
    };
  });
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    const task = pending.get(message.id);
    if (task) {
      clearTimeout(task.timer);
      pending.delete(message.id);
      message.error
        ? task.reject(new Error(message.error.message))
        : task.done(message.result);
    }
    if (message.method === "Runtime.exceptionThrown")
      errors.push(message.params.exceptionDetails.text);
  };
  const { targetId } = await command("Target.createTarget", {
    url: "about:blank",
  });
  const { sessionId } = await command("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  const send = (method, params) => command(method, params, sessionId);
  await send("Page.enable");
  await send("Runtime.enable");
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails)
      throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  let navigationId = 0;
  async function navigate(path) {
    // A unique query distinguishes a fresh document from the previous page
    // when testing the same pathname at several viewport widths.
    const target = new URL(path, base);
    target.searchParams.set("preview-check", String(++navigationId));
    await send("Page.navigate", { url: target.href });
    for (let i = 0; i < 60; i++) {
      if (
        await evaluate(
          `document.readyState === 'complete' && location.href === ${JSON.stringify(target.href)}`,
        )
      )
        break;
      await new Promise((done) => setTimeout(done, 50));
    }
    await evaluate(`document.fonts.ready.then(()=>true)`);
  }
  async function screenshot(name, width, height, viewportOnly = false) {
    await evaluate(
      `Promise.all([...document.images].map(img=>{img.loading='eager';return img.decode().catch(()=>{})})).then(()=>{document.querySelectorAll('[data-reveal]').forEach(el=>el.classList.add('revealed'));return true})`,
    );
    await new Promise((done) => setTimeout(done, 750));
    const result = await send(
      "Page.captureScreenshot",
      viewportOnly
        ? {
            format: "png",
            captureBeyondViewport: false,
          }
        : {
            format: "png",
            captureBeyondViewport: true,
            clip: { x: 0, y: 0, width, height, scale: 1 },
          },
    );
    await writeFile(resolve(profile, name), Buffer.from(result.data, "base64"));
  }
  async function waitUntil(expression, message) {
    for (let i = 0; i < 60; i++) {
      if (await evaluate(expression)) return;
      await new Promise((done) => setTimeout(done, 30));
    }
    assert.fail(message);
  }
  let checks = 0;
  for (const width of menuOnly ? [] : [360, 390, 768, 1024, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: width < 641,
    });
    for (const path of [
      "/",
      "/contact",
      "/gestion-locative",
      "/sous-location",
      "/achat-investissement",
      "/destinations",
      "/destinations/marrakech",
      "/projets",
      "/a-propos",
    ]) {
      await navigate(path);
      const dimensions = await evaluate(
        `({width:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelectorAll('h1').length})`,
      );
      assert.ok(
        dimensions.scroll <= width + 1,
        `Débordement ${width}px ${path}: ${JSON.stringify(dimensions)}`,
      );
      assert.equal(dimensions.h1, 1);
      checks++;
    }
    console.log(`${width}px : pages contrôlées.`);
  }
  let mobileChecks = 0;
  for (const [width, height] of [[320, 568], [360, 740], [390, 844], [430, 932], [844, 390]]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await navigate("/");
    const layout = await evaluate(`(() => {
      const q = s => document.querySelector(s);
      const r = s => q(s).getBoundingClientRect();
      const card = r('.signature-investment-note-card');
      const text = r('.signature-investment-note-card p');
      return {
        scroll: document.documentElement.scrollWidth,
        headerHeight: r('[data-header]').height,
        headerWidth: q('[data-header]').clientWidth,
        headerScroll: q('[data-header]').scrollWidth,
        phone: q('.header-phone').getAttribute('href'),
        reading: parseFloat(getComputedStyle(q('.signature-philosophy-copy > p:not(.eyebrow)')).fontSize),
        heading: parseFloat(getComputedStyle(q('.signature-investment h2')).fontSize),
        display: getComputedStyle(q('.signature-investment-note-card')).display,
        contained: text.left >= card.left && text.right <= card.right && text.bottom <= card.bottom,
        manifesto: getComputedStyle(q('.signature-manifesto')).display,
        fixed: getComputedStyle(q('[data-contact-widget]')).position,
        bottom: r('[data-contact-toggle]').bottom,
        right: r('[data-contact-toggle]').right,
        footerPadding: parseFloat(getComputedStyle(document.body).paddingBottom)
      };
    })()`);
    assert.ok(layout.scroll <= width + 1, `Débordement mobile ${width}px: ${JSON.stringify(layout)}`);
    assert.ok(layout.headerHeight <= 64 && layout.headerScroll <= layout.headerWidth + 1);
    assert.equal(layout.phone, "tel:+212622625187");
    assert.ok(layout.reading >= 15 && layout.heading <= 46);
    assert.equal(layout.display, "block");
    assert.equal(layout.contained, true);
    assert.equal(layout.manifesto, "none");
    assert.equal(layout.fixed, "fixed");
    assert.ok(layout.bottom <= height - 15 && layout.right <= width && layout.footerPadding >= 90);
    await evaluate(`document.querySelector('.signature-philosophy-copy').scrollIntoView(); true`);
    assert.equal(await evaluate(`document.querySelector('[data-contact-toggle]').getBoundingClientRect().bottom`), layout.bottom);
    if (width === 390) await screenshot("mobile-philosophy.png", width, height, true);
    await evaluate(`document.querySelector('.signature-investment').scrollIntoView(); true`);
    if (width === 390) await screenshot("mobile-investment.png", width, height, true);
    await evaluate(`document.querySelector('[data-contact-toggle]').click()`);
    const panel = await evaluate(`(() => {
      const p = document.querySelector('#contact-options'); const r = p.getBoundingClientRect();
      return { hidden: p.hidden, left: r.left, right: r.right, top: r.top, bottom: r.bottom,
        call: p.querySelector('[data-contact-call]').getAttribute('href'),
        whatsapp: p.querySelector('[data-contact-whatsapp]').getAttribute('href'),
        back: getComputedStyle(document.querySelector('.back-top')).visibility,
        expanded: document.querySelector('[data-contact-toggle]').getAttribute('aria-expanded') };
    })()`);
    assert.equal(panel.hidden, false);
    assert.equal(panel.expanded, "true");
    assert.ok(panel.left >= 0 && panel.right <= width && panel.top >= 64 && panel.bottom <= height);
    assert.equal(panel.call, "tel:+212622625187");
    assert.equal(panel.whatsapp, "https://wa.me/212669834697");
    assert.equal(panel.back, "hidden");
    if (width === 390) await screenshot("mobile-contact-options.png", width, height, true);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    assert.equal(await evaluate(`document.querySelector('#contact-options').hidden && document.activeElement === document.querySelector('[data-contact-toggle]')`), true);
    await evaluate(`document.querySelector('[data-contact-toggle]').click(); document.querySelector('.menu-toggle').click()`);
    assert.equal(await evaluate(`document.querySelector('#contact-options').hidden && !document.querySelector('#site-menu').hidden`), true);
    await evaluate(`document.querySelector('[data-contact-toggle]').click()`);
    assert.equal(await evaluate(`!document.querySelector('#contact-options').hidden && document.querySelector('#site-menu').hidden`), true);
    await evaluate(`document.querySelector('[data-contact-close]').click()`);
    assert.equal(await evaluate(`document.querySelector('#contact-options').hidden`), true);
    await evaluate(`document.querySelector('[data-contact-toggle]').click()`);
    for (const type of ["mousePressed", "mouseReleased"]) {
      await send("Input.dispatchMouseEvent", { type, x: 3, y: 100, button: "left", clickCount: 1 });
    }
    assert.equal(await evaluate(`document.querySelector('#contact-options').hidden`), true);
    await evaluate(`document.querySelector('[data-contact-toggle]').click(); document.querySelector('[data-contact-close]').focus()`);
    for (let tab = 0; tab < 3; tab++) {
      for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    }
    assert.equal(await evaluate(`document.activeElement === document.querySelector('[data-contact-toggle]')`), true);
    await evaluate(`document.querySelector('.header-phone').focus()`);
    assert.equal(await evaluate(`document.querySelector('#contact-options').hidden`), true);
    mobileChecks++;
    console.log(`Mobile ${width}×${height} : disposition et contacts contrôlés.`);
  }
  await send("Emulation.setEmulatedMedia", { features: [] });
  let menuChecks = 0;
  const openerSelector = () =>
    `innerWidth <= 980 ? '.menu-toggle' : '.more-toggle'`;
  const openMenu = async () => {
    await evaluate(`document.querySelector(${openerSelector()}).click()`);
    await waitUntil(
      `!document.querySelector('#site-menu').hidden`,
      "Le menu compact doit s’ouvrir.",
    );
  };
  for (const width of [320, 360, 390, 540, 600, 768, 980, 1024, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: width < 641 ? 760 : 900,
      deviceScaleFactor: 1,
      mobile: width < 641,
    });
    await navigate("/");
    await openMenu();
    const dimensions = await evaluate(`(() => {
      const menu = document.querySelector('#site-menu');
      const header = document.querySelector('[data-header]');
      const rect = menu.getBoundingClientRect();
      const visible = selector => [...document.querySelectorAll(selector)].filter(el => el.getClientRects().length).length;
      return {
        width: menu.clientWidth, scroll: menu.scrollWidth,
        height: rect.height, top: rect.top, bottom: rect.bottom,
        left: rect.left, right: rect.right,
        headerWidth: header.clientWidth, headerScroll: header.scrollWidth,
        expanded: document.querySelector(innerWidth <= 980 ? '.menu-toggle' : '.more-toggle').getAttribute('aria-expanded'),
        locked: document.body.classList.contains('menu-open'),
        desktopLinks: visible('.desktop-nav > a'),
        mobileLinks: visible('.menu-primary > a'),
        images: menu.querySelectorAll('img').length,
        firstLinkFocused: document.activeElement === [...menu.querySelectorAll('a')].find(el => el.getClientRects().length)
      };
    })()`);
    assert.ok(
      dimensions.scroll <= dimensions.width + 1,
      `Débordement du menu ${width}px : ${JSON.stringify(dimensions)}`,
    );
    assert.ok(
      dimensions.headerScroll <= dimensions.headerWidth + 1,
      `Débordement de l’en-tête ${width}px : ${JSON.stringify(dimensions)}`,
    );
    assert.ok(
      dimensions.left >= 0 && dimensions.right <= width,
      `Le menu doit rester dans l’écran (${width}px).`,
    );
    assert.ok(
      dimensions.width <= 340 && dimensions.height < (width < 641 ? 650 : 790),
    );
    assert.equal(dimensions.expanded, "true");
    assert.equal(dimensions.locked, false);
    assert.equal(dimensions.firstLinkFocused, true);
    assert.equal(dimensions.images, 0);
    assert.equal(dimensions.desktopLinks, width > 980 ? 4 : 0);
    assert.equal(dimensions.mobileLinks, width <= 980 ? 4 : 0);
    if (width === 320) await screenshot("menu-narrow.png", width, 760, true);
    if (width === 390) await screenshot("menu-mobile.png", width, 760, true);
    if (width === 1440) await screenshot("menu-desktop.png", width, 900, true);
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await waitUntil(
      `document.querySelector('#site-menu').hidden`,
      "Échap doit fermer le menu.",
    );
    assert.equal(
      await evaluate(
        `document.activeElement === document.querySelector(${openerSelector()})`,
      ),
      true,
      `Focus après Échap (${width}px) : ${await evaluate("document.activeElement.outerHTML.slice(0, 350)")}`,
    );
    menuChecks++;
  }
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await navigate("/");
  await openMenu();
  await evaluate(`document.querySelector('[data-menu-close]').click()`);
  assert.equal(
    await evaluate(`document.querySelector('#site-menu').hidden`),
    true,
  );
  await openMenu();
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: 5,
    y: 700,
    button: "left",
    clickCount: 1,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: 5,
    y: 700,
    button: "left",
    clickCount: 1,
  });
  assert.equal(
    await evaluate(`document.querySelector('#site-menu').hidden`),
    true,
  );
  await openMenu();
  await evaluate(`document.querySelector('.menu-project').focus()`);
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
  });
  await waitUntil(
    `document.querySelector('#site-menu').hidden`,
    "Le menu doit se fermer lorsque le focus le quitte.",
  );
  await openMenu();
  await evaluate(
    `document.querySelector('.menu-secondary a[href="/#application"]').click()`,
  );
  await waitUntil(
    `document.readyState === 'complete' && document.querySelector('#site-menu')?.hidden && location.hash === '#application'`,
    "Le lien Application doit atteindre la rubrique.",
  );
  await openMenu();
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1024,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await waitUntil(
    `document.querySelector('#site-menu').hidden`,
    "Le menu doit se fermer lors du changement de présentation.",
  );
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await openMenu();
  assert.equal(
    await evaluate(
      `getComputedStyle(document.querySelector('#site-menu')).animationName`,
    ),
    "none",
  );
  await evaluate(`document.querySelector('[data-menu-close]').click()`);
  await send("Emulation.setEmulatedMedia", { features: [] });
  await navigate("/");
  await screenshot("mobile.png", 390, 1800);
  await navigate("/contact?sujet=sous-location&ville=Asilah");
  assert.deepEqual(
    await evaluate(
      `({subject:document.querySelector('[name=subject]').value,city:document.querySelector('[name=city]').value})`,
    ),
    { subject: "sous-location", city: "Asilah" },
  );
  await evaluate(
    `document.querySelector('[data-contact-form]').requestSubmit()`,
  );
  assert.ok(
    await evaluate(
      `document.querySelector('[data-form-status]').textContent.includes('Vérifiez')`,
    ),
  );
  await screenshot("contact-mobile.png", 390, 1600);
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await navigate("/");
  await screenshot("header-desktop.png", 1440, 340);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-contact-widget]')).display`), "none");
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.header-phone')).display`), "none");
  const height = await evaluate("document.documentElement.scrollHeight");
  await screenshot("desktop.png", 1440, height);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        checks,
        mobileLayoutsAndContact: mobileChecks,
        menu: "OK",
        menuWidths: menuChecks,
        directLinksAndCompactPanel: "OK",
        menuOutsideClick: "OK",
        menuFocusLeave: "OK",
        menuEscapeAndFocus: "OK",
        menuSamePageAnchor: "OK",
        reducedMotion: "OK",
        formPrefill: "OK",
        formValidation: "OK",
        errors,
        screenshots: profile,
      },
      null,
      2,
    ),
  );
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    try {
      await command("Browser.close");
    } catch {
      /* Browser may close the transport first. */
    }
    socket.close();
  }
  child.kill();
}
