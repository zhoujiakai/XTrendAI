/**
 * XTrendAI - Main JavaScript
 * Handles all UI interactions and state management
 */

// ========================================
// Global State
// ========================================

const state = {
    language: 'zh-CN',
    copyCount: 5,
    maxCopies: 20,
    userLevel: 'free',
    selectedScenarios: ['pod', 'content'],
    expandedCards: new Set()
};

// ========================================
// DOM Elements
// ========================================

const elements = {
    // Language
    langButtons: document.querySelectorAll('.lang-btn'),
    // Config
    saveConfigBtn: document.getElementById('saveConfig'),
    refreshBtn: document.getElementById('refreshTrends'),
    loadMoreBtn: document.getElementById('loadMore'),
    // Task actions
    copyButtons: document.querySelectorAll('.btn-copy'),
    editButtons: document.querySelectorAll('.btn-edit'),
    expandButtons: document.querySelectorAll('.btn-expand'),
    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    // Modal
    editModal: document.getElementById('editModal'),
    closeModalBtn: document.getElementById('closeModal'),
    cancelEditBtn: document.getElementById('cancelEdit'),
    saveEditBtn: document.getElementById('saveEdit'),
    editTaskTitle: document.getElementById('editTaskTitle'),
    editTaskContent: document.getElementById('editTaskContent'),
    // User menu
    userAvatar: document.querySelector('.user-avatar')
};

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initLanguageSwitch();
    initConfigPanel();
    initTaskActions();
    initModal();
    initUserMenu();
    updateQuotaDisplay();
});

// ========================================
// Language Switch
// ========================================

function initLanguageSwitch() {
    elements.langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            setLanguage(lang);
        });
    });
}

function setLanguage(lang) {
    state.language = lang;

    // Update active state
    elements.langButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Show toast
    showToast(lang === 'zh-CN' ? '已切换到中文' : 'Switched to English');
}

// ========================================
// Config Panel
// ========================================

function initConfigPanel() {
    // Scenario checkboxes limit
    const scenarioCheckboxes = document.querySelectorAll('input[name="scenario"]');
    scenarioCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (state.userLevel === 'free') {
                const checked = document.querySelectorAll('input[name="scenario"]:checked');
                if (checked.length > 2) {
                    e.preventDefault();
                    checkbox.checked = false;
                    showToast('Free用户最多选择2个场景，升级Pro解锁全部', 'warning');
                }
            }
        });
    });

    // Save config
    elements.saveConfigBtn?.addEventListener('click', () => {
        saveConfig();
    });

    // Refresh trends
    elements.refreshBtn?.addEventListener('click', () => {
        refreshTrends();
    });

    // Load more
    elements.loadMoreBtn?.addEventListener('click', () => {
        loadMoreTrends();
    });
}

function saveConfig() {
    // Collect config data
    const config = {
        language: document.querySelector('input[name="language"]:checked')?.value || 'zh-CN',
        regions: Array.from(document.querySelectorAll('input[name="region"]:checked')).map(cb => cb.value),
        age: document.querySelector('input[name="age"]:checked')?.value || '25-34',
        scenarios: Array.from(document.querySelectorAll('input[name="scenario"]:checked')).map(cb => cb.value)
    };

    state.selectedScenarios = config.scenarios;

    // Simulate save
    const btn = elements.saveConfigBtn;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner loading"></i> 保存中...';
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.disabled = false;
        showToast('配置已保存');
    }, 500);
}

function refreshTrends() {
    const btn = elements.refreshBtn;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner loading"></i> 获取中...';
    btn.disabled = true;

    // Simulate API call
    setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.disabled = false;

        // Update refresh time
        const timeElement = btn.querySelector('.refresh-time');
        if (timeElement) {
            timeElement.textContent = '刚刚更新';
        }

        showToast('热点已更新');
    }, 1500);
}

function loadMoreTrends() {
    const btn = elements.loadMoreBtn;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner loading"></i> 加载中...';
    btn.disabled = true;

    // Simulate loading
    setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.disabled = false;
        showToast('没有更多热点了');
    }, 1000);
}

// ========================================
// Task Actions
// ========================================

function initTaskActions() {
    // Copy buttons
    elements.copyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const taskElement = btn.closest('.task-item');
            const taskContent = extractTaskContent(taskElement);
            copyTask(taskContent);
        });
    });

    // Edit buttons
    elements.editButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const taskElement = btn.closest('.task-item');
            openEditModal(taskElement);
        });
    });

    // Expand buttons
    elements.expandButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleCardExpand(btn);
        });
    });
}

