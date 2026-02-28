// gemini.js — Google AI Studio (Gemini) API wrapper
// Replaces Puter.js AI integration

window.GEMINI_API_KEY = null;

const GEMINI_MODEL = 'google/gemini-2.5-flash';
const GEMINI_API_BASE = 'https://openrouter.ai/api/v1/chat/completions';

function isAIConnected() {
    return !!window.GEMINI_API_KEY;
}

/**
 * Get personality-specific instructions.
 */
function getPersonalityPrompt() {
    const personality = window.AI_PERSONALITY || 'average';
    switch (personality) {
        case 'pro':
            return "\nPERSONALITY: You are a professional, high-level Among Us player. You are extremely tactical, analyze movement patterns, remember where people were, and use advanced deduction. You are objective and efficient.";
        case 'interesting':
            return "\nPERSONALITY: You are a very interesting and slightly chaotic Among Us player. Use colorful language, be dramatic, and sometimes bring up weird theories or personal 'lore' about other crewmates. Make the game feel like a soap opera.";
        case 'average':
        default:
            return "\nPERSONALITY: You are an average Among Us player. Your logic is sound but basic. You don't overthink things.";
    }
}

/**
 * Send a chat message to OpenRouter and get a text response.
 * @param {string} prompt - The user/game prompt
 * @param {string} systemPrompt - Optional system instruction
 * @returns {Promise<string|null>} The response text, or null on failure
 */
async function geminiChat(prompt, systemPrompt) {
    if (!window.GEMINI_API_KEY) return null;

    const messages = [];
    const fullSystemPrompt = (systemPrompt || "") + getPersonalityPrompt();
    messages.push({ role: 'system', content: fullSystemPrompt });
    messages.push({ role: 'user', content: prompt });

    const body = {
        model: GEMINI_MODEL,
        messages: messages,
        max_tokens: 60,
        temperature: 1.0,
        top_p: 0.95
    };

    try {
        const response = await fetch(GEMINI_API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.GEMINI_API_KEY}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'Among Us Ghost Observer'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.text();
            let errorMessage = err;
            try {
                const parsed = JSON.parse(err);
                errorMessage = parsed?.error?.message || err;
            } catch (e) { }
            console.error(`[OpenRouter] API error ${response.status}:`, errorMessage);
            return null;
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        return text ? text.trim() : null;
    } catch (err) {
        console.error('[OpenRouter] Fetch error:', err);
        return null;
    }
}

/**
 * Send a chat message to OpenRouter requesting a short/structured answer.
 * @param {string} prompt - The prompt
 * @param {string} systemPrompt - Optional system instruction
 * @returns {Promise<string|null>} The response text, or null on failure
 */
async function geminiChatStructured(prompt, systemPrompt) {
    if (!window.GEMINI_API_KEY) return null;

    const messages = [];
    const fullSystemPrompt = (systemPrompt || "") + getPersonalityPrompt();
    messages.push({ role: 'system', content: fullSystemPrompt });
    messages.push({ role: 'user', content: prompt });

    const body = {
        model: GEMINI_MODEL,
        messages: messages,
        max_tokens: 30,
        temperature: 0.4,
        top_p: 0.9
    };

    try {
        const response = await fetch(GEMINI_API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.GEMINI_API_KEY}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'Among Us Ghost Observer'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.text();
            let errorMessage = err;
            try {
                const parsed = JSON.parse(err);
                errorMessage = parsed?.error?.message || err;
            } catch (e) { }
            console.error(`[OpenRouter] Structured API error ${response.status}:`, errorMessage);
            return null;
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        return text ? text.trim() : null;
    } catch (err) {
        console.error('[OpenRouter] Structured fetch error:', err);
        return null;
    }
}

/**
 * Show the API key modal and return a promise that resolves with the key.
 */
function showAPIKeyModal() {
    return new Promise((resolve) => {
        const modal = document.getElementById('api-key-modal');
        const input = document.getElementById('api-key-input');
        const submitBtn = document.getElementById('api-key-submit');
        const cancelBtn = document.getElementById('api-key-cancel');

        if (!modal || !input || !submitBtn) {
            const key = prompt('Enter your OpenRouter API Key:');
            resolve(key || null);
            return;
        }

        modal.classList.remove('hidden');
        input.value = '';
        input.focus();

        function cleanup() {
            modal.classList.add('hidden');
            submitBtn.removeEventListener('click', onSubmit);
            cancelBtn.removeEventListener('click', onCancel);
            input.removeEventListener('keydown', onKey);
        }

        function onSubmit() {
            const key = input.value.trim();
            cleanup();
            resolve(key || null);
        }

        function onCancel() {
            cleanup();
            resolve(null);
        }

        function onKey(e) {
            if (e.key === 'Enter') onSubmit();
            if (e.key === 'Escape') onCancel();
        }

        submitBtn.addEventListener('click', onSubmit);
        cancelBtn.addEventListener('click', onCancel);
        input.addEventListener('keydown', onKey);
    });
}

/**
 * Asks the AI who should speak next in the meeting.
 * @param {string} chatHistory - The current transcript of the meeting
 * @param {Array} bots - List of all bots (to check who is alive)
 * @returns {Promise<string>} The name of the next speaker or 'skip'
 */
async function geminiChatOrchestrator(chatHistory, bots) {
    if (!window.GEMINI_API_KEY) return 'skip';

    const aliveBots = bots.filter(b => b.alive).map(b => b.name).join(', ');
    const systemPrompt = `You are a meeting orchestrator for Among Us. 
Given the chat history and the list of alive players, decide who should speak next.
If the conversation has naturally reached a pause or no one has anything relevant to add, return 'skip'.
If someone was just asked a question or accused, they should probably speak next.
Return ONLY the name of the player who should speak next, or 'skip'.
Alive Players: ${aliveBots}`;

    const prompt = `Chat History:\n${chatHistory}\n\nWho should speak next?`;

    try {
        const response = await geminiChatStructured(prompt, systemPrompt);
        return response ? response.trim() : 'skip';
    } catch (err) {
        console.error('[OpenRouter] Orchestrator error:', err);
        return 'skip';
    }
}
