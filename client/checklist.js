(function () {
  const form = document.getElementById("placement-checklist");
  if (!form) return;
  const key = "onlyscrubs-checklist-v1";
  const boxes = Array.from(form.querySelectorAll("[data-check]"));
  const progress = document.getElementById("check-progress");
  function saved() {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (error) { return {}; }
  }
  function update() {
    const done = boxes.filter(function (box) { return box.checked; }).length;
    progress.textContent = done + " of " + boxes.length + " packed";
  }
  const state = saved();
  boxes.forEach(function (box) { box.checked = Boolean(state[box.id]); });
  update();
  form.addEventListener("change", function () {
    const next = {};
    boxes.forEach(function (box) { next[box.id] = box.checked; });
    localStorage.setItem(key, JSON.stringify(next));
    update();
  });
  document.getElementById("check-reset")?.addEventListener("click", function () {
    localStorage.removeItem(key);
    boxes.forEach(function (box) { box.checked = false; });
    update();
  });
  document.getElementById("check-print")?.addEventListener("click", function () { window.print(); });
})();
