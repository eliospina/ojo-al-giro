function currentLang() {
  return document.documentElement.lang === "en" ? "en" : "es";
}

function applyLang(lang) {
  const next = lang === "en" ? "en" : "es";
  document.documentElement.lang = next;
  document.querySelectorAll("[data-lang-set]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.langSet === next));
  });
  document.querySelectorAll("option[data-es][data-en]").forEach((option) => {
    option.textContent = option.getAttribute(`data-${next}`);
  });
  const url = new URL(window.location.href);
  if (next === "en") url.searchParams.set("lang", "en");
  else url.searchParams.delete("lang");
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  document.dispatchEvent(new CustomEvent("veeduria:lang"));
}

const start = new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : "es";
applyLang(start);

document.querySelectorAll("[data-lang-set]").forEach((btn) => {
  btn.addEventListener("click", () => applyLang(btn.dataset.langSet));
});
