import { StateGenerator } from './core/StateGenerator.js';
import { getRandomStates, claimState, getClaimStats, getClaimedStateIds } from './services/supabase.js';

// Global state
let availableStates = [];
let selectedState = null;
let claimedStateIds = new Set();
let justClaimedStateId = null;

function renderStateBoard(state) {
    // Create ASCII board
    const board = [
        ['   ', '   ', '   '],
        ['   ', '   ', '   '],
        ['   ', '   ', '   '],
    ];

    for (let j = 0; j < state.config.length; j++) {
        const row = Math.floor(j / 3);
        const col = j % 3;
        if (state.config[j] === 1) board[row][col] = ' x ';
        else if (state.config[j] === 2) board[row][col] = ' o ';
    }

    // Build winning set for quick lookup
    const winningPositions = new Set();
    if (state.winning_lines || state.winningLines) {
        const lines = state.winning_lines || state.winningLines;
        lines.forEach(line => {
            line.forEach(pos => winningPositions.add(pos));
        });
    }

    // Build HTML string
    let html = '';
    for (let row = 0; row < 3; row++) {
        if (row > 0) {
            html += '<span class="grid">---+---+---</span><br>';
        }

        for (let col = 0; col < 3; col++) {
            if (col > 0) {
                html += '<span class="grid">|</span>';
            }

            const pos = row * 3 + col;
            const char = board[row][col];
            const isWinning = winningPositions.has(pos) ? ' mark-winning' : '';
            html += `<span class="mark-${char.trim().toLowerCase()}${isWinning}">${char}</span>`;
        }
        html += '<br>';
    }

    return html;
}

function renderStateElement(state) {
    const stateElement = document.createElement("div");
    stateElement.className = "state";
    stateElement.classList.add('turn-' + (state.turn_count || state.turnCount));
    stateElement.classList.add((state.is_terminal || state.isTerminal) ? 'state-terminal' : 'state-nonterminal');
    (state.has_winner || state.hasWinner) ? stateElement.classList.add('state-winner') : stateElement.classList.add('state-nowinner');

    // Store state ID for later reference
    const stateId = state.id || state.canonical_id;
    stateElement.dataset.stateId = stateId;

    // Add claimed/unclaimed class
    if (claimedStateIds.has(stateId)) {
        stateElement.classList.add('claimed');
    } else {
        stateElement.classList.add('unclaimed');
    }

    stateElement.innerHTML = renderStateBoard(state);
    return stateElement;
}

