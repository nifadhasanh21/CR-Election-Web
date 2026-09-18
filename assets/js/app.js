import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('candidate_container');
    const statusText = document.getElementById('live_status_text');
    const statusDot = document.getElementById('live_dot');
    const voteBtn = document.getElementById('vote_btn');

    async function checkStatus() {
        const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
        
        if (settings) {
            if (settings.is_live) {
                statusText.innerText = 'LIVE ELECTION';
                statusDot.classList.add('live');
                if (voteBtn) voteBtn.style.display = 'inline-flex';
            } else {
                statusDot.classList.remove('live');
                if (voteBtn) voteBtn.style.display = 'none';

                if (settings.start_time) {
                    const startTime = new Date(settings.start_time);
                    const formattedTime = startTime.toLocaleString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                    statusText.innerText = `STARTS AT ${formattedTime}`;
                } else {
                    statusText.innerText = 'OFFLINE';
                }
            }
        }
    }

    async function loadCandidates() {
        const { data: candidates, error } = await supabase.from('candidates').select('*').order('created_at', { ascending: true });
        if (error) return console.error(error);

        container.innerHTML = '';
        if (!candidates || candidates.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No active candidates added yet.</div>`;
            return;
        }
        
        candidates.forEach(c => {
            const avatarImg = c.image_name 
                ? `assets/images/${c.image_name}` 
                : (c.gender === 'female' ? 'assets/images/female.png' : 'assets/images/male.png');

            const card = document.createElement('div');
            card.className = 'card-icy';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.alignItems = 'center';
            card.style.textAlign = 'center';

            card.innerHTML = `
                <div class="avatar-wrapper" style="width: 180px; height: 180px; margin: 0 auto 12px auto; border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f2f2f7; border: 1px solid rgba(0, 0, 0, 0.08); box-shadow: 0 4px 10px rgba(0,0,0,0.06);">
                    <img src="${avatarImg}" alt="${c.name}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                </div>
                <div class="candidate-name" style="font-weight:700; font-size:18px; margin-top:4px;">${c.name}</div>
                <div class="candidate-roll" style="font-size:12px; color:var(--text-secondary); margin-top:2px;">ID: ${c.roll_id}</div>
                <div class="candidate-speech" style="font-style:italic; font-size:13px; margin: 12px 0;">"${c.speech}"</div>
                
                <div class="vote-badge" style="width: 100%;">
                    <span>Total Votes</span>
                    <span class="vote-count-value">${c.vote_count || 0}</span>
                </div>
            `;
            container.appendChild(card);
        });
    }

    await checkStatus();
    await loadCandidates();
});