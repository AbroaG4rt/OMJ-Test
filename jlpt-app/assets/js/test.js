// assets/js/test.js

document.addEventListener('DOMContentLoaded', async () => {
    const __lang = localStorage.getItem('lang') || 'id';
    const __dashboardTarget = __lang === 'id' ? 'id/dashboard.html' : 'en/dashboard.html';
    const __resultTarget   = __lang === 'id' ? 'id/result.html'    : 'en/result.html';

    const ExamEngine = {
        state: null,
        data: null,
        timerInterval: null,
        sections: ['kanji', 'bunpou', 'choukai'],

        // Configuration mapping based on section IDs
        config: {
            kanji: {
                icon: '📖', jp: '文字・語彙', title: 'Kanji & Vocabulary',
                desc: 'This section tests your knowledge of Japanese kanji, vocabulary, and their readings.',
                tips: ['Read carefully before selecting.', 'Focus on kanji strokes and meaning.'],
                duration: '35 min'
            },
            bunpou: {
                icon: '✏️', jp: '文法・読解', title: 'Grammar & Reading',
                desc: 'This section tests your understanding of Japanese grammar particles and reading comprehension.',
                tips: ['Pay attention to particles and sentence structure.', 'Read paragraphs completely.'],
                duration: '60 min'
            },
            choukai: {
                icon: '🎧', jp: '聴解', title: 'Listening',
                desc: 'This section tests your listening comprehension.',
                tips: ['Audio can only be played a limited number of times.', 'Listen to the entire audio before answering.'],
                duration: '35 min'
            }
        },

        async init() {
            let savedState = JSON.parse(localStorage.getItem('omoshiroi_active_test'));
            if (!savedState) {
                window.location.href = __dashboardTarget;
                return;
            }

            // Verify access
            if (!window.OmoshiroiUtils.checkAccess(savedState.level)) {
                alert(__lang === 'id' ? "Akses Ditolak." : "Access Denied.");
                window.location.href = 'login.html';
                return;
            }

            // Initial State setup if fresh
            if (savedState.sectionIndex === undefined) {
                savedState = {
                    ...savedState,
                    sectionIndex: 0,
                    questionIndex: 0,
                    answers: {},
                    timerPaused: true,
                    remainingSeconds: Math.floor((savedState.endTime - Date.now()) / 1000)
                };
            }

            this.state = savedState;
            document.getElementById('examLevelBadge').textContent = this.state.level;

            // Load JSON Data
            try {
                const response = await fetch(`data/${this.state.level}.json`);
                this.data = await response.json();
                
                // Sort sections natively if they are objects, but assume order is kanji, bunpou, choukai based on structure
                if (!this.data.sections) {
                    throw new Error("Invalid exam data structure.");
                }

            } catch (err) {
                console.error("Failed to load exam data", err);
                alert("Error loading exam data.");
                return;
            }

            this.bindEvents();

            // Routing logic based on state
            if (this.state.timerPaused) {
                // Determine if we are at intro or section instruction
                if (this.state.sectionIndex === 0 && this.state.questionIndex === 0 && Object.keys(this.state.answers).length === 0) {
                    this.showScreen('screenExamIntro');
                    document.getElementById('introBadgeLevel').textContent = this.state.level;
                } else {
                    this.showSectionInstruction();
                }
            } else {
                this.resumeTimer();
                this.renderQuestion();
                this.showScreen('screenQuestion');
            }

            this.updateStepper();
            
            // Security: Tab Switch Detection
            document.addEventListener("visibilitychange", () => {
                if (document.hidden) {
                    alert('⚠️ Warning: Please do not leave the test tab.');
                }
            });
        },

        bindEvents() {
            document.getElementById('startExamBtn').addEventListener('click', () => {
                this.showSectionInstruction();
            });

            document.getElementById('startSectionBtn').addEventListener('click', () => {
                this.startSection();
            });

            document.getElementById('continueBtn').addEventListener('click', () => {
                this.state.sectionIndex++;
                this.state.questionIndex = 0;
                this.saveState();
                this.showSectionInstruction();
            });

            document.getElementById('prevBtn').addEventListener('click', () => {
                if (this.state.questionIndex > 0) {
                    this.state.questionIndex--;
                    this.saveState();
                    this.renderQuestion();
                }
            });

            document.getElementById('nextBtn').addEventListener('click', () => {
                const currentSec = this.data.sections[this.state.sectionIndex];
                if (this.state.questionIndex < currentSec.questions.length - 1) {
                    this.state.questionIndex++;
                    this.saveState();
                    this.renderQuestion();
                } else {
                    // Section finished
                    this.completeSection();
                }
            });

            document.getElementById('forceSubmitBtn').addEventListener('click', () => {
                if(confirm("Are you sure you want to submit your exam now? Unanswered questions will be marked wrong.")) {
                    this.submitExam();
                }
            });
        },

        saveState() {
            localStorage.setItem('omoshiroi_active_test', JSON.stringify(this.state));
        },

        showScreen(screenId) {
            document.querySelectorAll('.exam-screen').forEach(s => s.classList.add('hidden'));
            document.getElementById(screenId).classList.remove('hidden');
            window.scrollTo(0,0);
        },

        updateStepper() {
            const currentSecId = this.sections[this.state.sectionIndex];
            
            this.sections.forEach((secId, idx) => {
                const stepEl = document.getElementById(`step-${secId}`);
                if (!stepEl) return;
                
                stepEl.classList.remove('active', 'completed');
                if (idx < this.state.sectionIndex) stepEl.classList.add('completed');
                if (idx === this.state.sectionIndex) stepEl.classList.add('active');

                // Lines
                if (idx > 0) {
                    const line = document.getElementById(`line-${idx}`);
                    if (line) {
                        if (idx <= this.state.sectionIndex) line.classList.add('active');
                        else line.classList.remove('active');
                    }
                }
            });
        },

        showSectionInstruction() {
            const secData = this.data.sections[this.state.sectionIndex];
            const secId = secData.id || this.sections[this.state.sectionIndex];
            const conf = this.config[secId] || this.config.kanji;

            document.getElementById('instrIcon').textContent = conf.icon;
            document.getElementById('instrTitle').textContent = conf.title;
            document.getElementById('instrSubtitleJp').textContent = conf.jp;
            document.getElementById('instrDescription').textContent = conf.desc;
            document.getElementById('instrQCount').textContent = secData.questions.length;
            document.getElementById('instrDuration').textContent = conf.duration;
            document.getElementById('instrSectionNum').textContent = `${this.state.sectionIndex + 1} of 3`;

            const tipsList = document.getElementById('instrTipsList');
            tipsList.innerHTML = conf.tips.map(t => `<li>${t}</li>`).join('');

            document.getElementById('startSectionBtnText').textContent = `Start ${conf.title}`;

            // Make sure timer is paused
            this.pauseTimer();
            this.updateStepper();
            this.showScreen('screenInstruction');
        },

        startSection() {
            this.state.timerPaused = false;
            this.saveState();
            this.resumeTimer();
            this.renderQuestion();
            this.showScreen('screenQuestion');
        },

        completeSection() {
            this.pauseTimer();
            
            // Check if final section
            if (this.state.sectionIndex >= this.data.sections.length - 1) {
                this.submitExam();
                return;
            }

            // Show Transition
            const overlay = document.getElementById('sectionTransitionOverlay');
            overlay.classList.remove('hidden');
            
            setTimeout(() => {
                overlay.classList.add('hidden');
                
                // Show completion summary
                const secData = this.data.sections[this.state.sectionIndex];
                let answered = 0;
                secData.questions.forEach(q => {
                    if (this.state.answers[q.id]) answered++;
                });

                document.getElementById('completeTitle').textContent = `Section ${this.state.sectionIndex + 1} Complete!`;
                document.getElementById('completeAnswered').textContent = answered;
                document.getElementById('completeSkipped').textContent = secData.questions.length - answered;
                
                this.showScreen('screenSectionComplete');
            }, 1500);
        },

        // ---------- TIMER ---------- //
        pauseTimer() {
            clearInterval(this.timerInterval);
            this.state.timerPaused = true;
            
            if (this.state.endTime) {
                // Calculate remaining right now
                const rem = Math.floor((this.state.endTime - Date.now()) / 1000);
                this.state.remainingSeconds = rem > 0 ? rem : 0;
            }
            
            document.getElementById('timerPausedLabel').classList.remove('hidden');
            this.updateTimerDisplay(this.state.remainingSeconds);
            this.saveState();
        },

        resumeTimer() {
            clearInterval(this.timerInterval);
            this.state.timerPaused = false;
            
            // Re-anchor end time based on remaining seconds
            this.state.endTime = Date.now() + (this.state.remainingSeconds * 1000);
            document.getElementById('timerPausedLabel').classList.add('hidden');
            this.saveState();

            this.timerInterval = setInterval(() => {
                const distance = this.state.endTime - Date.now();
                if (distance <= 0) {
                    this.onTimerExpire();
                    return;
                }
                
                const secondsLeft = Math.floor(distance / 1000);
                this.state.remainingSeconds = secondsLeft;
                this.updateTimerDisplay(secondsLeft);
            }, 1000);
        },

        updateTimerDisplay(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);

            let timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            if (h > 0) timeStr = `${h}:${timeStr}`;

            const disp = document.getElementById('timerDisplay');
            disp.textContent = timeStr;

            if (seconds < 300) {
                disp.classList.add('timer-critical');
            } else {
                disp.classList.remove('timer-critical');
            }
        },

        onTimerExpire() {
            clearInterval(this.timerInterval);
            this.updateTimerDisplay(0);
            alert("Time is up! Submitting automatically.");
            this.submitExam();
        },

        // ---------- QUESTIONS ---------- //
        renderQuestion() {
            const secData = this.data.sections[this.state.sectionIndex];
            const q = secData.questions[this.state.questionIndex];
            
            const conf = this.config[secData.id || this.sections[this.state.sectionIndex]];
            document.getElementById('qSectionPillIcon').textContent = conf.icon;
            document.getElementById('qSectionPillName').textContent = conf.title;
            
            document.getElementById('qCurrentNum').textContent = this.state.questionIndex + 1;
            document.getElementById('qTotalNum').textContent = secData.questions.length;
            
            const progressPct = ((this.state.questionIndex + 1) / secData.questions.length) * 100;
            document.getElementById('qProgressBar').style.width = `${progressPct}%`;

            const container = document.getElementById('questionCard');
            
            function sanitizeHTML(str) {
                if (!str) return '';
                return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                          .replace(/ on\w+="[^"]*"/g, '');
            }

            let html = `<div class="q-text">${this.state.questionIndex + 1}. ${sanitizeHTML(q.question)}</div>`;

            // Media
            if (q.image && q.type !== 'image') {
                html += `<div class="q-media"><img src="assets/images/${q.image}" alt="Question Image"></div>`;
            }

            // Audio (Choukai)
            if (q.audio) {
                const maxPlays = q.max_play || 2;
                const playedCount = parseInt(localStorage.getItem(`audio_${q.id}_playcount`) || '0', 10);
                const remainingPlays = Math.max(0, maxPlays - playedCount);
                
                html += `
                    <div class="audio-player-ui">
                        <button type="button" class="btn-play-audio play-audio-btn" data-qid="${q.id}" data-audio="${q.audio}" data-max="${maxPlays}" ${remainingPlays <= 0 ? 'disabled' : ''}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </button>
                        <div class="audio-status" id="audio_status_${q.id}">
                            ${remainingPlays <= 0 ? 'Audio Locked' : `Plays Remaining: ${remainingPlays} / ${maxPlays}`}
                        </div>
                        ${remainingPlays <= 0 ? '<div class="audio-warning">Audio can no longer be played.</div>' : ''}
                    </div>
                `;
            }

            // Options
            html += `<div class="options-list">`;
            
            if (Array.isArray(q.options)) {
                // Image grid
                html += `<div class="options-grid image-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">`;
                q.options.forEach(opt => {
                    const isChecked = this.state.answers[q.id] === opt.label;
                    html += `
                        <label class="opt-label ${isChecked ? 'selected' : ''}" style="flex-direction: column; text-align: center; padding: 1.5rem;">
                            <input type="radio" name="q_${q.id}" value="${opt.label}" ${isChecked ? 'checked' : ''} style="display:none;">
                            <span class="opt-label-prefix" style="margin-bottom: 0.5rem; background: var(--exam-bg); padding: 4px 12px; border-radius: 12px;">${opt.label}</span>
                            <img src="${opt.image}" style="max-height: 100px; border-radius: 4px;">
                        </label>
                    `;
                });
                html += `</div>`;
            } else {
                // Text options
                for (const [key, value] of Object.entries(q.options)) {
                    const isChecked = this.state.answers[q.id] === key;
                    html += `
                        <label class="opt-label ${isChecked ? 'selected' : ''}">
                            <input type="radio" name="q_${q.id}" value="${key}" ${isChecked ? 'checked' : ''} style="display:none;">
                            <span class="opt-label-prefix">${key}.</span>
                            <span class="opt-label-text">${sanitizeHTML(value)}</span>
                        </label>
                    `;
                }
            }
            
            html += `</div>`;
            container.innerHTML = html;

            this.bindQuestionEvents();
            this.updateNavButtons(secData.questions.length);
        },

        bindQuestionEvents() {
            // Audio Buttons
            document.querySelectorAll('.play-audio-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    if (this.disabled) return;
                    
                    const qid = this.getAttribute('data-qid');
                    const audioFile = this.getAttribute('data-audio');
                    const maxPlays = parseInt(this.getAttribute('data-max'), 10);
                    let playedCount = parseInt(localStorage.getItem(`audio_${qid}_playcount`) || '0', 10);
                    
                    if (playedCount < maxPlays) {
                        const audioObj = new Audio(`assets/audio/${audioFile}`);
                        audioObj.play().catch(e => alert('Failed to play audio.'));
                        
                        playedCount++;
                        localStorage.setItem(`audio_${qid}_playcount`, playedCount);
                        
                        const remainingPlays = maxPlays - playedCount;
                        const statusEl = document.getElementById(`audio_status_${qid}`);
                        
                        if (remainingPlays <= 0) {
                            this.disabled = true;
                            statusEl.textContent = 'Audio Locked';
                            statusEl.parentElement.insertAdjacentHTML('beforeend', '<div class="audio-warning">Audio can no longer be played.</div>');
                        } else {
                            statusEl.textContent = `Plays Remaining: ${remainingPlays} / ${maxPlays}`;
                        }
                    }
                });
            });

            // Option Selection
            document.querySelectorAll('.opt-label').forEach(label => {
                label.addEventListener('click', (e) => {
                    const parent = label.closest('.options-list') || label.closest('.options-grid');
                    parent.querySelectorAll('.opt-label').forEach(l => l.classList.remove('selected'));
                    label.classList.add('selected');

                    const input = label.querySelector('input');
                    input.checked = true;

                    const secData = this.data.sections[this.state.sectionIndex];
                    const q = secData.questions[this.state.questionIndex];
                    
                    this.state.answers[q.id] = input.value;
                    this.saveState();
                });
            });
        },

        updateNavButtons(totalQuestions) {
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');

            prevBtn.disabled = this.state.questionIndex === 0;

            if (this.state.questionIndex === totalQuestions - 1) {
                if (this.state.sectionIndex === this.data.sections.length - 1) {
                    nextBtn.innerHTML = `Finish Exam <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
                    nextBtn.style.background = 'var(--exam-success)';
                } else {
                    nextBtn.innerHTML = `Finish Section <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
                }
            } else {
                nextBtn.innerHTML = `Next <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
                nextBtn.style.background = '';
            }
        },

        submitExam() {
            clearInterval(this.timerInterval);
            window.onbeforeunload = null;

            const cheatData = window.AntiCheat ? window.AntiCheat.getProfile() : { tabSwitches: 0, copyAttempts: 0, screenshotAttempts: 0, devToolsAttempts: 0 };
            const cheatScore = (cheatData.tabSwitches * 2) + (cheatData.copyAttempts * 1) + (cheatData.screenshotAttempts * 2) + (cheatData.devToolsAttempts * 3);
            cheatData.score = cheatScore;

            const finalResult = {
                level: this.state.level,
                answers: this.state.answers,
                cheatProfile: cheatData,
                timestamp: Date.now()
            };

            localStorage.setItem('omoshiroi_latest_result', JSON.stringify(finalResult));
            localStorage.removeItem('omoshiroi_active_test');
            localStorage.removeItem('omoshiroi_cheatData');

            window.location.href = __resultTarget;
        }
    };

    ExamEngine.init();
});
