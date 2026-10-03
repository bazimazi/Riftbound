// One bounded dialog, one collection page. Navigation never depends on scrolling.
const positions = new Map();
const collections =
  ".forge-grid,.codex-grid,.bestiary-grid,.treasure-catalog,.evolution-grid,.legacy-grid,.realm-grid,.compact-guide,.upgrade-grid,.contract-grid,.artifact-draft,.artifact-choice-grid,.talent-tree,.artifact-loadout,.damage-breakdown";
let cleanup = () => {};
export function closePanelDetail(panel) {
  const detail = panel.querySelector(".panel-detail");
  if (!detail) return false;
  const origin = detail._origin;
  detail.remove();
  panel.querySelector(".panel-body").inert = false;
  panel.querySelector(".panel-pager")?.removeAttribute("inert");
  origin?.focus();
  return true;
}
export function layoutPanel(panel) {
  cleanup();
  if (!panel.isConnected || panel.closest("[hidden]")) return;
  const screen = panel.dataset.screen;
  const body = document.createElement("div");
  body.className = "panel-body";
  for (const child of [...panel.children])
    if (!child.matches(".modal-head,.modal-foot")) body.append(child);
  panel.insertBefore(body, panel.querySelector(".modal-foot"));
  // Tab labels remain directly reachable on small screens without a sideways scrollbar.
  for (const nav of body.querySelectorAll(".screen-tabs")) {
    const label = document.createElement("label");
    label.className = "panel-category";
    label.textContent = "Section";
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Choose section");
    for (const button of nav.querySelectorAll("button")) {
      const option = document.createElement("option");
      option.textContent = button.firstChild.textContent;
      option.value = select.options.length;
      option.selected = button.classList.contains("active");
      select.append(option);
    }
    select.onchange = () =>
      nav.querySelectorAll("button")[select.value]?.click();
    label.append(select);
    nav.after(label);
  }
  if (screen === "build") {
    const groups = [[], [], []];
    let index = 0;
    for (const child of [...body.children]) {
      if (child.matches(".build-section-title")) index++;
      groups[Math.min(2, index)].push(child);
    }
    const tabs = document.createElement("nav");
    tabs.className = "section-switch";
    tabs.setAttribute("aria-label", "Build sections");
    const key = "build:section";
    let active = positions.get(key) || 0;
    groups.forEach((group, i) => {
      const button = document.createElement("button");
      button.textContent = ["Stats", "Artifacts", "Damage"][i];
      const choose = () => {
        active = i;
        positions.set(key, i);
        groups.forEach((items, n) =>
          items.forEach((el) => (el.hidden = n !== i)),
        );
        for (const [n, b] of [...tabs.children].entries())
          b.setAttribute("aria-pressed", String(n === i));
        fit();
      };
      button.onclick = choose;
      button.setAttribute("aria-pressed", String(i === active));
      tabs.append(button);
      group.forEach((el) => (el.hidden = i !== active));
    });
    body.prepend(tabs);
  }
  const gridStates = [...body.querySelectorAll(collections)]
    .filter((g) => !g.parentElement.closest(collections))
    .map((grid) => {
      const items = [...grid.children].filter(
        (item) => !item.matches(".research-banner"),
      );
      if (grid.querySelector(":scope > .research-banner"))
        grid.before(grid.querySelector(".research-banner"));
      const active = body.querySelector(".screen-tabs .active");
      const tab = active?.dataset.forgeTab || active?.dataset.codexTab || "";
      const key = screen + ":" + tab + ":" + grid.className;
      return { grid, items, key, index: positions.get(key) || 0, size: 1 };
    });
  const pager = document.createElement("nav");
  pager.className = "panel-pager";
  pager.setAttribute("aria-label", "Collection pages");
  const prev = document.createElement("button"),
    next = document.createElement("button"),
    label = document.createElement("span");
  prev.textContent = "‹";
  next.textContent = "›";
  prev.setAttribute("aria-label", "Previous page");
  next.setAttribute("aria-label", "Next page");
  label.setAttribute("aria-live", "polite");
  pager.append(prev, label, next);
  panel.insertBefore(pager, panel.querySelector(".modal-foot"));
  const visibleState = () =>
    gridStates.find((s) => !s.grid.closest("[hidden]"));
  function apply(s) {
    s.index = Math.max(
      0,
      Math.min(
        Math.floor(s.index / s.size) * s.size,
        Math.max(0, Math.ceil(s.items.length / s.size) - 1) * s.size,
      ),
    );
    s.items.forEach(
      (item, i) => (item.hidden = i < s.index || i >= s.index + s.size),
    );
    s.grid.style.setProperty(
      "--page-columns",
      Math.min(s.size, s.items.length),
    );
    positions.set(s.key, s.index);
  }
  function fit(reset = true) {
    for (const s of gridStates) {
      if (reset)
        s.size = s.grid.matches(".talent-tree")
          ? 1
          : innerWidth <= 680
            ? 1
            : innerWidth <= 1000
              ? 2
              : 3;
      apply(s);
    }
    for (const s of gridStates) {
      if (s.grid.closest("[hidden]")) continue;
      while (body.scrollHeight > body.clientHeight + 2 && s.size > 1) {
        s.size--;
        apply(s);
      }
    }
    const s = visibleState();
    pager.hidden = !s || s.items.length <= s.size;
    if (s) {
      prev.disabled = s.index === 0;
      next.disabled = s.index + s.size >= s.items.length;
      label.textContent = `${Math.floor(s.index / s.size) + 1} / ${Math.ceil(s.items.length / s.size)}`;
    }
  }
  function turn(delta) {
    const s = visibleState();
    if (!s) return;
    s.index += delta * s.size;
    apply(s);
    fit(false);
  }
  prev.onclick = () => turn(-1);
  next.onclick = () => turn(1);
  // Details are a focused overlay, so expanding explanatory text cannot push actions away.
  for (const details of body.querySelectorAll("details")) {
    const summary = details.querySelector(":scope > summary");
    summary?.addEventListener("click", (e) => {
      e.preventDefault();
      closePanelDetail(panel);
      const overlay = document.createElement("section");
      overlay.className = "panel-detail";
      overlay._origin = summary;
      overlay.setAttribute("aria-label", summary.textContent);
      const title = document.createElement("h3");
      title.textContent = summary.textContent;
      const content = document.createElement("div");
      content.className = "detail-copy";
      for (const child of details.children)
        if (child !== summary) content.append(child.cloneNode(true));
      const close = document.createElement("button");
      close.className = "secondary";
      close.textContent = "Back";
      close.onclick = () => closePanelDetail(panel);
      overlay.append(title, content, close);
      panel.append(overlay);
      body.inert = true;
      pager.inert = true;
      close.focus();
    });
  }
  const resize = () => fit();
  window.addEventListener("resize", resize);
  cleanup = () => window.removeEventListener("resize", resize);
  fit();
}
