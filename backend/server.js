const BACKEND_URL = "https://vidhiora-5m6s.onrender.com"; 
    const socket = io(BACKEND_URL);
    // BUG FIX: Added currentUser = null here
    let userRole = 'guest', currentQuiz = null, facultyCodeUsed = '', currentUser = null;
    
    // Deletion state variables
    let pendingDeleteType = null;
    let pendingDeleteId = null;

    // Toast logic
    let toastTimer = null;
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast-notification');
      const msg = document.getElementById('toast-message');
      const icon = document.getElementById('toast-icon');

      msg.innerText = message;
      
      if (type === 'success') {
        icon.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400"></i>';
      } else if (type === 'warning') {
        icon.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-400"></i>';
      } else {
        icon.innerHTML = '<i class="fa-solid fa-circle-xmark text-rose-400"></i>';
      }

      toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');

      if (toastTimer) clearTimeout(toastTimer);

      toastTimer = setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
      }, 3500);
    }

    function nav(pageId) {
      if(pageId === 'admin' && userRole !== 'faculty') return openAuthModal('faculty');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(pageId).classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function toggleMobileMenu() { document.getElementById('mobile-menu').classList.toggle('open'); }
    
    function openAuthModal(defaultTab = 'student') {
      const modal = document.getElementById('auth-modal'); modal.classList.remove('hidden');
      setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('auth-modal-content').classList.remove('scale-95'); }, 10);
      switchAuthTab(defaultTab);
    }
    
    function closeAuthModal() {
      document.getElementById('auth-modal').classList.add('opacity-0'); document.getElementById('auth-modal-content').classList.add('scale-95');
      setTimeout(() => document.getElementById('auth-modal').classList.add('hidden'), 300);
    }

    function switchAuthTab(tab) {
      const viewS = document.getElementById('auth-student-view'), viewF = document.getElementById('auth-faculty-view');
      const btnS = document.getElementById('tab-student'), btnF = document.getElementById('tab-faculty');
      if(tab === 'student') {
        btnS.className = "flex-1 py-4 font-bold text-sm text-slate-900 border-b-2 border-amber-500 bg-amber-50/30"; btnF.className = "flex-1 py-4 font-bold text-sm text-slate-400 border-b-2 border-transparent bg-slate-50";
        viewS.classList.remove('hidden'); viewF.classList.add('hidden');
      } else {
        btnF.className = "flex-1 py-4 font-bold text-sm text-slate-900 border-b-2 border-slate-900 bg-slate-100/50"; btnS.className = "flex-1 py-4 font-bold text-sm text-slate-400 border-b-2 border-transparent bg-slate-50";
        viewF.classList.remove('hidden'); viewS.classList.add('hidden');
      }
    }

    // Custom Confirm Modal Logic
    function showConfirmModal(type, id) {
      if (userRole !== 'faculty') {
        showToast("Unauthorized access.", "error");
        return;
      }
      pendingDeleteType = type;
      pendingDeleteId = id;
      
      const modal = document.getElementById('confirm-modal');
      modal.classList.remove('hidden');
      setTimeout(() => { 
        modal.classList.remove('opacity-0'); 
        document.getElementById('confirm-modal-content').classList.remove('scale-95'); 
      }, 10);
    }

    function closeConfirmModal() {
      const modal = document.getElementById('confirm-modal');
      modal.classList.add('opacity-0'); 
      document.getElementById('confirm-modal-content').classList.add('scale-95');
      setTimeout(() => { 
        modal.classList.add('hidden');
        pendingDeleteType = null;
        pendingDeleteId = null;
      }, 300);
    }

    function parseJwt(token) { return JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
    
    function handleGoogleLogin(response) {
      const data = parseJwt(response.credential);
      // BUG FIX: Saving the user data globally when they sign in
      currentUser = data; 
      userRole = 'student'; 
      updateUI(data.name, data.picture); 
      closeAuthModal(); 
      loadData();
    }
    
    function handleFacultyLogin() {
      const code = document.getElementById('faculty-code-input').value.trim();
      if(!code) {
        showToast("Enter code", "warning");
        return;
      }
      userRole = 'faculty'; facultyCodeUsed = code; updateUI("Faculty Admin", null); document.getElementById('role-badge').classList.remove('hidden');
      closeAuthModal(); nav('admin'); loadData();
    }
    
    function updateUI(name, imgUrl) {
      document.getElementById('desktop-auth').classList.add('hidden'); document.getElementById('desktop-profile').classList.remove('hidden');
      document.getElementById('user-name').innerText = name;
      if(imgUrl) { document.getElementById('user-avatar').src = imgUrl; document.getElementById('user-avatar').classList.remove('hidden'); }
      document.getElementById('mobile-auth-btn').classList.add('hidden'); document.getElementById('mobile-profile').classList.remove('hidden');
      document.getElementById('mobile-user-name').innerText = name;
      document.getElementById('webinar-lock').style.display = 'none'; document.getElementById('webinar-content').classList.remove('hidden');
      document.getElementById('quiz-lock').style.display = 'none'; document.getElementById('quiz-content').classList.remove('hidden');
    }
    
    function logout() {
      userRole = 'guest'; 
      facultyCodeUsed = '';
      // BUG FIX: Clearing the user data on logout
      currentUser = null; 
      
      document.getElementById('desktop-auth').classList.remove('hidden'); document.getElementById('desktop-profile').classList.add('hidden');
      document.getElementById('role-badge').classList.add('hidden'); document.getElementById('user-avatar').classList.add('hidden');
      document.getElementById('mobile-auth-btn').classList.remove('hidden'); document.getElementById('mobile-profile').classList.add('hidden');
      document.getElementById('webinar-lock').style.display = 'block'; document.getElementById('webinar-content').classList.add('hidden');
      document.getElementById('quiz-lock').style.display = 'block'; document.getElementById('quiz-content').classList.add('hidden');
      nav('home'); loadData();
    }

    async function loadData() {
      try {
        const [cases, blogs, notes, jobs, webinars, announcements, qa] = await Promise.all([
          fetch(`${BACKEND_URL}/api/cases`).then(r=>r.json()), fetch(`${BACKEND_URL}/api/blogs`).then(r=>r.json()), fetch(`${BACKEND_URL}/api/notes`).then(r=>r.json()),
          fetch(`${BACKEND_URL}/api/jobs`).then(r=>r.json()), fetch(`${BACKEND_URL}/api/webinars`).then(r=>r.json()), fetch(`${BACKEND_URL}/api/announcements`).then(r=>r.json()), fetch(`${BACKEND_URL}/api/qa`).then(r=>r.json())
        ]);

        const tickerString = announcements.map(a => `⭐ ${a.title} - ${a.meta} ⭐`).join(' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ');
        document.getElementById('announcement-ticker').innerHTML = tickerString || "Welcome to Vidhiora";
        
        document.getElementById('events-container').innerHTML = announcements.map(a => `<div class="border-b border-slate-200 pb-2 last:border-0 relative">
          <h4 class="font-bold text-sm text-slate-800 pr-6">${a.title}</h4><p class="text-[10px] text-amber-600 font-bold uppercase mt-0.5">${a.meta}</p><p class="text-xs text-slate-500 mt-1">${a.summary}</p></div>`).join('');

        document.getElementById('qa-container').innerHTML = qa.map(q => `<div class="glass-card p-6 border-l-4 border-navy relative">
          <h3 class="text-xl font-bold text-slate-900 mb-2">Q: ${q.title}</h3><div class="text-xs bg-slate-100 inline-block px-2 py-1 rounded text-slate-500 mb-3">${q.meta}</div><p class="text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100"><strong>Answer:</strong> ${q.summary}</p></div>`).join('');

        document.getElementById('cases-container').innerHTML = cases.map(c => `<div class="glass-card p-6 border-l-4 border-l-slate-800 relative">
          <h3 class="text-xl font-serif font-bold text-slate-900 mb-2">${c.title}</h3><p class="text-[11px] font-bold text-slate-600 bg-slate-100 inline-block px-2 py-1 rounded uppercase mb-2"><i class="fa-solid fa-building-columns mr-1"></i> ${c.court}</p><p class="text-slate-600 text-sm">${c.summary}</p></div>`).join('');
        
        document.getElementById('blogs-container').innerHTML = blogs.map(b => `<div class="glass-card p-5 border-t-4 border-t-blue-800 flex flex-col h-full relative">
          <span class="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-1 rounded uppercase self-start">Article</span><h3 class="text-lg font-serif font-bold text-slate-900 mt-3 mb-1 line-clamp-2">${b.title}</h3><p class="text-xs text-slate-400 mb-3">By <span class="text-slate-700">${b.author}</span></p><p class="text-slate-600 text-sm line-clamp-3 mt-auto">${b.summary}</p></div>`).join('');
        
        document.getElementById('notes-container').innerHTML = notes.map(n => `<div class="bg-white border border-slate-100 p-3 rounded-lg flex justify-between items-center hover:shadow-md transition cursor-pointer relative">
          <div><h3 class="font-bold text-slate-800 text-sm">${n.title}</h3><p class="text-[10px] text-slate-500 mt-1">${n.uploadedBy} | ${n.subject}</p></div><i class="fa-solid fa-download text-slate-300"></i></div>`).join('');
        
        document.getElementById('jobs-container').innerHTML = jobs.map(j => `<div class="glass-card p-6 flex flex-col h-full border-t-4 border-t-emerald-500 relative">
          <span class="bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2 py-1 rounded self-start uppercase">${j.type}</span><h3 class="text-xl font-serif font-bold text-slate-900 mb-1 mt-3">${j.title}</h3><p class="text-slate-500 text-sm mb-4"><i class="fa-solid fa-building mr-1"></i>${j.company}</p><div class="mt-auto border-t border-slate-100 pt-4 flex justify-between items-center"><span class="font-bold text-slate-800">${j.salary}</span><button class="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold">Apply</button></div></div>`).join('');
        
        document.getElementById('webinar-grid').innerHTML = webinars.map(w => `<div class="glass-card overflow-hidden relative border border-slate-100">
          <div class="bg-slate-800 h-32 flex items-center justify-center relative"><i class="fa-solid fa-play text-4xl text-white/30"></i><div class="absolute top-2 right-2 bg-slate-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase">RECORDED</div></div><div class="p-5"><h3 class="font-serif font-bold text-lg text-slate-900 mb-1">${w.title}</h3><p class="text-slate-500 text-sm mb-4"><i class="fa-solid fa-microphone-lines mr-1"></i>${w.speaker}</p><button class="w-full bg-slate-100 text-slate-900 font-bold py-2 rounded-lg text-sm hover:bg-slate-200">Watch Replay</button></div></div>`).join('');

        // Populate Central Admin Deletion Table
        if (userRole === 'faculty') {
          let allRows = '';
          const formatRows = (items, typeName) => items.map(item => `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
              <td class="py-3 px-4 font-bold text-xs uppercase text-slate-500">${typeName}</td>
              <td class="py-3 px-4 font-medium text-slate-800">${item.title || item.subject}</td>
              <td class="py-3 px-4">
                <button onclick="showConfirmModal('${typeName}', ${item.id})" class="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1 w-max">
                  <i class="fa-solid fa-trash"></i> Delete
                </button>
              </td>
            </tr>`).join('');

          allRows += formatRows(announcements, 'announcements');
          allRows += formatRows(qa, 'qa');
          allRows += formatRows(cases, 'cases');
          allRows += formatRows(blogs, 'blogs');
          allRows += formatRows(notes, 'notes');
          allRows += formatRows(jobs, 'jobs');
          allRows += formatRows(webinars, 'webinars');

          document.getElementById('admin-management-table').innerHTML = allRows || `<tr><td colspan="3" class="text-center py-6 text-slate-400">No content uploaded yet.</td></tr>`;
        }
      } catch (err) { console.log("Backend offline."); }
    }
    loadData();

    async function uploadContent() {
      if (userRole !== 'faculty') {
        showToast("Unauthorized", "error");
        return;
      }
      
      const type = document.getElementById('upload-type').value, title = document.getElementById('upload-title').value, meta = document.getElementById('upload-meta').value, desc = document.getElementById('upload-desc').value;
      
      if (!title || !desc || !meta) {
        showToast("Fill all fields.", "warning");
        return;
      }

      let data = { title: title, summary: desc };
      if (type === 'cases') { data.court = meta; } else if (type === 'blogs') { data.author = meta; } else if (type === 'notes') { data.uploadedBy = meta; data.subject = desc; } else if (type === 'jobs') { data.company = meta; data.salary = desc; data.type = "Full-Time"; } else if (type === 'webinars') { data.speaker = meta; data.date = desc; } else if (type === 'announcements' || type === 'qa') { data.meta = meta; }

      const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, data, code: facultyCodeUsed }) });
      
      if (res.ok) { 
        showToast("Published successfully.", "success"); 
        document.getElementById('upload-title').value = ''; 
        document.getElementById('upload-meta').value = ''; 
        document.getElementById('upload-desc').value = ''; 
        loadData(); 
      } else {
        showToast("Server Error.", "error");
      }
    }

    // New Delete execution fired from the Custom Confirm Modal
    async function executeDelete() {
      if (!pendingDeleteType || !pendingDeleteId) return;

      try {
        const res = await fetch(`${BACKEND_URL}/api/delete/${pendingDeleteType}/${pendingDeleteId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: facultyCodeUsed })
        });
        
        if (res.ok) {
          loadData(); 
          showToast("Content deleted.", "success");
        } else {
          const err = await res.json();
          showToast(`Error: ${err.error || "Failed to delete"}`, "error");
        }
      } catch (err) { 
        showToast("Server error. Check your connection.", "error"); 
      } finally {
        closeConfirmModal();
      }
    }

    function broadcastQuiz() {
      if (userRole !== 'faculty') return;
      const q = document.getElementById('q-text').value, o1 = document.getElementById('q-opt1').value, o2 = document.getElementById('q-opt2').value, ans = document.getElementById('q-ans').value;
      
      if (!q || !o1 || !o2 || !ans) {
        showToast("Fill all fields.", "warning");
        return;
      }
      
      socket.emit('faculty_start_quiz', { code: facultyCodeUsed, questionData: { question: q, options: [o1, o2], correctAnswer: ans } });
      showToast("Broadcast Sent.", "success"); 
      
      document.getElementById('q-text').value = ''; 
      document.getElementById('q-opt1').value = ''; 
      document.getElementById('q-opt2').value = ''; 
      document.getElementById('q-ans').value = '';
    }

    socket.on('student_receive_question', (q) => {
      currentQuiz = q; document.getElementById('waiting-msg').style.display = 'none'; document.getElementById('question-card').style.display = 'block'; document.getElementById('question-text').innerText = q.question;
      document.getElementById('options-container').innerHTML = q.options.map(opt => `<button class="w-full text-left p-4 border-2 border-slate-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 font-bold text-slate-700" onclick="submitAnswer('${opt}')">${opt}</button>`).join('');
    });
    
    socket.on('update_leaderboard', (list) => {
      document.getElementById('leaderboard').innerHTML = list.map((u, i) => `<div class="flex justify-between items-center py-2 border-b border-slate-800 last:border-0"><div class="flex items-center gap-2"><div class="${i < 3 ? 'text-amber-400' : 'text-slate-500'} font-bold">${i+1}</div><span class="font-bold text-sm">${u.name}</span></div><span class="font-bold text-amber-400">${u.score}</span></div>`).join('');
    });
    
    function submitAnswer(opt) {
      if (userRole !== 'student') return;
      
      // The bug is fixed: currentUser.email and currentUser.name will now correctly transmit to the server!
      socket.emit('student_submit_answer', { 
        email: currentUser.email, 
        name: currentUser.name, 
        points: opt === currentQuiz.correctAnswer ? 10 : 0 
      });
      
      document.getElementById('question-card').style.display = 'none'; 
      document.getElementById('waiting-msg').innerHTML = "<i class='fa-solid fa-circle-check text-emerald-500 text-5xl mb-4'></i><h3 class='font-serif text-2xl font-bold text-slate-800'>Answer Submitted</h3>"; 
      document.getElementById('waiting-msg').style.display = 'block';
    }