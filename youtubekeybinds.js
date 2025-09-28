/**
 * Youtube Keybinds Extension for Spicetify
 * Version: 2.0.0
 * Author: Rastrisr
 *
 * Features:
 * - YouTube-style playback shortcuts for Spotify.
 * - Arrow keys, J/K/L, M, numbers 0–9, Shift+N/P.
 * - Fixed: Arrow keys no longer override cursor movement in input fields.
 *
 * Usage:
 * Place in your Spicetify Extensions folder and enable via:
 *   spicetify config extensions youtubeKeybinds.js
 *   spicetify apply
 */

(function youtubeKeybinds() {
  // Wait until Spicetify APIs are available
  if (!window.Spicetify || !Spicetify.Player || !Spicetify.Keyboard) {
    console.warn("YTKeybinds: Spicetify not ready, retrying...");
    setTimeout(youtubeKeybinds, 1000);
    return;
  }

  console.log("YTKeybinds: Loaded (v2.0.0)");

  // --- KeyMap: configurable key definitions ---
  // Each entry corresponds to a specific action.
  // Keys follow Spicetify.Keyboard format: { key: "letter", shift: true }
  const keyMap = {
    seekBackSmall: { key: "left" },              // ← back 5s
    seekForwardSmall: { key: "right" },          // → forward 5s
    volumeUp: { key: "up" },                     // ↑ volume +5%
    volumeDown: { key: "down" },                 // ↓ volume -5%
    seekBackBig: { key: "j" },                   // J back 10s
    seekForwardBig: { key: "l" },                // L forward 10s
    togglePlay: { key: "k" },                    // K play/pause
    toggleMute: { key: "m" },                    // M mute/unmute
    nextTrack: { key: "n", shift: true },        // Shift+N next track
    prevTrack: { key: "p", shift: true },        // Shift+P previous track
    jump0: { key: "0" }, jump1: { key: "1" },    // 0–9 jump by %
    jump2: { key: "2" }, jump3: { key: "3" },
    jump4: { key: "4" }, jump5: { key: "5" },
    jump6: { key: "6" }, jump7: { key: "7" },
    jump8: { key: "8" }, jump9: { key: "9" },
  };

  // --- Constants controlling behavior ---
  const SEEK_SMALL_MS = 5000;   // Left/Right Arrow
  const SEEK_BIG_MS = 10000;    // J / L
  const VOLUME_STEP = 0.05;     // Volume step (5%)
  const VOLUME_THROTTLE_MS = 100; // Prevents rapid volume spamming

  let lastVolChange = 0;

  // --- Utility functions ---

  // Get playback state (duration & progress)
  function getState() {
    return {
      duration: Spicetify.Player.getDuration() || 0,
      progress: Spicetify.Player.getProgress() || 0,
    };
  }

  // Adjust volume with throttling & show notification
  function changeVolume(increase) {
    const now = Date.now();
    if (now - lastVolChange < VOLUME_THROTTLE_MS) return;
    lastVolChange = now;

    const cur = Spicetify.Player.getVolume();
    const next = increase
      ? Math.min(cur + VOLUME_STEP, 1)
      : Math.max(cur - VOLUME_STEP, 0);
    Spicetify.Player.setVolume(next);

    Spicetify.showNotification(`Volume: ${(next * 100).toFixed(0)}%`);
  }

  // Toggle mute with safe fallback
  function toggleMuteSafe() {
    if (typeof Spicetify.Player.toggleMute === "function") {
      Spicetify.Player.toggleMute();
      Spicetify.showNotification("Mute toggled");
    } else {
      const cur = Spicetify.Player.getVolume();
      if (cur > 0) {
        Spicetify.Player.setVolume(0);
        Spicetify.showNotification("Muted");
      } else {
        Spicetify.Player.setVolume(0.5);
        Spicetify.showNotification("Unmuted (50%)");
      }
    }
  }

  // Detect if the user is typing (input/textarea/contentEditable)
  function isTypingContext() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
  }

  // Register a keybind with safety checks
  function register(name, def, handler, { allowWhileTyping = false } = {}) {
    try {
      Spicetify.Keyboard.registerShortcut(def, (event) => {
        // Block if typing unless explicitly allowed
        if (!allowWhileTyping && isTypingContext()) return;
        // Ignore Ctrl, Alt, Meta to avoid conflicts
        if (event.ctrlKey || event.altKey || event.metaKey) return;

        handler(event);
        event.preventDefault();
      });
    } catch (err) {
      console.error(`YTKeybinds: Failed registering ${name}`, err);
    }
  }

  // --- Register Actions ---

  // Arrow keys: 5s seek
  register("seekBackSmall", keyMap.seekBackSmall, () => {
    const { progress } = getState();
    Spicetify.Player.seek(Math.max(progress - SEEK_SMALL_MS, 0));
    Spicetify.showNotification("⏪ -5s");
  });

  register("seekForwardSmall", keyMap.seekForwardSmall, () => {
    const { progress, duration } = getState();
    Spicetify.Player.seek(Math.min(progress + SEEK_SMALL_MS, duration));
    Spicetify.showNotification("⏩ +5s");
  });

  // Volume up/down
  register("volumeUp", keyMap.volumeUp, () => changeVolume(true));
  register("volumeDown", keyMap.volumeDown, () => changeVolume(false));

  // J / L: 10s seek
  register("seekBackBig", keyMap.seekBackBig, () => {
    const { progress } = getState();
    Spicetify.Player.seek(Math.max(progress - SEEK_BIG_MS, 0));
    Spicetify.showNotification("⏪ -10s");
  });

  register("seekForwardBig", keyMap.seekForwardBig, () => {
    const { progress, duration } = getState();
    Spicetify.Player.seek(Math.min(progress + SEEK_BIG_MS, duration));
    Spicetify.showNotification("⏩ +10s");
  });

  // K: toggle play/pause
  register("togglePlay", keyMap.togglePlay, () => {
    Spicetify.Player.togglePlay();
    const isPlaying = Spicetify.Player.isPlaying();
    Spicetify.showNotification(isPlaying ? "▶ Playing" : "⏸ Paused");
  });

  // M: toggle mute
  register("toggleMute", keyMap.toggleMute, () => {
    toggleMuteSafe();
  });

  // Shift+N / Shift+P: next/prev track
  register("nextTrack", keyMap.nextTrack, () => {
    Spicetify.Player.next();
    Spicetify.showNotification("⏭ Next Track");
  });

  register("prevTrack", keyMap.prevTrack, () => {
    Spicetify.Player.back();
    Spicetify.showNotification("⏮ Previous Track");
  });

  // Number keys 0–9: jump to % of track
  for (let d = 0; d <= 9; d++) {
    register(`jump${d}`, keyMap[`jump${d}`], () => {
      const { duration } = getState();
      if (duration > 0) {
        Spicetify.Player.seek((d / 10) * duration);
        Spicetify.showNotification(`Jump to ${d * 10}%`);
      }
    });
  }
})();
