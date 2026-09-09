/* ============================================================================
   Portfolio v1 — comportements de la page
   ----------------------------------------------------------------------------
   Quatre morceaux indépendants, dans cet ordre :
     1. Menu       — ouverture/fermeture du menu sur mobile
     2. Thème      — bascule clair / sombre, mémorisée d'une visite à l'autre
     3. Compteur   — nombre d'années de code, recalculé tout seul
     4. Navigation — passage d'une page à l'autre avec la View Transitions API

   Aucune dépendance, aucun outil de build : le fichier est chargé tel quel
   par une balise <script> en fin de <body>.
   ============================================================================ */

/* ============================================================
   1. Menu mobile
   ============================================================ */

/* Le menu est posé par une fonction plutôt qu'en ligne, parce qu'il faut le
   rebrancher après chaque navigation (voir la partie 4 : le <body> est
   remplacé, donc les écouteurs posés dessus disparaissent avec lui). */
function setupMenu() {
  const menuButton = document.querySelector("[data-menu-toggle]");
  const navigation = document.querySelector("[data-nav]");

  if (!menuButton || !navigation) {
    return;
  }

  menuButton.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("is-open");
    // aria-expanded décrit l'état du bouton aux lecteurs d'écran
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  // un clic sur un lien du menu le referme
  navigation.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navigation.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
}

/* ============================================================
   2. Thème clair / sombre
   ============================================================ */

const htmlElement = document.documentElement;

function getTheme() {
  // si le visiteur a déjà choisi un thème avant, on le respecte
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    return savedTheme;
  }
  // sinon sombre par défaut, c'est le thème « natif » du site
  return "dark";
}

function setTheme(theme) {
  // le sombre est le thème de base : il n'a pas d'attribut, c'est le clair
  // qui vient le surcharger via [data-theme="light"] dans styles.css
  if (theme === "light") {
    htmlElement.setAttribute("data-theme", "light");
  } else {
    htmlElement.removeAttribute("data-theme");
  }
  localStorage.setItem("theme", theme);
}

function toggleTheme() {
  const currentTheme = htmlElement.getAttribute("data-theme");
  setTheme(currentTheme === "light" ? "dark" : "light");
}

function setupThemeToggle() {
  const themeToggle = document.querySelector("[data-theme-toggle]");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }
}

/* ============================================================
   3. Compteur d'années de code
   ============================================================ */

/* S'incrémente tout seul à chaque date anniversaire. Pour changer le point de
   départ il n'y a qu'un endroit à modifier : l'attribut data-code-since dans
   index.html. Le texte écrit en dur dans le HTML sert de repli si le script
   ne tourne pas. */
function updateCodeYears() {
  const element = document.querySelector("[data-code-since]");
  if (!element) {
    return;
  }

  const start = new Date(element.dataset.codeSince);
  if (Number.isNaN(start.getTime())) {
    // date invalide : on garde le texte du HTML
    return;
  }

  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();

  // on n'incrémente qu'une fois la date anniversaire passée, pas au 1er janvier
  const anniversaryPassed =
    now.getMonth() > start.getMonth() ||
    (now.getMonth() === start.getMonth() && now.getDate() >= start.getDate());
  if (!anniversaryPassed) {
    years -= 1;
  }

  if (years < 1) {
    return;
  }

  element.textContent = years + (years === 1 ? " an de code" : " ans de code");
}

/* ============================================================
   4. Navigation avec la View Transitions API
   ============================================================ */

function supportsViewTransitions() {
  return "startViewTransition" in document;
}

/* Remplace le contenu de la page au lieu de naviguer normalement, ce qui
   permet au navigateur d'animer le passage d'une page à l'autre. */
function navigateWithTransition(url) {
  if (!supportsViewTransitions()) {
    // repli pour les navigateurs qui ne connaissent pas l'API
    window.location.href = url;
    return;
  }

  document.startViewTransition(async () => {
    // on va chercher la page cible en fetch : le navigateur ne recharge
    // jamais tout le document, sinon la transition serait perdue
    const response = await fetch(url);
    const html = await response.text();

    // on parse la réponse pour en extraire le <body>
    const parser = new DOMParser();
    const newDocument = parser.parseFromString(html, "text/html");

    document.body.innerHTML = newDocument.body.innerHTML;
    document.title = newDocument.title;

    // l'URL change sans rechargement, sinon on perdrait l'effet
    window.history.pushState({}, "", url);

    // le innerHTML a tout écrasé : il faut rebrancher les écouteurs
    initializeScripts();
  });
}

function attachNavigationListeners() {
  // un seul écouteur sur le document, qui intercepte les clics sur les liens
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a");

    const estInterne =
      link &&
      link.href &&
      link.origin === window.location.origin &&
      !link.hasAttribute("target") &&
      !link.hasAttribute("download");

    if (!estInterne) {
      return;
    }

    // une ancre seule (#projects) ou une ancre de la page courante
    // (index.html#projects) garde le comportement natif : le défilement
    // doux est déjà géré par scroll-behavior en CSS
    const href = link.getAttribute("href");
    const url = new URL(link.href);
    const estUneAncre =
      href.startsWith("#") || (url.pathname === window.location.pathname && url.hash);

    if (estUneAncre) {
      return;
    }

    event.preventDefault();
    navigateWithTransition(link.href);
  });
}

/* ============================================================
   Mise en route
   ============================================================ */

/* Rappelée après chaque navigation, puisque le <body> est remplacé.
   La navigation, elle, n'est PAS rebranchée ici : son écouteur est posé sur
   document, que le remplacement du body ne détruit pas. Le réattacher
   doublerait le nombre d'écouteurs à chaque page (1, 2, 4, 8...). */
function initializeScripts() {
  setupMenu();
  setupThemeToggle();
  setTheme(getTheme());
  updateCodeYears();
}

initializeScripts();

if (supportsViewTransitions()) {
  attachNavigationListeners();

  // bouton retour du navigateur
  window.addEventListener("popstate", () => {
    document.startViewTransition(() => {
      window.location.reload();
    });
  });
}
