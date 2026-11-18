(function () {
  try {
    var query = new URLSearchParams(location.search).get("theme");
    var saved = localStorage.getItem("onlyscrubs-theme");
    var theme = query === "dark" || query === "light" ? query : saved === "dark" || saved === "light" ? saved : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.dataset.theme = "light";
  }
  try {
    if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("motion-ok");
    }
  } catch (error) {}
})();