function extractTaskContent(taskElement) {
    const title = taskElement.querySelector('h5')?.textContent || '';
    const content = taskElement.querySelector('.task-content p')?.textContent || '';
    const list = taskElement.querySelector('.task-content ol');
    const listContent = list ? list.textContent : '';

    return `${title}\n\n${content}${listContent ? '\n' + listContent : ''}`;
}

function copyTask(content) {
    // Check quota
    if (state.copyCount >= state.maxCopies) {
        showToast(`今日复制次数已达上限(${state.maxCopies})，升级Pro解锁无限使用`, 'warning');
        return;
    }

    // Copy to clipboard
    navigator.clipboard.writeText(content).then(() => {
        state.copyCount++;
        updateQuotaDisplay();
        showToast('已复制到剪贴板');

        // Visual feedback on button
        const btn = event.target.closest('.btn-copy');
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 1500);
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = content;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        state.copyCount++;
        updateQuotaDisplay();
        showToast('已复制到剪贴板');
    });
}

function updateQuotaDisplay() {
    const quotaElements = document.querySelectorAll('.quota-info strong');
    quotaElements.forEach(el => {
        el.textContent = `${state.copyCount}/${state.maxCopies}`;
    });
}

function toggleCardExpand(btn) {
    const card = btn.closest('.trend-card');
    const isExpanded = btn.dataset.expanded === 'true';

    if (isExpanded) {
        // Collapse
        card.querySelectorAll('.task-item').forEach((item, index) => {
            if (index >= 2) {
                item.style.display = 'none';
            }
        });
        btn.dataset.expanded = 'false';
        btn.querySelector('span').textContent = '展开全部';
        btn.querySelector('i').style.transform = 'rotate(0deg)';
    } else {
        // Expand
        card.querySelectorAll('.task-item').forEach(item => {
            item.style.display = 'flex';
        });
        btn.dataset.expanded = 'true';
        btn.querySelector('span').textContent = '收起';
        btn.querySelector('i').style.transform = 'rotate(180deg)';
    }
}

// ========================================
// Modal
// ========================================

let currentEditElement = null;

function initModal() {
    elements.closeModalBtn?.addEventListener('click', closeEditModal);
    elements.cancelEditBtn?.addEventListener('click', closeEditModal);
    elements.saveEditBtn?.addEventListener('click', saveTaskEdit);

    // Close on overlay click
    elements.editModal?.querySelector('.modal-overlay')?.addEventListener('click', closeEditModal);

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEditModal();
        }
    });
}

function openEditModal(taskElement) {
    currentEditElement = taskElement;

    const title = taskElement.querySelector('h5')?.textContent || '';
    const content = taskElement.querySelector('.task-content')?.innerText || '';

    elements.editTaskTitle.value = title;
    elements.editTaskContent.value = content;

    elements.editModal.classList.add('show');
}

function closeEditModal() {
    elements.editModal.classList.remove('show');
    currentEditElement = null;
}

function saveTaskEdit() {
    if (!currentEditElement) return;

    const newTitle = elements.editTaskTitle.value;
    const newContent = elements.editTaskContent.value;

    // Update the task element
    const titleElement = currentEditElement.querySelector('h5');
    const contentElement = currentEditElement.querySelector('.task-content');

    if (titleElement) titleElement.textContent = newTitle;
    if (contentElement) {
        // Preserve structure but update text
        const p = contentElement.querySelector('p');
        if (p) p.textContent = newContent;
    }

    showToast('任务已更新');
    closeEditModal();
}

// ========================================
// User Menu
// ========================================

function initUserMenu() {
    // User dropdown is handled by CSS hover
    // Add any additional JS interactions here
}

// ========================================
// Toast Notification
// ========================================

let toastTimeout = null;

function showToast(message, type = 'success') {
    elements.toastMessage.textContent = message;

    // Update icon based on type
    const icon = elements.toast.querySelector('i');
    icon.className = type === 'warning' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
    icon.style.color = type === 'warning' ? 'var(--color-warning)' : 'var(--color-success)';

    elements.toast.classList.add('show');

    // Clear existing timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    // Auto hide after 3 seconds
    toastTimeout = setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// ========================================
// Utility Functions
// ========================================

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format date
function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
}

// ========================================
// Keyboard Shortcuts
// ========================================

document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus search (when search is implemented)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Focus search input
    }

    // Ctrl/Cmd + R to refresh trends
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && e.shiftKey) {
        e.preventDefault();
        refreshTrends();
    }
});

// ========================================
// Export for potential module usage
// ========================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        state,
        showToast,
        setLanguage,
        saveConfig,
        refreshTrends
    };
}
