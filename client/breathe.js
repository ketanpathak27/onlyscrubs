(function () {
  const root = document.querySelector("[data-breathe]");
  if (!root) return;
  const orb = root.querySelector(".orb");
  const phase = root.querySelector("[data-phase]");
  const start = root.querySelector("[data-breathe-start]");
  const stop = root.querySelector("[data-breathe-stop]");
  const phases = ["Breathe in", "Hold", "Breathe out", "Hold"];
  let timer = null;
  let step = 0;
  let left = 4;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function paint() {
    phase.textContent = phases[step] + " · " + left;
  }
  function halt() {
    clearInterval(timer);
    timer = null;
    orb.classList.remove("is-running");
    phase.textContent = "Ready when you are";
    start.disabled = false;
  }
  start.addEventListener("click", function () {
    if (timer) return;
    start.disabled = true;
    step = 0;
    left = 4;
    if (!reduce) orb.classList.add("is-running");
    paint();
    timer = setInterval(function () {
      left -= 1;
      if (left <= 0) {
        step = (step + 1) % phases.length;
        left = 4;
        if (step === 0 && root.dataset.loops) {
          const loops = Number(root.dataset.loops) + 1;
          root.dataset.loops = String(loops);
          if (loops >= 4) { halt(); phase.textContent = "Four rounds done. Stop, or start again."; return; }
        } else if (step === 0) root.dataset.loops = "1";
      }
      paint();
    }, 1000);
  });
  stop.addEventListener("click", halt);
  document.addEventListener("visibilitychange", function () { if (document.hidden) halt(); });
})();
