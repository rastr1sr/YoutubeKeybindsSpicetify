/**
 * Youtube Keybinds Plugin for Spicetify
 * 
 * This plugin adds keyboard controls for playback, similar to YouTube-style keybinds.
 * Users can jump to specific sections of the currently playing song, seek forward/backward,
 * control volume, and navigate between tracks with keyboard shortcuts.
 * 
 * Keybinds:
 * - 0-9: Jump to a percentage of the song's duration (0 = 0%, 5 = 50%, etc.).
 * - Left Arrow: Seek backwards by 5 seconds.
 * - Right Arrow: Seek forwards by 5 seconds.
 * - J: Seek backwards by 10 seconds.
 * - L: Seek forwards by 10 seconds.
 * - K: Toggle pause/play.
 * - M: Mute/unmute using getMute() and setMute().
 * - Up Arrow: Increase volume by 5%.
 * - Down Arrow: Decrease volume by 5%.
 * - Shift + N: Move to the next song.
 * - Shift + P: Move to the previous song.
 * 
 * Requirements:
 * - Spicetify must be installed and running for this plugin to work.
 * 
 * Author: Rastrisr
 * Version: 1.6.0
 */

(function youtubeKeybinds() {
    let lastVolumeChange = 0;

    document.addEventListener('keydown', function (event) {
        const key = event.key;
        const activeElement = document.activeElement;
        const isShiftPressed = event.shiftKey;

        // Only arrow keys should work if the user is in an input field or textarea
        const isInInputField = (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

        // Get current song duration and player state
        const duration = Spicetify.Player.getDuration();
        const currentPosition = Spicetify.Player.getProgress();

        // Function to handle volume changes
        const handleVolumeChange = (increase) => {
            if (Date.now() - lastVolumeChange > 100) {
                const volumeStep = 0.05;
                const newVolume = increase
                    ? Math.min(Spicetify.Player.getVolume() + volumeStep, 1)
                    : Math.max(Spicetify.Player.getVolume() - volumeStep, 0);
                Spicetify.Player.setVolume(newVolume);
                lastVolumeChange = Date.now();
            }
        };

        // Handle key actions
        switch (key) {
            case 'ArrowLeft':
                // Seek backwards 5 seconds
                Spicetify.Player.seek(Math.max(currentPosition - 5000, 0));
                break;
            case 'ArrowRight':
                // Seek forwards 5 seconds
                Spicetify.Player.seek(Math.min(currentPosition + 5000, duration));
                break;
            case 'ArrowUp':
                handleVolumeChange(true); // Increase volume by 5%
                break;
            case 'ArrowDown':
                handleVolumeChange(false); // Decrease volume by 5%
                break;
            default:
                // Handle other keys only when the user is NOT in an input field
                if (!isInInputField) {
                    switch (key) {
                        case 'j':
                        case 'J':
                            // Seek backwards 10 seconds
                            Spicetify.Player.seek(Math.max(currentPosition - 10000, 0));
                            break;
                        case 'l':
                        case 'L':
                            // Seek forwards 10 seconds
                            Spicetify.Player.seek(Math.min(currentPosition + 10000, duration));
                            break;
                        case 'k':
                        case 'K':
                            // Toggle pause/play
                            Spicetify.Player.isPlaying() ? Spicetify.Player.pause() : Spicetify.Player.play();
                            break;
                        case 'm':
                        case 'M':
                            // Mute/unmute using getMute() and setMute()
                            Spicetify.Player.setMute(!Spicetify.Player.getMute());
                            break;
                        case 'n':
                        case 'N':
                            if (isShiftPressed) {
                                // Move to the next song with Shift + N
                                Spicetify.Player.next();
                            }
                            break;
                        case 'p':
                        case 'P':
                            if (isShiftPressed) {
                                // Move to the previous song with Shift + P
                                Spicetify.Player.back();
                            }
                            break;
                        default:
                            // Handle number keys (0-9) to jump to specific section of the song
                            if (!isNaN(key) && key >= '0' && key <= '9') {
                                const seekPosition = (parseInt(key) / 10) * duration;
                                Spicetify.Player.seek(seekPosition);
                            }
                            break;
                    }
                }
        }
    });
})();
