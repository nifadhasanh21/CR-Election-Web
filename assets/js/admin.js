import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const startDateInput = document.getElementById('start_date_input');
    const saveDateBtn = document.getElementById('save_date_btn');
    const toggleLiveBtn = document.getElementById('toggle_live_btn');

    const candidateForm = document.getElementById('candidate_form');
    const candNameInput = document.getElementById('cand_name');
    const candRollInput = document.getElementById('cand_roll');
    const candImageInput = document.getElementById('cand_image');
    const candGenderInput = document.getElementById('cand_gender');
    const candSpeechInput = document.getElementById('cand_speech');
    const candidateTableBody = document.getElementById('candidate_table_body');

    const tokenForm = document.getElementById('token_form');
    const tokenStudentIdInput = document.getElementById('token_student_id');
    const tokenTableBody = document.getElementById('token_table_body');

    const voterTableBody = document.getElementById('voter_table_body');

    let isLiveStatus = false;

    if (tokenStudentIdInput) {
        tokenStudentIdInput.value = '242-35-';
    }

    // 1. ELECTION CONTROLS (Timezone Fixed)
    async function loadSettings() {
        const { data: settings, error } = await supabase.from('settings').select('*').eq('id', 1).single();
        if (error || !settings) return;

        isLiveStatus = settings.is_live;
        updateLiveButtonUI();

        if (settings.start_time) {
            const localDate = new Date(settings.start_time);
            localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
            startDateInput.value = localDate.toISOString().slice(0, 16);
        }
    }

    function updateLiveButtonUI() {
        if (isLiveStatus) {
            toggleLiveBtn.textContent = 'Voting: LIVE';
            toggleLiveBtn.style.background = '#34c759';
            toggleLiveBtn.style.color = '#ffffff';
        } else {
            toggleLiveBtn.textContent = 'Voting: OFF';
            toggleLiveBtn.style.background = '#ff3b30';
            toggleLiveBtn.style.color = '#ffffff';
        }
    }

    toggleLiveBtn?.addEventListener('click', async () => {
        isLiveStatus = !isLiveStatus;
        const { error } = await supabase.from('settings').update({ is_live: isLiveStatus }).eq('id', 1);
        if (error) {
            alert('Failed to update status');
            isLiveStatus = !isLiveStatus;
        }
        updateLiveButtonUI();
    });

    saveDateBtn?.addEventListener('click', async () => {
        const selectedDate = startDateInput.value;
        if (!selectedDate) return alert('Please select a date and time.');

        const isoDate = new Date(selectedDate).toISOString();
        const { error } = await supabase.from('settings').update({ start_time: isoDate }).eq('id', 1);

        if (error) alert('Error saving date: ' + error.message);
        else alert('Start schedule updated successfully!');
    });

    // 2. TOKEN GENERATION & MANAGEMENT
    function generateRandomToken() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async function loadTokens() {
        if (!tokenTableBody) return;

        const { data: tokens, error } = await supabase
            .from('tokens')
            .select('*')
            .order('id', { ascending: false });

        if (error) return console.error('Error fetching tokens:', error);

        tokenTableBody.innerHTML = '';

        tokens.forEach(t => {
            const tr = document.createElement('tr');
            const tokenDisplay = (t.token && t.token !== '')
                ? `<code style="background: #e5e5ea; padding: 4px 8px; border-radius: 4px; font-weight: bold; letter-spacing: 1px;">${t.token}</code>` 
                : `<span style="color: #8e8e93; font-style: italic;">No Token</span>`;

            tr.innerHTML = `
                <td><strong>${t.student_id}</strong></td>
                <td>${tokenDisplay}</td>
                <td>
                    <span style="color: ${t.is_used ? '#ff3b30' : '#34c759'}; font-weight: 700;">
                        ${t.is_used ? 'Used' : (t.token ? 'Active' : 'Pending Token')}
                    </span>
                </td>
                <td>${t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                <td style="display: flex; gap: 6px;">
                    ${t.token ? `<button class="btn-ios btn-ios-secondary copy-btn" data-token="${t.token}" style="padding: 4px 8px; font-size: 11px;">Copy</button>` : ''}
                    <button class="btn-ios delete-token-btn" data-id="${t.id}" style="padding: 4px 8px; font-size: 11px; background: #ff3b30; color: white;">Delete</button>
                </td>
            `;
            tokenTableBody.appendChild(tr);
        });

        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tokenVal = e.target.getAttribute('data-token');
                navigator.clipboard.writeText(tokenVal);
                alert(`Token ${tokenVal} copied!`);
            });
        });

        document.querySelectorAll('.delete-token-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!confirm('Are you sure you want to delete this token record?')) return;
                const tokenId = e.target.getAttribute('data-id');
                const { error } = await supabase.from('tokens').delete().eq('id', tokenId);
                if (error) alert('Error deleting: ' + error.message);
                else loadTokens();
            });
        });
    }

    tokenForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const studentId = tokenStudentIdInput.value.trim();
        if (!studentId || studentId === '242-35-') return alert('Please complete the Student ID.');

        const { data: existingRecord, error: checkError } = await supabase
            .from('tokens')
            .select('*')
            .eq('student_id', studentId)
            .maybeSingle();

        if (checkError) return alert('Database error: ' + checkError.message);

        if (!existingRecord) {
            alert(`Error: Student ID "${studentId}" is NOT in the registered voter list!`);
            return;
        }

        if (existingRecord.token && existingRecord.token !== '') {
            alert(`Token already generated for ${studentId}: ${existingRecord.token}`);
            return;
        }

        const newToken = generateRandomToken();
        const { error: updateError } = await supabase
            .from('tokens')
            .update({ 
                token: newToken, 
                is_used: false, 
                created_at: new Date().toISOString() 
            })
            .eq('id', existingRecord.id);

        if (updateError) {
            alert('Failed to generate token: ' + updateError.message);
        } else {
            alert(`Token Generated for ${studentId}: ${newToken}`);
            tokenStudentIdInput.value = '242-35-';
            loadTokens();
        }
    });

    // 3. CANDIDATE MANAGEMENT
    async function loadCandidates() {
        if (!candidateTableBody) return;

        const { data: candidates, error } = await supabase
            .from('candidates')
            .select('*')
            .order('vote_count', { ascending: false });

        if (error) return console.error(error);

        candidateTableBody.innerHTML = '';

        candidates.forEach(c => {
            const avatarSrc = c.image_name 
                ? `../assets/images/${c.image_name}` 
                : (c.gender === 'female' ? '../assets/images/female.png' : '../assets/images/male.png');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${avatarSrc}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;"></td>
                <td><strong>${c.name}</strong></td>
                <td>${c.roll_id}</td>
                <td><strong>${c.vote_count || 0}</strong></td>
                <td>
                    <button class="btn-ios btn-ios-secondary delete-cand-btn" data-id="${c.id}" style="padding: 4px 8px; font-size: 11px; background: #ff3b30; color: white;">Delete</button>
                </td>
            `;
            candidateTableBody.appendChild(tr);
        });

        document.querySelectorAll('.delete-cand-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!confirm('Are you sure you want to delete this candidate?')) return;
                const id = e.target.getAttribute('data-id');
                await supabase.from('candidates').delete().eq('id', id);
                loadCandidates();
            });
        });
    }

    candidateForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = candNameInput.value.trim();
        const roll = candRollInput.value.trim();
        const imageName = candImageInput.value.trim();
        const gender = candGenderInput.value;
        const speech = candSpeechInput.value.trim();

        const { error } = await supabase.from('candidates').insert([{
            name: name,
            roll_id: roll,
            image_name: imageName || null,
            gender: gender,
            speech: speech,
            vote_count: 0
        }]);

        if (error) alert('Failed to add candidate: ' + error.message);
        else {
            candidateForm.reset();
            loadCandidates();
        }
    });

    // 4. VOTER RECORDS WITH FIXED VOTE REVOCATION
    async function loadVoterRecords() {
        if (!voterTableBody) return;

        const { data: votes, error } = await supabase.from('votes').select('*').order('id', { ascending: false });
        if (error) return console.error(error);

        voterTableBody.innerHTML = '';

        votes.forEach(v => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${v.voter_name}</td>
                <td><strong>${v.voter_id}</strong></td>
                <td>${new Date(v.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                    <button class="btn-ios revoke-vote-btn" data-voter-id="${v.voter_id}" data-id="${v.id}" style="padding: 4px 8px; font-size: 11px; background: #ff9500; color: white;">Revoke Vote</button>
                </td>
            `;
            voterTableBody.appendChild(tr);
        });

        document.querySelectorAll('.revoke-vote-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!confirm('Revoking vote will deduct candidate votes & reset token. Proceed?')) return;
                
                const voteId = e.target.getAttribute('data-id');
                const voterRoll = e.target.getAttribute('data-voter-id');

                const { data: voteDetails, error: fetchErr } = await supabase
                    .from('votes')
                    .select('*')
                    .eq('id', voteId)
                    .single();

                if (fetchErr || !voteDetails) {
                    alert('Failed to find vote details.');
                    return;
                }

                if (voteDetails.cr1_candidate_id) {
                    const { data: cand1 } = await supabase
                        .from('candidates')
                        .select('vote_count')
                        .eq('id', voteDetails.cr1_candidate_id)
                        .single();

                    if (cand1 && cand1.vote_count > 0) {
                        await supabase
                            .from('candidates')
                            .update({ vote_count: cand1.vote_count - 1 })
                            .eq('id', voteDetails.cr1_candidate_id);
                    }
                }

                if (voteDetails.cr2_candidate_id) {
                    const { data: cand2 } = await supabase
                        .from('candidates')
                        .select('vote_count')
                        .eq('id', voteDetails.cr2_candidate_id)
                        .single();

                    if (cand2 && cand2.vote_count > 0) {
                        await supabase
                            .from('candidates')
                            .update({ vote_count: cand2.vote_count - 1 })
                            .eq('id', voteDetails.cr2_candidate_id);
                    }
                }

                await supabase.from('votes').delete().eq('id', voteId);
                await supabase.from('tokens').update({ is_used: false }).eq('student_id', voterRoll);

                alert(`Vote revoked and count updated for ${voterRoll}!`);
                
                loadVoterRecords();
                loadTokens();
                loadCandidates();
            });
        });
    }

    await loadSettings();
    await loadTokens();
    await loadCandidates();
    await loadVoterRecords();
});