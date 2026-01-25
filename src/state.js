import { StateGenerator } from './core/StateGenerator.js';
import { getStateById } from './services/supabase.js';

// Get state ID from URL parameters
function getStateIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Render the tic-tac-toe board as ASCII
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

    // Build HTML string with translate="no" to prevent browser translation from breaking spacing
    let html = '<span translate="no">';
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
    html += '</span>';

    return html;
}

// Make the display interactive with 3D holographic effect
function makeInteractive(displayElement) {
    // Wrap the grid content in a container for 3D transform
    const gridHTML = displayElement.innerHTML;
    displayElement.innerHTML = `<div class="grid-content floating">${gridHTML}</div>`;

    const gridContent = displayElement.querySelector('.grid-content');
    const container = document.querySelector('.container');

    // 3D holographic effect - controlled by mouse anywhere in container
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleMouseLeave);

    function handleMouseMove(e) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Calculate rotation based on container dimensions
        const rotateX = ((y - centerY) / centerY) * -30; // Max 30deg tilt up/down
        const rotateY = ((x - centerX) / centerX) * 30;  // Max 30deg tilt left/right

        // Apply 3D rotation to grid only
        gridContent.style.animation = 'none'; // Pause floating while tilting
        gridContent.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }

    function handleTouchMove(e) {
        if (e.touches.length > 0) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = container.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -30;
            const rotateY = ((x - centerX) / centerX) * 30;

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

// Display state information
function displayStateInfo(state, claimedData) {
    const stateInfoElement = document.getElementById('state-info');
    const turnCount = state.turn_count || state.turnCount || 0;
    const isTerminal = state.is_terminal || state.isTerminal;
    const hasWinner = state.has_winner || state.hasWinner;
    const isValid = state.is_valid || state.isValid;

    let statusText = '';
    if (isTerminal) {
        statusText = hasWinner ? 'Juego terminado con ganador' : 'Juego terminado en empate';
    } else {
        statusText = 'Juego en progreso';
    }
    if (!isValid) {
        statusText += ' (Estado inválido)';
    }

    stateInfoElement.innerHTML = `
        <p><strong>ID del Estado:</strong> ${state.canonical_id || state.id}</p>
        <p><strong>Turno:</strong> ${turnCount} de 9</p>
        <p><strong>Estado:</strong> ${statusText}</p>
    `;

    // Display claimed information if available
    if (claimedData && claimedData.nombre) {
        const claimedInfoElement = document.getElementById('claimed-info');
        const claimedNameElement = document.getElementById('claimed-name');
        claimedInfoElement.style.display = 'block';
        claimedNameElement.textContent = claimedData.nombre;
    }
}

// Show error message
function showError(message) {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.innerHTML = `
        <div class="loading-orbital">
            <div class="error-message">${message}</div>
            <a href="./" class="back-link" style="margin-top: 20px;">← Volver al inicio</a>
        </div>
    `;
}

// Main initialization
async function init() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const stateDisplay = document.getElementById('state-display');

    // Get state ID from URL
    const stateId = getStateIdFromURL();

    if (!stateId) {
        showError('No se especificó un ID de estado válido.');
        return;
    }

    try {
        // Try to fetch from database first (for claimed states)
        let stateData = null;
        let claimedData = null;

        try {
            const result = await getStateById(stateId);
            if (result) {
                stateData = result;
                claimedData = result;
            }
        } catch (dbError) {
            console.log('State not found in database, generating locally:', dbError);
        }

        // If not in database, generate it locally
        if (!stateData) {
            const stateGenerator = new StateGenerator();
           
            const allStates =  stateGenerator.generateAll();

            // Find the state by canonical_id
            stateData = allStates.find(s => s.id === stateId);
            console.log({stateData});
            
            if (!stateData) {
                showError(`Estado con ID "${stateId}" no encontrado.`);
                return;
            }
        }

        // Render the state
        const boardHtml = renderStateBoard(stateData);
        stateDisplay.innerHTML = boardHtml;

        // Make it interactive
        makeInteractive(stateDisplay);

        // Display state information
        displayStateInfo(stateData, claimedData);

        // Hide loading overlay
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);
        }, 500);

    } catch (error) {
        console.error('Error loading state:', error);
        showError('Hubo un error al cargar el estado. Por favor intenta de nuevo.');
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