async function loadStats() {
    try {
        const stats = await getClaimStats();
        const statsText = document.getElementById('stats-text');
        if (statsText && stats) {
            statsText.textContent = `${stats.available_states} de ${stats.total_states} estados disponibles`;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadClaimedStates() {
    try {
        claimedStateIds = await getClaimedStateIds();

        // Update all state elements with claimed/unclaimed classes
        const stateElements = document.querySelectorAll('.state');
        stateElements.forEach(element => {
            // Get state ID from the element's classes or data attributes
            // The state ID should match what we generated
            const stateId = element.dataset.stateId;
            if (stateId && claimedStateIds.has(stateId)) {
                element.classList.remove('unclaimed');
                element.classList.add('claimed');
            }
        });
    } catch (error) {
        console.error('Error loading claimed states:', error);
    }
}

async function openClaimModal() {
    const modal = document.getElementById('claim-modal');
    modal.classList.add('active');

    // Reset to selection step
    showStep('step-selection');

    // Hide shuffling placeholder, show state options grid
    document.getElementById('shuffling').style.display = 'none';
    document.getElementById('state-options').style.display = 'grid';

    try {
        // Fetch many states for the slot machine effect
        const allAvailableStates = await getRandomStates();

        // Fetch additional states for cycling animation
        const extraStates = await getRandomStates();
        const cycleStates = [...allAvailableStates, ...extraStates];

        // Start slot machine animation
        await slotMachineAnimation(cycleStates, allAvailableStates);

    } catch (error) {
        console.error('Error fetching states:', error);
        showError('No se pudieron cargar los estados disponibles. Intenta de nuevo.');
    }
}

async function slotMachineAnimation(cycleStates, finalStates) {
    const container = document.getElementById('state-options');
    container.innerHTML = '';

    // Create 3 slot boxes
    const slots = [];
    for (let i = 0; i < 3; i++) {
        const slot = document.createElement('div');
        slot.className = 'state-option spinning';
        slot.dataset.slotIndex = i;
        container.appendChild(slot);
        slots.push(slot);
    }

    // Cycling intervals for each slot
    const intervals = [];
    const cycleSpeed = 100; // ms between each state change

    // Start cycling all 3 slots
    for (let i = 0; i < 3; i++) {
        let cycleIndex = 0;
        intervals[i] = setInterval(() => {
            const state = cycleStates[cycleIndex % cycleStates.length];
            updateSlotContent(slots[i], state);
            cycleIndex++;
        }, cycleSpeed);
    }

    // Stop each slot one by one
    await stopSlot(0, intervals, slots, finalStates, 1000);  // Stop first after 1s
    await stopSlot(1, intervals, slots, finalStates, 600);   // Stop second after 600ms more
    await stopSlot(2, intervals, slots, finalStates, 600);   // Stop third after 600ms more

    // Enable clicking after all slots stopped
    setTimeout(() => {
        slots.forEach((slot, index) => {
            slot.classList.remove('spinning', 'stopped');
            slot.addEventListener('click', () => selectState(index));
        });
    }, 500);
}

function updateSlotContent(slotElement, state) {
    const boardHtml = renderStateBoard(state);
    const turnCount = state.turn_count || state.turnCount || 0;
    const rareza = state.rareza_count || 0;

    slotElement.innerHTML = `
        <div class="state-board">${boardHtml}</div>
        <div class="state-info">
            Turno ${turnCount}/9
        </div>
    `;
}

function stopSlot(slotIndex, intervals, slots, finalStates, delay) {
    return new Promise(resolve => {
        setTimeout(() => {
            clearInterval(intervals[slotIndex]);

            // Set final state
            const finalState = finalStates[slotIndex];
            updateSlotContent(slots[slotIndex], finalState);

            // Add stopped animation
            slots[slotIndex].classList.remove('spinning');
            slots[slotIndex].classList.add('stopped');

            // Store the final state on the element
            slots[slotIndex].dataset.stateData = JSON.stringify(finalState);

            resolve();
        }, delay);
    });
}

function renderStateOptions(states) {
    const container = document.getElementById('state-options');
    container.innerHTML = '';

    states.forEach((state, index) => {
        const option = document.createElement('div');
        option.className = 'state-option';
        option.dataset.index = index;

        const boardHtml = renderStateBoard(state);
        const turnCount = state.turn_count || state.turnCount || 0;
        const rareza = state.rareza_count || 0;

        option.innerHTML = `
            <div class="state-board">${boardHtml}</div>
            <div class="state-info">
                Turno ${turnCount}/9<br>
                Rareza: ${rareza}
            </div>
        `;

        option.addEventListener('click', () => selectState(index));
        container.appendChild(option);
    });
}

function selectState(index) {
    // Get state from the slot's data attribute
    const slots = document.querySelectorAll('.state-option');
    const slotData = slots[index].dataset.stateData;

    if (slotData) {
        selectedState = JSON.parse(slotData);
    } else {
        selectedState = availableStates[index];
    }

    // Visual feedback
    slots.forEach((el, i) => {
        el.classList.toggle('selected', i === index);
    });

    // Move to email step
    setTimeout(() => {
        showEmailStep();
    }, 500);
}

function showEmailStep() {
    const display = document.getElementById('selected-state-display');
    display.innerHTML = renderStateBoard(selectedState);
    showStep('step-email');
}

function showStep(stepId) {
    document.querySelectorAll('.modal-step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(stepId).classList.add('active');
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    showStep('step-error');
}

function closeModal() {
    document.getElementById('claim-modal').classList.remove('active');

    // Animate the claimed state on the board if one was just claimed
    if (justClaimedStateId) {
        animateClaimedState(justClaimedStateId);
        justClaimedStateId = null;
    }

    selectedState = null;
    availableStates = [];
}

function animateClaimedState(stateId) {
    // Find the state element on the board
    const stateElement = document.querySelector(`.state[data-state-id="${stateId}"]`);

    if (stateElement) {
        // Remove unclaimed class and add claimed with special animation
        stateElement.classList.remove('unclaimed');
        stateElement.classList.add('claimed', 'just-claimed');

        // Scroll the state into view
        stateElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Remove the just-claimed class after animation completes (2s)
        setTimeout(() => {
            stateElement.classList.remove('just-claimed');
        }, 2000);
    }
}

async function openDemoMode() {
    // Skip straight to success screen with a random state
    const modal = document.getElementById('claim-modal');
    modal.classList.add('active');

    try {
        // Get a random state
        const states = await getRandomStates();
        const demoState = states[0];

        // Show success screen
        const display = document.getElementById('claimed-state-display');
        display.innerHTML = renderStateBoard(demoState);

        const message = document.getElementById('success-message');
        message.innerHTML = `<strong>Demo</strong> - Este es un ejemplo de cómo se vería tu estado reclamado.<br>ID: ${demoState.canonical_id}`;

        showStep('step-success');

        // Make the board interactive
        makeInteractive(display);

    } catch (error) {
        console.error('Error in demo mode:', error);
        showError('No se pudo cargar el demo.');
    }
}

async function handleClaimSubmit(e) {
    e.preventDefault();

    const email = document.getElementById('user-email').value;
    const nombre = document.getElementById('user-name').value;

    try {
        const claimed = await claimState(selectedState.canonical_id, email, nombre);

        // Store the claimed state ID for animation when modal closes
        justClaimedStateId = claimed.canonical_id;

        // Show success
        const display = document.getElementById('claimed-state-display');
        display.innerHTML = renderStateBoard(claimed);

        const message = document.getElementById('success-message');
        message.innerHTML = `¡Enhorabuena, <strong>${nombre || 'Amigo'}</strong>, tu estado único ha sido reclamado!<br>Espera tu sorpresa adicional y recuerda festejar en compañía de amigos y familia.<br><br>Ojalá disfrutes rosca(s) de reyes.<br>ID: ${claimed.canonical_id}`;

        showStep('step-success');

        // Make the board interactive (draggable)
        makeInteractive(display);

        // Reload stats and update claimed states
        await loadStats();
        claimedStateIds.add(claimed.canonical_id);

    } catch (error) {
        console.error('Error claiming state:', error);
        if (error.message.includes('Estado no disponible')) {
            showError('Este estado ya fue reclamado. Por favor elige otro.');
        } else {
            showError('Hubo un error al reclamar tu estado. Intenta de nuevo.');
        }
    }
}

function makeInteractive(displayElement) {
    // Wrap the grid content in a container for 3D transform
    const gridHTML = displayElement.innerHTML;
    displayElement.innerHTML = `<div class="grid-content floating">${gridHTML}</div>`;

    const gridContent = displayElement.querySelector('.grid-content');
    const modalContent = document.querySelector('.modal-content');

    // 3D holographic effect - controlled by mouse anywhere in modal
    modalContent.addEventListener('mousemove', handleMouseMove);
    modalContent.addEventListener('mouseleave', handleMouseLeave);
    modalContent.addEventListener('touchmove', handleTouchMove);
    modalContent.addEventListener('touchend', handleMouseLeave);

    function handleMouseMove(e) {
        const rect = modalContent.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Calculate rotation based on modal dimensions
        const rotateX = ((y - centerY) / centerY) * -60; // Max 60deg tilt up/down
        const rotateY = ((x - centerX) / centerX) * 60;  // Max 60deg tilt left/right

        // Apply 3D rotation to grid only
        gridContent.style.animation = 'none'; // Pause floating while tilting
        gridContent.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }

    function handleTouchMove(e) {
        if (e.touches.length > 0) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = modalContent.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -60;
            const rotateY = ((x - centerX) / centerX) * 60;

            gridContent.style.animation = 'none';
            gridContent.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        }
    }

    function handleMouseLeave() {
        // Return to neutral position and resume floating
        gridContent.style.animation = 'float-grid 3s ease-in-out infinite';
        gridContent.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    }
}

function init() {
    // Show loading overlay
    const loadingOverlay = document.getElementById('initial-loading');

    // Generate states
    const stateGenerator = new StateGenerator();
    stateGenerator.generateAll();
    const canonicalStates = stateGenerator.getCanonicalValidStatesFirstPlayerX();
    canonicalStates.sort((a, b) => a.turnCount - b.turnCount || a.id - b.id);

    const allElement = document.getElementById("all-states");
    console.log({ allElement, canonicalStates });

    for (let i = 0; i < canonicalStates.length; i++) {
        const state = canonicalStates[i];
        allElement.appendChild(renderStateElement(state));
    }

    // Hide loading overlay after states are generated
    setTimeout(() => {
        loadingOverlay.classList.add('hidden');
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 500);
    }, 500);

    // Load stats
    loadStats();

    // Load claimed states and update display
    loadClaimedStates();

    // Setup modal event listeners
    document.getElementById('claim-button').addEventListener('click', openClaimModal);
    document.getElementById('modal-done').addEventListener('click', closeModal);
    document.getElementById('retry-button').addEventListener('click', openClaimModal);
    document.getElementById('claim-form').addEventListener('submit', handleClaimSubmit);

    // Close modal on backdrop click (with touch support for mobile)
    const backdrop = document.querySelector('.modal-backdrop');
    backdrop.addEventListener('click', closeModal);
 /*    backdrop.addEventListener('touchend', (e) => {
        e.preventDefault();
        closeModal();
    }); */
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
