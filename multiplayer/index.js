(function() {
    'use strict';

    // Ensure multiplayer constants are available globally
    if (typeof CVC_CONSTANTS === 'undefined') {
        console.error('CVC_CONSTANTS not loaded. Make sure constants.js is loaded first.');
        return;
    }

    console.log('[CVC] Cops vs Criminals mode loaded');
    console.log('[CVC] Version 2.0.0 - Enhanced Mechanics Update');
    console.log('[CVC] Total Players:', CVC_CONSTANTS.TOTAL_PLAYERS);
    console.log('[CVC] Total Rounds:', CVC_CONSTANTS.TOTAL_ROUNDS);
    console.log('[CVC] Features: Hostages, Escapes, Arrests, Stealth, Dynamic Objectives');

    // Add multiplayer button to home screen
    function addMultiplayerButton() {
        const homeScreen = document.getElementById('home-screen');
        if (!homeScreen) {
            console.warn('[CVC] Home screen not found, retrying...');
            setTimeout(addMultiplayerButton, 100);
            return;
        }

        const modalContent = homeScreen.querySelector('.modal-content');
        if (!modalContent) return;

        // Check if button already exists
        if (document.getElementById('btn-multiplayer')) return;

        // Find the button container (after existing buttons)
        const existingButtons = modalContent.querySelectorAll('button');
        const lastButton = existingButtons[existingButtons.length - 1];

        // Create multiplayer button
        const mpButton = document.createElement('button');
        mpButton.id = 'btn-multiplayer';
        mpButton.style.cssText = 'font-size: 16px; padding: 15px; margin: 10px; background: linear-gradient(135deg, #0066cc, #cc3300); border: 2px solid #0f0;';
        mpButton.innerHTML = '🎮 COPS VS CRIMINALS<br><span style="font-size: 10px;">10-Player Tactical Multiplayer</span>';

        mpButton.addEventListener('click', () => {
            if (typeof AudioSystem !== 'undefined' && AudioSystem.playClick) {
                AudioSystem.playClick();
            }
            document.getElementById('home-screen').classList.remove('active');
            document.getElementById('multiplayer-screen').classList.add('active');
        });

        // Insert before the last button or at the end
        if (lastButton && lastButton.parentNode === modalContent) {
            modalContent.insertBefore(mpButton, lastButton);
        } else {
            modalContent.appendChild(mpButton);
        }

        console.log('[CVC] Multiplayer button added to home screen');
    }

    // Initialize multiplayer input handling for the main game
    function initMultiplayerInputHandlers() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        // Mouse handling for multiplayer
        canvas.addEventListener('mousedown', (e) => {
            if (window.cvcClient && window.cvcClient.isConnected()) {
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const localPlayer = window.cvcClient.getLocalPlayer();
                if (localPlayer) {
                    const angle = Math.atan2(mouseY - localPlayer.y, mouseX - localPlayer.x);
                    window.cvcClient.sendShoot(angle);
                }
            }
        });

        // Keyboard handling for multiplayer
        document.addEventListener('keydown', (e) => {
            if (!window.cvcClient || !window.cvcClient.isConnected()) return;
            if (window.cvcClient.serverState.state !== CVC_CONSTANTS.STATE.PLAYING) return;

            // Basic actions
            if (e.key === 'r' || e.key === 'R') {
                window.cvcClient.sendReload();
            }
            if (e.key === 'e' || e.key === 'E') {
                window.cvcClient.sendInteract();
            }
            if (e.key === '1') {
                window.cvcClient.sendSwitchWeapon('primary');
            }
            if (e.key === '2') {
                window.cvcClient.sendSwitchWeapon('secondary');
            }

            // Advanced mechanics
            if (e.key === 'f' || e.key === 'F') {
                // Issue command / Take hostage depending on role
                const localPlayer = window.cvcClient.getLocalPlayer();
                if (localPlayer) {
                    if (localPlayer.team === CVC_CONSTANTS.TEAM_COPS) {
                        window.cvcClient.sendCommand('surrender');
                    } else {
                        window.cvcClient.sendTakeHostage();
                    }
                }
            }
            if (e.key === 'g' || e.key === 'G') {
                // Surrender (criminals) / Arrest (cops)
                const localPlayer = window.cvcClient.getLocalPlayer();
                if (localPlayer) {
                    if (localPlayer.team === CVC_CONSTANTS.TEAM_COPS) {
                        window.cvcClient.sendArrest();
                    } else {
                        window.cvcClient.sendSurrender();
                    }
                }
            }
            if (e.key === 'h' || e.key === 'H') {
                // Use escape route (criminals only)
                const localPlayer = window.cvcClient.getLocalPlayer();
                if (localPlayer && localPlayer.team === CVC_CONSTANTS.TEAM_CRIMINALS) {
                    window.cvcClient.sendEscape();
                }
            }
            if (e.key === 'b' || e.key === 'B') {
                // Breach / Barricade door
                const localPlayer = window.cvcClient.getLocalPlayer();
                if (localPlayer) {
                    if (localPlayer.team === CVC_CONSTANTS.TEAM_COPS) {
                        window.cvcClient.sendBreach();
                    } else {
                        window.cvcClient.sendBarricade();
                    }
                }
            }
            if (e.key === 'c' || e.key === 'C') {
                // Toggle crouch for stealth
                window.cvcClient.toggleCrouch();
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            addMultiplayerButton();
            initMultiplayerInputHandlers();
        });
    } else {
        addMultiplayerButton();
        initMultiplayerInputHandlers();
    }

    // Export for external access
    window.CVCMode = {
        VERSION: '2.0.0',
        CONSTANTS: CVC_CONSTANTS,
        LOADOUTS: typeof CVC_LOADOUTS !== 'undefined' ? CVC_LOADOUTS : null,
        TEAM_COLORS: typeof TEAM_COLORS !== 'undefined' ? TEAM_COLORS : null,

        // Feature flags
        FEATURES: {
            HOSTAGE_SYSTEM: true,
            ESCAPE_ROUTES: true,
            ARREST_SYSTEM: true,
            THREAT_SYSTEM: true,
            ENVIRONMENT_INTERACTION: true,
            STEALTH_DETECTION: true,
            DYNAMIC_OBJECTIVES: true
        }
    };

})();