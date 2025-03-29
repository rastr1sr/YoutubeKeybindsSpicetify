/**
 * Youtube Keybinds Plugin for Spicetify
 * Version: 1.7.0
 * Author: Rastrisr (Original), Refactored by AI Assistant
 * Description: Adds YouTube-style keyboard controls for playback. Jump, seek, volume, mute, and track navigation.
 *
 * Keybinds:
 * - 0-9: Jump to % of song duration (0=0%, 5=50%, etc.).
 * - Left Arrow: Seek backwards 5 seconds.
 * - Right Arrow: Seek forwards 5 seconds.
 * - J: Seek backwards 10 seconds.
 * - L: Seek forwards 10 seconds.
 * - K: Toggle play/pause.
 * - M: Toggle mute/unmute.
 * - Up Arrow: Increase volume by 5%.
 * - Down Arrow: Decrease volume by 5%.
 * - Shift + N: Next song.
 * - Shift + P: Previous song.
 *
 * Note: Keybinds like J, L, K, M, 0-9, Shift+N/P are disabled when typing in input fields or text areas.
 *       Arrow keys for seeking/volume work everywhere.
 */
(function youtubeKeybinds() {
    // Check if Spicetify and its Player API are available
    if (!Spicetify || !Spicetify.Player) {
        console.error("YTKeybinds: Spicetify or Spicetify.Player not available. Retrying in 1s.");
        setTimeout(youtubeKeybinds, 1000);
        return;
    }
    console.log("YTKeybinds: Plugin loaded.");

    // --- Configuration Constants ---
    const SEEK_TIME_ARROW_MS = 5000;    // 5 seconds in milliseconds
    const SEEK_TIME_JL_MS = 10000;      // 10 seconds in milliseconds
    const VOLUME_STEP = 0.05;           // 5% volume change
    const VOLUME_THROTTLE_MS = 100;     // Prevent rapid volume changes (ms)

    let lastVolumeChangeTimestamp = 0;

    // --- Helper Functions ---

    /** Safely gets player state, returning defaults if unavailable */
    const getPlayerState = () => {
        const duration = Spicetify.Player.getDuration() || 0;
        const progress = Spicetify.Player.getProgress() || 0;
        return { duration, progress };
    };

    /** Handles volume changes with throttling */
    const handleVolumeChange = (increase) => {
        const now = Date.now();
        if (now - lastVolumeChangeTimestamp > VOLUME_THROTTLE_MS) {
            const currentVolume = Spicetify.Player.getVolume();
            const newVolume = increase
                ? Math.min(currentVolume + VOLUME_STEP, 1)
                : Math.max(currentVolume - VOLUME_STEP, 0);
            Spicetify.Player.setVolume(newVolume);
            lastVolumeChangeTimestamp = now;
        }
    };

    // --- Event Listener ---
    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase(); // Normalize key to lowercase
        const activeElement = document.activeElement;

        // Check if the user is currently typing in an input, textarea, or contentEditable element
        const isTyping = activeElement &&
            (activeElement.tagName === 'INPUT' ||
             activeElement.tagName === 'TEXTAREA' ||
             activeElement.isContentEditable);

        // Ignore keybinds if modifier keys (Ctrl, Alt, Meta) are pressed,
        // except for Shift which is used for N/P.
        // Also ignore if a Spicetify popup/modal is open.
        if ((event.ctrlKey || event.metaKey || event.altKey) || Spicetify?.PopupModal?.isOpen?.()) {
            return;
        }

        let playerState; // Lazily get player state only when needed
        let handled = true; // Assume the keypress will be handled

        // --- Handle Keys Allowed Everywhere ---
        switch (key) {
            case 'arrowleft':
                playerState = getPlayerState();
                Spicetify.Player.seek(Math.max(playerState.progress - SEEK_TIME_ARROW_MS, 0));
                break;
            case 'arrowright':
                playerState = getPlayerState();
                Spicetify.Player.seek(Math.min(playerState.progress + SEEK_TIME_ARROW_MS, playerState.duration));
                break;
            case 'arrowup':
                handleVolumeChange(true);
                break;
            case 'arrowdown':
                handleVolumeChange(false);
                break;

            // --- Handle Keys Disabled During Typing ---
            default:
                if (isTyping) {
                    handled = false; // Don't handle other keys if typing
                    break;
                }

                // Process keys only if not typing
                switch(key) {
                    case 'j':
                        playerState = getPlayerState();
                        Spicetify.Player.seek(Math.max(playerState.progress - SEEK_TIME_JL_MS, 0));
                        break;
                    case 'l':
                        playerState = getPlayerState();
                        Spicetify.Player.seek(Math.min(playerState.progress + SEEK_TIME_JL_MS, playerState.duration));
                        break;
                    case 'k':
                        Spicetify.Player.togglePlay();
                        break;
                    case 'm':
                        Spicetify.Player.toggleMute();
                        break;
                    case 'n': // Requires Shift
                        if (event.shiftKey) {
                            Spicetify.Player.next();
                        } else {
                            handled = false; // 'n' alone is not handled
                        }
                        break;
                    case 'p': // Requires Shift
                        if (event.shiftKey) {
                            Spicetify.Player.back();
                        } else {
                            handled = false; // 'p' alone is not handled
                        }
                        break;
                    default:
                        // Handle number keys (0-9) for seeking
                        if (/^[0-9]$/.test(key)) {
                            playerState = getPlayerState();
                            if (playerState.duration > 0) {
                                const seekPercent = parseInt(key) / 10;
                                Spicetify.Player.seek(seekPercent * playerState.duration);
                            } else {
                                handled = false; // Cannot seek if duration is 0
                            }
                        } else {
                            handled = false; // Key is not recognized by this plugin
                        }
                        break;
                }
        }

        // Prevent default browser action (e.g., scrolling, typing numbers)
        // only if the keybind was successfully handled by this plugin.
        if (handled) {
            event.preventDefault();
        }
    });

})(); // End of IIFE
