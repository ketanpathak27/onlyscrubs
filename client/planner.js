(function () {
  const form = document.querySelector("[data-planner]");
  if (!form || typeof planShift !== "function") return;
  const output = document.getElementById("planner-output");
  const presets = {
    early: ["07:00", "15:30"],
    late: ["13:30", "22:00"],
    night: ["21:00", "07:30"]
  };
  const saved = JSON.parse(localStorage.getItem("onlyscrubs-planner") || "null");
  if (saved) {
    form.shift.value = saved.shift || "early";
    form.start.value = saved.start || "07:00";
    form.end.value = saved.end || "15:30";
    form.sleep.value = saved.sleep || "7";
    form.buffer.value = saved.buffer || "75";
  }
  form.shift.addEventListener("change", function () {
    const preset = presets[form.shift.value];
    if (preset) {
      form.start.value = preset[0];
      form.end.value = preset[1];
    }
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const input = {
      start: form.start.value,
      end: form.end.value,
      sleepHours: Number(form.sleep.value),
      bufferMinutes: Number(form.buffer.value)
    };
    localStorage.setItem("onlyscrubs-planner", JSON.stringify({
      shift: form.shift.value,
      start: input.start,
      end: input.end,
      sleep: form.sleep.value,
      buffer: form.buffer.value
    }));
    const plan = planShift(input);
    if (plan.error) {
      output.innerHTML = '<p class="form-message">' + plan.error + '</p>';
      return;
    }
    const nap = plan.nap ? '<div class="stat"><span>Optional nap before the next shift</span><strong>' + plan.napLabel + '</strong></div>' : "";
    output.innerHTML = '<div class="planner-result"><div class="stat"><span>Suggested sleep</span><strong>' + plan.sleepLabel + '</strong></div>' + nap + '<div class="stat"><span>Caffeine cutoff</span><strong>' + plan.caffeineLabel + '</strong><p>A common sleep-hygiene rule of thumb is to stop caffeine about six hours before you plan to sleep. People differ. If you have been told to limit caffeine, follow that advice.</p></div><p>' + plan.note + '</p><p><strong>If you are drowsy, do not drive.</strong> Tell the person in charge and use your workplace fatigue process.</p></div>';
  });
})();
