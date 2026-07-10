const DEFAULT_STATES = {
    comments: true,
    shorts: true,
    ads_playables: true,
    notifications: true,
    create_button: true,
    join_button: true,
    voice_search: true,
    youtube_logo: true,
    category_chips: true,
    top_news: true,
    ai_search: true
};

const FEATURE_KEYS = Object.keys(DEFAULT_STATES);

document.addEventListener('DOMContentLoaded', () => {
    const toggles = {};
    FEATURE_KEYS.forEach(key => {
        toggles[key] = document.getElementById(`toggle-${key}`);
    });

    // Show popup immediately — don't wait for storage to respond
    document.body.style.visibility = 'visible';

    // Set initial toggle states based on local storage
    chrome.storage.local.get('states', (data) => {
        if (chrome.runtime.lastError) {
            // Storage error — default to all enabled (hidden)
            FEATURE_KEYS.forEach(key => { toggles[key].checked = DEFAULT_STATES[key]; });
            return;
        }
        const currentStates = (data && data.states) ? { ...DEFAULT_STATES, ...data.states } : DEFAULT_STATES;
        FEATURE_KEYS.forEach(key => {
            toggles[key].checked = currentStates[key];
        });
    });

    // Save state on ANY toggle change
    FEATURE_KEYS.forEach(key => {
        toggles[key].addEventListener('change', () => {
            chrome.storage.local.get('states', (data) => {
                const updatedStates = (data && data.states) ? data.states : DEFAULT_STATES;
                updatedStates[key] = toggles[key].checked;
                chrome.storage.local.set({ states: updatedStates });
            });
        });
    });
});