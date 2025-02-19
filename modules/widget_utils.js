/// hide any visible widgets
exports.hide = function() {
  exports.cleanup();
  if (!global.WIDGETS) return;
  g.reset(); // reset colors
  for (var w of global.WIDGETS) {
    if (w._draw) return; // already hidden
    w._draw = w.draw;
    w.draw = () => {};
    w._area = w.area;
    w.area = "";
    if (w.x!=undefined) g.clearRect(w.x,w.y,w.x+w.width-1,w.y+23);
  }
};

/// Show any hidden widgets
exports.show = function() {
  exports.cleanup();
  if (!global.WIDGETS) return;
  for (var w of global.WIDGETS) {
    if (!w._draw) return; // not hidden
    w.draw = w._draw;
    w.area = w._area;
    delete w._draw;
    delete w._area;
    w.draw(w);
  }
};

/// Remove any intervals/handlers/etc that we might have added. Does NOT re-show widgets that were hidden
exports.cleanup = function() {
  delete Bangle.appRect;
  if (exports.swipeHandler) {
    Bangle.removeListener("swipe", exports.swipeHandler);
    delete exports.swipeHandler;
  }
  if (exports.animInterval) {
    clearInterval(exports.animInterval);
    delete exports.animInterval;
  }
  if (exports.hideTimeout) {
    clearTimeout(exports.hideTimeout);
    delete exports.hideTimeout;
  }
  if (exports.origDraw) {
    Bangle.drawWidgets = exports.origDraw;
    delete exports.origDraw;
  }
}

/** Put widgets offscreen, and allow them to be swiped
back onscreen with a downwards swipe. Use .show to undo.
Bangle.js 2 only at the moment. */
exports.swipeOn = function() {
  exports.cleanup();
  if (!global.WIDGETS) return;

  /* TODO: maybe when widgets are offscreen we don't even
  store them in an offscreen buffer? */

  // force app rect to be fullscreen
  Bangle.appRect = { x: 0, y: 0, w: g.getWidth(), h: g.getHeight(), x2: g.getWidth()-1, y2: g.getHeight()-1 };
  // setup offscreen graphics for widgets
  let og = Graphics.createArrayBuffer(g.getWidth(),24,16,{msb:true});
  og.theme = g.theme;
  og._reset = og.reset;
  og.reset = function() {
    return this._reset().setColor(g.theme.fg).setBgColor(g.theme.bg);
  };
  og.reset().clearRect(0,0,og.getWidth(),og.getHeight());
  let _g = g;
  let offset = -24; // where on the screen are we? -24=hidden, 0=full visible

  function queueDraw() {
    Bangle.appRect.y = offset+24;
    Bangle.appRect.h = 1 + Bangle.appRect.y2 - Bangle.appRect.y;
    if (offset>-24) Bangle.setLCDOverlay(og, 0, offset);
    else Bangle.setLCDOverlay();
  }

  for (var w of global.WIDGETS) {
    if (w._draw) return; // already hidden
    w._draw = w.draw;
    w.draw = function() {
      g=og;
      this._draw(this);
      g=_g;
      if (offset>-24) queueDraw();
    };
    w._area = w.area;
    if (w.area.startsWith("b"))
      w.area = "t"+w.area.substr(1);
  }

  exports.origDraw = Bangle.drawWidgets;
  Bangle.drawWidgets = ()=>{
    g=og;
    exports.origDraw();
    g=_g;
  };

  function anim(dir, callback) {
    if (exports.animInterval) clearInterval(exports.interval);
    exports.animInterval = setInterval(function() {
      offset += dir;
      let stop = false;
      if (dir>0 && offset>=0) { // fully down
        stop = true;
        offset = 0;
      } else if (dir<0 && offset<-23) { // fully up
        stop = true;
        offset = -24;
      }
      if (stop) {
        clearInterval(exports.animInterval);
        delete exports.animInterval;
        if (callback) callback();
      }
      queueDraw();
    }, 50);
  }
  // On swipe down, animate to show widgets
  exports.swipeHandler = function(lr,ud) {
    if (exports.hideTimeout) {
      clearTimeout(exports.hideTimeout);
      delete exports.hideTimeout;
    }
    if (ud>0 && offset<0) anim(4, function() {
      exports.hideTimeout = setTimeout(function() {
        anim(-4);
      }, 2000);
    });
    if (ud<0 && offset>-24) anim(-4);

  };
  Bangle.on("swipe", exports.swipeHandler);
};
