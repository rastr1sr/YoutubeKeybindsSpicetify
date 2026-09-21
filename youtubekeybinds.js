/**
 * YouTube Keybinds for Spicetify
 * Version: 3.0.1
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

  const VOLUME_STEP = 0.05;
  const REPEAT_THROTTLE_MS = 60;
  const TOAST_MS = 1000;
  const INTERACTIVE =
    "input,textarea,select,[contenteditable]:not([contenteditable=false])," +
    "[role=textbox],[role=searchbox],[role=combobox],[role=slider]";

  const clampVol = (v) => Math.min(Math.max(Math.round(v * 100) / 100 || 0, 0), 1);
  const notify = (msg) => Spicetify.showNotification(msg, false, TOAST_MS);

  let tries = 100;
  const poll = setInterval(() => {
    if (window.Spicetify?.Player?.seek && Spicetify.showNotification) {
      clearInterval(poll);
      main();
    } else if (--tries <= 0) {
      clearInterval(poll);
      console.error("[YTKeybinds] Spicetify never became ready, giving up.");
    }
  }, 300);

  function main() {
    const P = Spicetify.Player;
    let lastNonZeroVolume = clampVol(P.getVolume?.()) || 0.5;
    let lastRepeat = 0;

    function seekBy(deltaMs) {
      const dur = P.getDuration();
      if (dur <= 0) return;
      P.seek(Math.min(Math.max(P.getProgress() + deltaMs, 0), dur));
      notify(`${deltaMs < 0 ? "" : "+"}${deltaMs / 1000}s`);
    }

    function seekToFraction(frac) {
      const dur = P.getDuration();
      if (dur <= 0) return;
      P.seek(frac * dur);
      notify(`Jump to ${Math.round(frac * 100)}%`);
    }

    function changeVolume(step) {
      const next = clampVol(clampVol(P.getVolume()) + step);
      if (next > 0) lastNonZeroVolume = next;
      P.setVolume(next);
      notify(`Volume ${Math.round(next * 100)}%`);
    }

    function toggleMute() {
      const cur = clampVol(P.getVolume());
      if (cur > 0) lastNonZeroVolume = cur;
      const next = cur > 0 ? 0 : lastNonZeroVolume || 0.5;
      P.setVolume(next);
      notify(next > 0 ? `Volume ${Math.round(next * 100)}%` : "Muted");
    }

    // combo -> [action, repeatable]
    const binds = {
      __proto__: null,
      arrowleft: [() => seekBy(-5000), true],
      arrowright: [() => seekBy(5000), true],
      j: [() => seekBy(-10000), true],
      l: [() => seekBy(10000), true],
      arrowup: [() => changeVolume(VOLUME_STEP), true],
      arrowdown: [() => changeVolume(-VOLUME_STEP), true],
      m: [toggleMute, false],
      home: [() => seekToFraction(0), false],
      end: [() => seekToFraction(1), false],
      k: [() => {
        const wasPlaying = P.isPlaying();
        P.togglePlay();
        notify(wasPlaying ? "Paused" : "Playing");
      }, false],
      "shift+n": [() => { P.next(); notify("Next track"); }, false],
      "shift+p": [() => { P.back(); notify("Previous track"); }, false],
    };

    // Capture phase: beat Spotify to the key.
    document.addEventListener("keydown", (e) => {
      if (e.defaultPrevented || e.isComposing) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (document.activeElement?.matches(INTERACTIVE)) return;

      const digit = !e.shiftKey && e.key.length === 1 && e.key >= "0" && e.key <= "9";
      const [run, repeatable] = digit
        ? [() => seekToFraction(Number(e.key) / 10), false]
        : binds[(e.shiftKey ? "shift+" : "") + e.key.toLowerCase()] || [];
      if (!run || (e.repeat && !repeatable)) return;
      if (e.repeat && Date.now() - lastRepeat < REPEAT_THROTTLE_MS) return;
      lastRepeat = Date.now();

      e.preventDefault();
      e.stopPropagation();
      try {
        run();
      } catch (err) {
        console.error("[YTKeybinds] action failed", err);
      }
    }, true);

    console.log("[YTKeybinds] loaded");
  }
})();
