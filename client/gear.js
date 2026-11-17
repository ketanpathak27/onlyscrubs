(function () {
  const grid = document.getElementById("gear-grid");
  if (!grid) return;
  const search = document.getElementById("gear-search");
  const filters = document.getElementById("gear-filters");
  let category = "";
  function apply() {
    const query = (search?.value || "").toLowerCase();
    grid.querySelectorAll("[data-gear]").forEach(function (card) {
      const text = (card.dataset.gear || "").toLowerCase();
      const cat = card.dataset.category || "";
      card.hidden = (category && cat !== category) || (query && !text.includes(query));
    });
    filters?.querySelectorAll("[data-category]").forEach(function (button) {
      const on = (button.dataset.category || "") === category;
      button.classList.toggle("is-active", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  search?.addEventListener("input", apply);
  filters?.addEventListener("click", function (event) {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    category = button.dataset.category || "";
    apply();
  });
})();
