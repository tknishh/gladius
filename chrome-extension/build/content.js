chrome.runtime.sendMessage({ action: 'authorize' });

// Add button or other UI element to trigger data export
document.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'exportData', params: { expression: 'value' } });
});
