/**
 * YouTube Keybinds for Spicetify
 * Version: 3.0.0
 * Author: Rastrisr
 *
 *   Left/Right   seek -5s / +5s (hold to repeat)
 *   Up/Down      volume +5% / -5% (hold to repeat)
 *   J / L        seek -10s / +10s (hold to repeat)
 *   K            play / pause
 *   M            mute / unmute
 *   0 - 9        jump to 0% - 90%
 *   Home / End   jump to start / end
 *   Shift+N / Shift+P   next / previous track
 */

(function () {
  "use strict";

  (function bootstrap(retriesLeft) {
    const ready =
      window.Spicetify &&
      Spicetify.Player &&
      typeof Spicetify.Player.seek === "function" &&
      typeof Spicetify.Player.getDuration === "function" &&
      typeof Spicetify.showNotification === "function";

    if (!ready) {
      if (retriesLeft <= 0) {
        console.error("[YTKeybinds] Spicetify never became ready, giving up.");
        return;
      }
      setTimeout(() => bootstrap(retriesLeft - 1), 300);
      return;
    }
    if (window.__youtubeKeybindsLoaded) return;
    window.__youtubeKeybindsLoaded = true;
    main();
  })(100);

  function main() {
    const VERSION = "3.0.0";

    const SEEK_SMALL_MS = 5000;
    const SEEK_BIG_MS = 10000;
    const VOLUME_STEP = 0.05;
    const VOLUME_THROTTLE_MS = 60;
    const TOAST_MS = 1000;

    // Combo string is an optional "shift+" prefix plus event.key, lower-cased.
    // Digits 0-9 are handled separately.
    const keyMap = {
      seekBackSmall: "arrowleft",
      seekForwardSmall: "arrowright",
      volumeUp: "arrowup",
      volumeDown: "arrowdown",
      seekBackBig: "j",
      seekForwardBig: "l",
      togglePlay: "k",
      toggleMute: "m",
      nextTrack: "shift+n",
      prevTrack: "shift+p",
      seekStart: "home",
      seekEnd: "end",
    };

    function safe(fn, fallback) {
      try {
        const v = fn();
        return v == null ? fallback : v;
      } catch (err) {
        console.error("[YTKeybinds] action failed", err);
        return fallback;
      }
    }

    function clampVolume(v) {
      if (typeof v !== "number" || Number.isNaN(v)) return 0;
      v = Math.round(v * 100) / 100;
      if (v < 0.001) return 0;
      if (v > 1) return 1;
      return v;
    }

    let lastNonZeroVolume =
      clampVolume(safe(() => Spicetify.Player.getVolume(), 0.5)) || 0.5;
    let lastVolChange = 0;

    let lastToast = { msg: "", at: 0 };
    function notify(msg) {
      const now = Date.now();
      if (msg === lastToast.msg && now - lastToast.at < 250) return;
      lastToast = { msg, at: now };
      safe(() => Spicetify.showNotification(msg, false, TOAST_MS));
    }

    const duration = () => safe(() => Spicetify.Player.getDuration(), 0) || 0;
    const progress = () => safe(() => Spicetify.Player.getProgress(), 0) || 0;

    function seekBy(deltaMs) {
      const dur = duration();
      if (dur <= 0) return;
      const target = Math.min(Math.max(progress() + deltaMs, 0), dur);
      safe(() => Spicetify.Player.seek(target));
      notify(`${deltaMs < 0 ? "" : "+"}${deltaMs / 1000}s`);
    }

    function seekToFraction(frac) {
      const dur = duration();
      if (dur <= 0) return;
      frac = Math.min(Math.max(frac, 0), 1);
      safe(() => Spicetify.Player.seek(frac * dur));
      notify(`Jump to ${Math.round(frac * 100)}%`);
    }

    function changeVolume(increase) {
      const now = Date.now();
      if (now - lastVolChange < VOLUME_THROTTLE_MS) return;
      lastVolChange = now;

      const cur = clampVolume(
        safe(() => Spicetify.Player.getVolume(), lastNonZeroVolume)
      );
      const next = clampVolume(increase ? cur + VOLUME_STEP : cur - VOLUME_STEP);
      if (next > 0) lastNonZeroVolume = next;
      safe(() => Spicetify.Player.setVolume(next));
      notify(`Volume ${Math.round(next * 100)}%`);
    }

    function toggleMute() {
      const cur = clampVolume(safe(() => Spicetify.Player.getVolume(), 0));
      if (cur > 0) {
        lastNonZeroVolume = cur;
        safe(() => Spicetify.Player.setVolume(0));
        notify("Muted");
      } else {
        const restore = lastNonZeroVolume || 0.5;
        safe(() => Spicetify.Player.setVolume(restore));
        notify(`Volume ${Math.round(restore * 100)}%`);
      }
    }

    function togglePlay() {
      const wasPlaying = safe(() => Spicetify.Player.isPlaying(), false);
      safe(() => Spicetify.Player.togglePlay());
      notify(wasPlaying ? "Paused" : "Playing");
    }

    function nextTrack() {
      safe(() => Spicetify.Player.next());
      notify("Next track");
    }

    function prevTrack() {
      safe(() => Spicetify.Player.back());
      notify("Previous track");
    }

    const actions = {
      seekBackSmall: { run: () => seekBy(-SEEK_SMALL_MS), repeatable: true },
      seekForwardSmall: { run: () => seekBy(SEEK_SMALL_MS), repeatable: true },
      seekBackBig: { run: () => seekBy(-SEEK_BIG_MS), repeatable: true },
      seekForwardBig: { run: () => seekBy(SEEK_BIG_MS), repeatable: true },
      volumeUp: { run: () => changeVolume(true), repeatable: true },
      volumeDown: { run: () => changeVolume(false), repeatable: true },
      togglePlay: { run: togglePlay, repeatable: false },
      toggleMute: { run: toggleMute, repeatable: false },
      nextTrack: { run: nextTrack, repeatable: false },
      prevTrack: { run: prevTrack, repeatable: false },
      seekStart: { run: () => seekToFraction(0), repeatable: false },
      seekEnd: { run: () => seekToFraction(1), repeatable: false },
    };

    const lookup = new Map();
    for (const [action, combos] of Object.entries(keyMap)) {
      for (const combo of Array.isArray(combos) ? combos : [combos]) {
        lookup.set(combo, action);
      }
    }

    function isInteractiveTarget() {
      const el = document.activeElement;
      if (!el || el === document.body) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      const role = el.getAttribute && el.getAttribute("role");
      return (
        role === "textbox" ||
        role === "searchbox" ||
        role === "combobox" ||
        role === "slider"
      );
    }

    function comboFor(e) {
      return (e.shiftKey ? "shift+" : "") + e.key.toLowerCase();
    }

    function onKeyDown(e) {
      if (e.defaultPrevented || e.isComposing) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (isInteractiveTarget()) return;

      if (!e.shiftKey && e.key.length === 1 && e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        e.stopPropagation();
        seekToFraction(Number(e.key) / 10);
        return;
      }

      const actionName = lookup.get(comboFor(e));
      if (!actionName) return;

      const { run, repeatable } = actions[actionName];
      if (e.repeat && !repeatable) return;

      e.preventDefault();
      e.stopPropagation();
      run();
    }

    // Capture phase so we beat Spotify's own handlers to the key.
    document.addEventListener("keydown", onKeyDown, true);
    console.log(`[YTKeybinds] loaded v${VERSION}`);
  }
})();
