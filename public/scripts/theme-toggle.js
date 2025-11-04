const themeToggle = document.getElementById("theme-toggle");
const body = document.body;

const applyTheme = (theme) => {
  if (theme === "dark") {
    body.classList.add("dark-theme");
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    body.classList.remove("dark-theme");
    document.documentElement.setAttribute("data-theme", "light");
  }
};

const initTheme = () => {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme) {
    applyTheme(savedTheme);
  } else if (prefersDark) {
    applyTheme("dark");
  } else {
    applyTheme("light");
  }
};

const toggleTheme = () => {
  const currentThemeIsDark = body.classList.contains("dark-theme");
  const newTheme = currentThemeIsDark ? "light" : "dark";
  applyTheme(newTheme);
  localStorage.setItem("theme", newTheme);
};

if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!localStorage.getItem("theme")) {
    applyTheme(e.matches ? "dark" : "light");
  }
});

initTheme();