import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const voterForm = document.getElementById('voter_form');
    const voterRollInput = document.getElementById('voter_roll');
    const voterNameInput = document.getElementById('voter_name');
    const voterTokenInput = document.getElementById('voter_token');
    const cr1Select = document.getElementById('cr1_select');
    const cr2Select = document.getElementById('cr2_select');
    const submitBtn = document.getElementById('submit_vote_btn');
    const statusMsg = document.getElementById('status_msg');

    function showStatus(text, isError = true) {
        if (!statusMsg) return;
        statusMsg.style.color = isError ? '#ff3b30' : '#34c759';
        statusMsg.textContent = text;
    }

    // 1. Check Election Live Status
    const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (!settings || !settings.is_live) {
        alert('Voting is currently closed or offline.');
        window.location.href = 'index.html';
        return;
    }

    // 2. Load Candidates Into Select Dropdowns
    async function loadCandidatesForVoting() {
        const { data: candidates, error } = await supabase
            .from('candidates')
            .select('id, name, roll_id')
            .order('name', { ascending: true });

        if (error) return console.error('Error fetching candidates:', error);

        cr1Select.innerHTML = '<option value="">Select Primary CR Choice</option>';
        cr2Select.innerHTML = '<option value="">Select Secondary CR Choice (Optional)</option>';

        candidates.forEach(c => {
            const opt1 = document.createElement('option');
            opt1.value = c.id;
            opt1.textContent = `${c.name} (${c.roll_id})`;
            cr1Select.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = c.id;
            opt2.textContent = `${c.name} (${c.roll_id})`;
            cr2Select.appendChild(opt2);
        });
    }

    await loadCandidatesForVoting();

    // Prevent selecting the same candidate in both dropdowns
    cr1Select?.addEventListener('change', () => {
        const val = cr1Select.value;
        Array.from(cr2Select.options).forEach(opt => opt.disabled = (opt.value && opt.value === val));
    });
    cr2Select?.addEventListener('change', () => {
        const val = cr2Select.value;
        Array.from(cr1Select.options).forEach(opt => opt.disabled = (opt.value && opt.value === val));
    });

    // 3. Vote Submission
    if (voterForm) {
        voterForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const voterRoll = voterRollInput.value.trim();
            const voterName = voterNameInput.value.trim();
            const voterToken = voterTokenInput ? voterTokenInput.value.trim() : '';
            const cr1CandidateId = cr1Select.value;
            const cr2CandidateId = cr2Select.value || null;

            if (!cr1CandidateId) return showStatus('Please select at least one CR candidate.');
            if (!voterToken) return showStatus('Secret Voting Token is required!');

            submitBtn.disabled = true;
            submitBtn.innerText = 'Verifying Token & Submitting...';
            showStatus('Processing your vote...', false);

            try {
                // Step A: Token Verification
                const { data: tokenData, error: tokenErr } = await supabase
                    .from('tokens')
                    .select('*')
                    .eq('student_id', voterRoll)
                    .eq('token', voterToken)
                    .maybeSingle();

                if (tokenErr || !tokenData) {
                    throw new Error('Invalid Token or Student ID match!');
                }

                if (tokenData.is_used) {
                    throw new Error('This token has already been used to cast a vote!');
                }

                // Step B: Double Vote Check
                const { data: existingVote } = await supabase
                    .from('votes')
                    .select('id')
                    .eq('voter_id', voterRoll)
                    .maybeSingle();

                if (existingVote) {
                    throw new Error('Vote already registered for this Student ID.');
                }

                // Step C: Save Vote Record
                const { error: voteErr } = await supabase
                    .from('votes')
                    .insert([{
                        voter_id: voterRoll,
                        voter_name: voterName,
                        cr1_candidate_id: cr1CandidateId,
                        cr2_candidate_id: cr2CandidateId,
                        submitted_at: new Date().toISOString()
                    }]);

                if (voteErr) throw new Error(voteErr.message);

                // Step D: Increment Candidate Votes
                const { data: cand1 } = await supabase.from('candidates').select('vote_count').eq('id', cr1CandidateId).single();
                await supabase.from('candidates').update({ vote_count: (cand1?.vote_count || 0) + 1 }).eq('id', cr1CandidateId);

                if (cr2CandidateId) {
                    const { data: cand2 } = await supabase.from('candidates').select('vote_count').eq('id', cr2CandidateId).single();
                    await supabase.from('candidates').update({ vote_count: (cand2?.vote_count || 0) + 1 }).eq('id', cr2CandidateId);
                }

                // Step E: Mark Token as Used
                await supabase.from('tokens').update({ is_used: true }).eq('id', tokenData.id);

                showStatus('Vote submitted successfully! Redirecting...', false);
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);

            } catch (err) {
                showStatus(err.message, true);
                submitBtn.disabled = false;
                submitBtn.innerText = 'Submit Vote';
            }
        });
    }
});