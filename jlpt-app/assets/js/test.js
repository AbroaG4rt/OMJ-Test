// assets/js/test.js

document.addEventListener('DOMContentLoaded', async () => {
    const __lang = localStorage.getItem('lang') || 'id';
    const __dashboardTarget = __lang === 'id' ? 'id/dashboard.html' : 'en/dashboard.html';
    const __resultTarget   = __lang === 'id' ? 'id/result.html'    : 'en/result.html';

    let testState = JSON.parse(localStorage.getItem('omoshiroi_active_test'));
    if (!testState) {
        window.location.href = __dashboardTarget;
        return;
    }

    const { level, endTime } = testState;

    if (!OmoshiroiUtils.checkAccess(level)) {
        alert(__lang === 'id' ? "Akses Ditolak. Silakan login." : "Access Denied. Please login.");
        window.location.href = __lang === 'id' ? 'id/login.html' : 'en/login.html';
        return;
    }
    document.getElementById('testLevelBadge').textContent = level;

    // Security: Tab Switch Detection
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            const msg = __lang === 'id'
                ? '⚠️ Peringatan: Berpindah tab terdeteksi! Harap fokus pada ujian.'
                : '⚠️ Warning: Please do not leave the test tab. Your actions are recorded.';
            alert(msg);
        }
    });

    // Elements
    const timerDisplay = document.getElementById('timerDisplay');
    const questionsContainer = document.getElementById('questionsContainer');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const forceSubmitBtn = document.getElementById('forceSubmitBtn');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    let allQuestions = [];
    const QUESTIONS_PER_PAGE = 10;
    let currentPage = 0;
    let totalPages = 0;

    // Timer Logic
    const timerInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance <= 0) {
            clearInterval(timerInterval);
            timerDisplay.textContent = "00:00";
            alert(__lang === 'id' ? 'Waktu habis! Ujian dikirim otomatis.' : 'Time is up! Submitting automatically.');
            submitTest();
            return;
        }

        const secondsLeft = Math.floor(distance / 1000);
        timerDisplay.textContent = OmoshiroiUtils.formatTime(secondsLeft);

        if (secondsLeft < 300) { // Last 5 minutes
            timerDisplay.classList.add('timer-critical');
        }
    }, 1000);

    // Fetch Questions
    try {
        const response = await fetch(`data/${level}.json`);
        let questions = await response.json();
        
        // Shuffle questions
        questions = questions.sort(() => Math.random() - 0.5);
        allQuestions = questions;
        totalPages = Math.ceil(allQuestions.length / QUESTIONS_PER_PAGE);
        
        renderPage(0);
        updateProgress();
    } catch (error) {
        console.error("Failed to load questions", error);
        questionsContainer.innerHTML = "<p class='text-center'>Error loading questions. Please try again.</p>";
    }

    function sanitizeHTML(str) {
        if (!str) return '';
        // Basic protection: Remove script tags
        return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                  // Also remove on... event attributes
                  .replace(/ on\w+="[^"]*"/g, '')
                  .replace(/ on\w+='[^']*'/g, '')
                  .replace(/ on\w+=\w+/g, '');
    }

    function renderPage(pageIndex) {
        currentPage = pageIndex;
        questionsContainer.innerHTML = '';

        const startIdx = pageIndex * QUESTIONS_PER_PAGE;
        const endIdx = Math.min(startIdx + QUESTIONS_PER_PAGE, allQuestions.length);
        const pageQuestions = allQuestions.slice(startIdx, endIdx);

        pageQuestions.forEach((q, idx) => {
            const globalIndex = startIdx + idx + 1;
            const qDiv = document.createElement('div');
            qDiv.className = 'question-item';

            let mediaHTML = '';
            if (q.image && q.type !== 'image') {
                // Regular question with image
                mediaHTML += `<img src="assets/images/${q.image}" alt="Question Image" style="max-width:100%; border-radius:4px; margin-bottom:1rem; display:block;">`;
            }
            if (q.audio) {
                const maxPlays = q.max_play || 2;
                const playedCount = parseInt(localStorage.getItem(`audio_${q.id}_playcount`) || '0', 10);
                const remainingPlays = Math.max(0, maxPlays - playedCount);
                
                let playText = __lang === 'id' ? 'Putar Audio' : 'Play Audio';
                let remainingText = __lang === 'id' ? `Sisa putar: ${remainingPlays}x` : `Remaining plays: ${remainingPlays}x`;
                
                if (remainingPlays <= 0) {
                    playText = __lang === 'id' ? 'Audio terkunci' : 'Audio locked';
                    remainingText = __lang === 'id' ? 'Audio sudah tidak dapat diputar' : 'Audio can no longer be played';
                }

                mediaHTML += `
                    <div class="audio-player-wrapper" style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-color); border-radius: var(--radius); border: 1px solid var(--border-color);">
                        <button type="button" class="btn btn-primary play-audio-btn" data-qid="${q.id}" data-audio="${q.audio}" data-max="${maxPlays}" ${remainingPlays <= 0 ? 'disabled' : ''} style="margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; width: 100%;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            <span class="btn-text">${playText}</span>
                        </button>
                        <div class="audio-feedback text-center" id="audio_feedback_${q.id}" style="font-size: 0.85rem; color: ${remainingPlays <= 0 ? 'var(--danger-color)' : 'var(--text-secondary)'}; font-weight: 500;">
                            ${remainingText}
                        </div>
                    </div>
                `;
            }

            let optionsHTML = '';
            
            // Check if options is Array (image type requirement)
            if (Array.isArray(q.options)) {
                // Grid wrapper handle in CSS but we can add inline here optionally
                optionsHTML += `<div class="options-grid image-grid">`;
                q.options.forEach(opt => {
                    const isChecked = testState.answers[q.id] === opt.label;
                    optionsHTML += `
                        <label class="option-label image-option-label ${isChecked ? 'selected' : ''}" data-qid="${q.id}" data-opt="${opt.label}">
                            <input type="radio" name="q_${q.id}" value="${opt.label}" ${isChecked ? 'checked' : ''} style="display:none;">
                            <div class="image-option-content" style="text-align: center;">
                                <div class="image-label-badge" style="margin-bottom: 0.5rem; font-weight: 600; color: var(--primary-color); display: inline-block; padding: 2px 10px; background: var(--sakura-accent); border-radius: 4px;">${opt.label}</div>
                                <img src="${opt.image}" alt="Option ${opt.label}" class="option-image" style="max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 0 auto;">
                            </div>
                        </label>
                    `;
                });
                optionsHTML += `</div>`;
            } else {
                // Object options (existing format)
                optionsHTML += `<div class="options-grid">`;
                for (const [key, value] of Object.entries(q.options)) {
                    const isChecked = testState.answers[q.id] === key;
                    optionsHTML += `
                        <label class="option-label ${isChecked ? 'selected' : ''}" data-qid="${q.id}" data-opt="${key}">
                            <input type="radio" name="q_${q.id}" value="${key}" ${isChecked ? 'checked' : ''} style="display:none;">
                            <strong>${key}.</strong> ${sanitizeHTML(value)}
                        </label>
                    `;
                }
                optionsHTML += `</div>`;
            }

            qDiv.innerHTML = `
                <div class="question-text">${globalIndex}. ${sanitizeHTML(q.question)}</div>
                ${mediaHTML}
                ${optionsHTML}
            `;
            questionsContainer.appendChild(qDiv);
        });

        // Add event listeners for audio buttons
        document.querySelectorAll('.play-audio-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (this.disabled) return;
                
                const qid = this.getAttribute('data-qid');
                const audioFile = this.getAttribute('data-audio');
                const maxPlays = parseInt(this.getAttribute('data-max'), 10);
                
                let playedCount = parseInt(localStorage.getItem(`audio_${qid}_playcount`) || '0', 10);
                
                if (playedCount < maxPlays) {
                    // Play audio
                    const audioObj = new Audio(`assets/audio/${audioFile}`);
                    audioObj.play().catch(e => {
                        console.error('Audio play failed', e);
                        alert(__lang === 'id' ? 'Gagal memutar audio.' : 'Failed to play audio.');
                    });
                    
                    // Increment count
                    playedCount++;
                    localStorage.setItem(`audio_${qid}_playcount`, playedCount);
                    
                    const remainingPlays = maxPlays - playedCount;
                    const feedbackEl = document.getElementById(`audio_feedback_${qid}`);
                    
                    if (remainingPlays <= 0) {
                        this.disabled = true;
                        this.querySelector('.btn-text').textContent = __lang === 'id' ? 'Audio terkunci' : 'Audio locked';
                        feedbackEl.textContent = __lang === 'id' ? 'Audio sudah tidak dapat diputar' : 'Audio can no longer be played';
                        feedbackEl.style.color = 'var(--danger-color)';
                        this.style.opacity = '0.5';
                        this.style.cursor = 'not-allowed';
                    } else {
                        feedbackEl.textContent = __lang === 'id' ? `Sisa putar: ${remainingPlays}x` : `Remaining plays: ${remainingPlays}x`;
                    }
                }
            });
        });

        // Add event listeners to labels for custom styling
        document.querySelectorAll('.option-label').forEach(label => {
            label.addEventListener('click', function(e) {
                // The label click will automatically check the radio button
                const qid = this.getAttribute('data-qid');
                const opt = this.getAttribute('data-opt');
                
                // Remove selected class from all labels in this question group
                const parentGroup = this.parentElement;
                parentGroup.querySelectorAll('.option-label').forEach(l => l.classList.remove('selected'));
                
                // Add selected class to this
                this.classList.add('selected');

                // Save to state instantly
                testState.answers[qid] = opt;
                localStorage.setItem('omoshiroi_active_test', JSON.stringify(testState));
                
                updateProgress();
            });
        });

        // Pagination Buttons State
        prevBtn.disabled = currentPage === 0;
        
        if (currentPage === totalPages - 1) {
            nextBtn.textContent = "Finish Test";
            nextBtn.classList.remove('btn-primary');
            nextBtn.classList.add('btn-primary');
            nextBtn.style.backgroundColor = "var(--success-color)";
        } else {
            nextBtn.textContent = "Next →";
            nextBtn.style.backgroundColor = ""; // Reset to CSS class default
        }
    }

    function updateProgress() {
        const answeredCount = Object.keys(testState.answers).length;
        const total = allQuestions.length;
        const percentage = total > 0 ? (answeredCount / total) * 100 : 0;
        
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${answeredCount} / ${total}`;
    }

    prevBtn.addEventListener('click', () => {
        if (currentPage > 0) renderPage(currentPage - 1);
        window.scrollTo(0, 0);
    });

    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages - 1) {
            renderPage(currentPage + 1);
            window.scrollTo(0, 0);
        } else {
            const confirmMsg = __lang === 'id'
                ? 'Apakah Anda yakin ingin mengirimkan ujian ini?'
                : 'Are you sure you want to submit your test?';
            if (confirm(confirmMsg)) {
                submitTest();
            }
        }
    });

    forceSubmitBtn.addEventListener('click', () => {
        const confirmMsg = __lang === 'id'
            ? 'Anda akan mengirim ujian secara paksa. Pertanyaan yang belum dijawab akan dianggap salah. Lanjutkan?'
            : 'You are about to force submit your exam. Unanswered questions will be marked incorrect. Proceed?';
        if (confirm(confirmMsg)) {
            submitTest();
        }
    });

    function submitTest() {
        clearInterval(timerInterval);
        
        // Disable lockdown warning so we can redirect gracefully
        window.onbeforeunload = null;

        // Hook anti cheat
        const cheatData = window.AntiCheat ? window.AntiCheat.getProfile() : { tabSwitches: 0, copyAttempts: 0, screenshotAttempts: 0, devToolsAttempts: 0 };
        
        // Calculate Cheat Score
        const cheatScore = (cheatData.tabSwitches * 2) + (cheatData.copyAttempts * 1) + (cheatData.screenshotAttempts * 2) + (cheatData.devToolsAttempts * 3);
        cheatData.score = cheatScore;

        // Delegate scoring evaluation to result.js
        const finalResult = {
            level: level,
            answers: testState.answers,
            cheatProfile: cheatData,
            timestamp: new Date().getTime()
        };

        // Cache for Result Page
        localStorage.setItem('omoshiroi_latest_result', JSON.stringify(finalResult));
        
        // Clear active test state securely
        localStorage.removeItem('omoshiroi_active_test');
        localStorage.removeItem('omoshiroi_cheatData');

        window.location.href = __resultTarget;
    }
});
