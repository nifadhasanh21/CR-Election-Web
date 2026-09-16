import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('candidate_container');
    const statusText = document.getElementById('live_status_text');
    const statusDot = document.getElementById('live_dot');
    const voteBtn = document.getElementById('vote_btn');

    async function checkStatus() {
        const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
        if (settings && settings.is_live) {
            statusText.innerText = 'LIVE ELECTION';
            statusDot.classList.add('live');
            if (voteBtn) voteBtn.style.display = 'inline-flex';
        } else {
            statusText.innerText = 'OFFLINE';
            statusDot.classList.remove('live');
            if (voteBtn) voteBtn.style.display = 'none';
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
            const avatarImg = c.gender === 'female' ? 'assets/images/female.png' : 'assets/images/male.png';
            const card = document.createElement('div');
            card.className = 'card-icy';
            card.innerHTML = `
                <div class="avatar-wrapper" style="width: 70px; height: 70px; margin: 0 auto;">
                    <img src="${avatarImg}" alt="${c.gender}" style="width: 100%; height: 100%; object-fit: contain;">
                </div>
                <div class="candidate-name" style="font-weight:700; font-size:16px; margin-top:10px; text-align: center;">${c.name}</div>
                <div class="candidate-roll" style="font-size:12px; color:var(--text-secondary); text-align: center;">ID: ${c.roll_id}</div>
                <div class="candidate-speech" style="font-style:italic; font-size:13px; margin: 12px 0; text-align: center;">"${c.speech}"</div>
                
                <!-- Highlighted & Colored Vote Badge -->
                <div class="vote-badge">
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