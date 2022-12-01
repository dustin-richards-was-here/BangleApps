// based on https://www.espruino.com/Bangle.js+App+Settings
(function(back) {
  var FILE = "mtnclock.json";
  // Load settings
  var settings = Object.assign({
    showWidgets: false,
  }, require('Storage').readJSON(FILE, true) || {});

  function writeSettings() {
    require('Storage').writeJSON(FILE, settings);
  }

  // Show the menu
  E.showMenu({
    "" : { "title" : "Mountain Clock" },
    "< Back" : () => back(),
    'Show widgets?': {
      value: !!settings.showWidgets,  // !! converts undefined to false
      format: v => v?"Yes":"No",
      onchange: v => {
        settings.showWidgets = v;
        writeSettings();
      }
    }
  });
})
