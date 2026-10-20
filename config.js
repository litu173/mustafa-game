// Where the online server lives. When the game is served by the MUSTAFA server itself
// (npm start, or https://mustafa-reborn.onrender.com) the same origin is used automatically.
// Elsewhere (e.g. GitHub Pages) the deployed Render server is used.
window.MUSTAFA_SERVER = window.MUSTAFA_SERVER ||
  (/onrender\.com$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) ? '' : 'https://mustafa-reborn.onrender.com');
