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
  var vt = false;
  try {
    if (sessionStorage.getItem("os-vt") === "1") {
      sessionStorage.removeItem("os-vt");
      vt = true;
    }
  } catch (error) {}
  if (vt) document.documentElement.classList.add("vt-enter");
  try {
    if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches && !vt) {
      document.documentElement.classList.add("motion-ok");
    }
  } catch (error) {}
  try {
    window.addEventListener("pageswap", function (event) {
      if (event.viewTransition) sessionStorage.setItem("os-vt", "1");
    });
    window.addEventListener("pagereveal", function (event) {
      if (event.viewTransition) {
        document.documentElement.classList.add("vt-enter");
        document.documentElement.classList.remove("motion-ok");
      }
    });
  } catch (error) {}
})();
