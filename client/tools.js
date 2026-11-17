(function () {
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }
  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  const tally = document.querySelector("[data-cpd-tally]");
  if (tally) {
    const target = Number(tally.dataset.target) || 20;
    const key = "onlyscrubs-cpd-hours";
    const list = tally.querySelector("[data-cpd-list]");
    const total = tally.querySelector("[data-cpd-total]");
    const form = tally.querySelector("form");
    function draw() {
      const rows = read(key, []);
      const sum = rows.reduce(function (acc, row) { return acc + Number(row.hours || 0); }, 0);
      total.textContent = sum + " of " + target + " hours on this device";
      list.replaceChildren();
      if (!rows.length) {
        const empty = document.createElement("li");
        empty.textContent = "Nothing logged on this device yet.";
        list.appendChild(empty);
        return;
      }
      rows.forEach(function (row, index) {
        const item = document.createElement("li");
        const name = document.createElement("span");
        name.textContent = row.label;
        const hours = document.createElement("strong");
        hours.textContent = " " + row.hours + " h ";
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.cpdRemove = String(index);
        button.textContent = "Remove";
        item.append(name, hours, button);
        list.appendChild(item);
      });
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const hours = Number(form.hours.value);
      const label = String(form.label.value || "").trim();
      if (!label || !hours || hours <= 0) return;
      const rows = read(key, []);
      rows.push({ label: label.slice(0, 80), hours: hours });
      write(key, rows);
      form.reset();
      draw();
    });
    list.addEventListener("click", function (event) {
      const button = event.target.closest("[data-cpd-remove]");
      if (!button) return;
      const rows = read(key, []);
      rows.splice(Number(button.dataset.cpdRemove), 1);
      write(key, rows);
      draw();
    });
    draw();
  }

  const renewal = document.querySelector("[data-renewal]");
  if (renewal) {
    const month = Number(renewal.dataset.dueMonth) || 5;
    const day = Number(renewal.dataset.dueDay) || 31;
    const out = renewal.querySelector("[data-renewal-count]");
    const now = new Date();
    let year = now.getFullYear();
    const due = new Date(year, month - 1, day);
    if (now > due) due.setFullYear(year + 1);
    const days = Math.ceil((due - now) / 86400000);
    out.textContent = days + " days until 31 May " + due.getFullYear();
  }

  const placement = document.querySelector("[data-placement-calc]");
  if (placement) {
    const rate = Number(placement.dataset.weekly) || 0;
    const form = placement.querySelector("form");
    const out = placement.querySelector("[data-placement-result]");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const weeks = Number(form.weeks.value) || 0;
      const costs = Number(form.costs.value) || 0;
      const payment = Math.round(weeks * rate * 100) / 100;
      const gap = Math.round((costs - payment) * 100) / 100;
      out.textContent = weeks + " weeks at the " + placement.dataset.year + " rate is $" + payment.toFixed(2) + " before tax, if you are eligible. Your costs of $" + costs.toFixed(2) + " leave a gap of $" + gap.toFixed(2) + ". This is a sketch, not an assessment of eligibility.";
    });
  }
})();
