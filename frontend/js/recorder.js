// js/recorder-v4-final-timer.js → BẢN HOÀN CHỈNH V4 + TIMER 10s + 5s WAITING + AUTO NEXT
let recorder, stream, recordedBlob = null;
const video = document.getElementById('videoPreview');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const nextBtn = document.getElementById('nextBtn');
const finishBtn = document.getElementById('finishBtn');
const retryBtn = document.getElementById('retryBtn');
const status = document.getElementById('status');
const uploadStatus = document.getElementById('uploadStatus');
const countdownEl = document.getElementById('countdown');

let questions = [], currentIdx = 0;
const token = sessionStorage.getItem('token');
const userName = sessionStorage.getItem('userName');
let folder = sessionStorage.getItem('folder');
const MAX_SIZE = 200 * 1024 * 1024; // 200MB

if (!token || !userName || !folder) {
  alert('Accessing error!');
  location.href = 'index.html';
}

// ===================== UTILITY FUNCTIONS =====================
function formatTime(sec) {
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ===================== TIMER SYSTEM (10s + 5s AUTO) =====================
let timerInterval, waitInterval;

function startAnswerCountdown() {
  clearInterval(timerInterval);
  clearInterval(waitInterval);
  
  let timeLeft = 60; // ✅ 10 GIÂY CHO MỖI CÂU HỎI
  countdownEl.innerText = formatTime(timeLeft);
  countdownEl.className = 'countdown text-danger fw-bold fs-1';
  
  timerInterval = setInterval(() => {
    timeLeft--;
    countdownEl.innerText = formatTime(timeLeft);
    
    // ✅ THAY ĐỔI MÀU KHI CÒN 3 GIÂY
    if (timeLeft <= 3) {
      countdownEl.className = 'countdown text-danger fw-bold fs-1 animate-pulse';
    }
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      autoStopRecording();
    }
  }, 1000);
}

function autoStopRecording() {
  try {
    stopBtn.click();
  } catch {}
  startWaitingPeriod();
}

function startWaitingPeriod() {
  clearInterval(waitInterval);
  let waitLeft = 5; // ✅ 5 GIÂY CHỜ
  countdownEl.innerText = `Next: ${formatTime(waitLeft)}`;
  countdownEl.className = 'countdown text-warning fw-bold fs-1';
  
  waitInterval = setInterval(() => {
    waitLeft--;
    countdownEl.innerText = `Next: ${formatTime(waitLeft)}`;
    
    if (waitLeft <= 0) {
      clearInterval(waitInterval);
      autoNextQuestion();
    }
  }, 1000);
}

function autoNextQuestion() {
  if (!nextBtn.classList.contains("d-none")) {
    nextBtn.click();
  } else if (finishBtn) {
    finishBtn.click();
  }
}

// ===================== LOAD QUESTIONS =====================
fetch('data/questions.json')
  .then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  .then(q => {
    questions = q;
    document.getElementById('totalQ').textContent = questions.length;
    updateProgress();
    showQuestion(0);
  })
  .catch(err => {
    console.error('Load questions error:', err);
    status.innerHTML = '<small class="text-danger">Unable to access questions!</small>';
  });

// ===================== PROGRESS =====================
function updateProgress() {
  const percent = ((currentIdx + 1) / questions.length) * 100;
  document.getElementById('progressBar').style.width = percent + '%';
  document.getElementById('progressBar').textContent = `${currentIdx + 1}/${questions.length}`;
}

// ===================== SHOW QUESTION =====================
function showQuestion(idx) {
  currentIdx = idx;
  document.getElementById('questionText').innerHTML = questions[idx];
  document.getElementById('currentQ').textContent = idx + 1;
  updateProgress();

  status.innerHTML = '<small class="text-success">Get ready – Press Start Recording</small>';
  uploadStatus.innerHTML = '';
  countdownEl.innerText = '01:00'; // ✅ RESET COUNTDOWN
  countdownEl.className = 'countdown text-success fw-bold fs-1';

  startBtn.classList.remove('d-none');
  stopBtn.classList.add('d-none');
  nextBtn.classList.add('d-none');
  if (finishBtn) finishBtn.classList.add('d-none');
  if (retryBtn) retryBtn.classList.add('d-none');
  recordedBlob = null;
  if (video) video.srcObject = null;
}

// ===================== RECORDING =====================
startBtn.onclick = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    video.srcObject = stream;

    const chunks = [];
    recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      recordedBlob = new Blob(chunks, { type: 'video/webm' });
      stream.getTracks().forEach(t => t.stop());
      video.srcObject = null;
      clearInterval(timerInterval);

      if (recordedBlob.size > MAX_SIZE) {
        status.innerHTML = '<small class="text-danger">Video size too big (>200MB)! Reduce recording time or video quality!.</small>';
        startBtn.classList.remove('d-none');
        stopBtn.classList.add('d-none');
        nextBtn.classList.add('d-none');
        recordedBlob = null;
        return;
      }

      status.innerHTML = '<small class="text-success">Record success - press Next to continue</small>';
      stopBtn.classList.add('d-none');
      nextBtn.classList.remove('d-none');
      
      if (currentIdx === questions.length - 1 && finishBtn) {
        finishBtn.classList.remove('d-none');
        nextBtn.textContent = "Upload & Finish";
      }

      startWaitingPeriod(); // ✅ TỰ ĐỘNG BẮT ĐẦU 5s WAITING
    };

    recorder.start();
    startBtn.classList.add('d-none');
    stopBtn.classList.remove('d-none');
    status.innerHTML = '<small class="text-warning">Recording… (60s Stop automatically)</small>';
    
    // ✅ BẮT ĐẦU COUNTDOWN 10 GIÂY
    startAnswerCountdown();

  } catch (err) {
    console.error('Media error:', err);
    status.innerHTML = '<small class="text-danger">Can not access camera/mic. Press F5 → Allow!</small>';
  }
};

stopBtn.onclick = () => {
  if (recorder && recorder.state === 'recording') recorder.stop();
};

// ===================== UPLOAD =====================
nextBtn.onclick = () => { 
  if (recordedBlob) uploadVideo(recordedBlob); 
};

if (finishBtn) {
  finishBtn.onclick = () => { 
    if (recordedBlob) uploadVideo(recordedBlob); 
  };
}

async function uploadVideo(blob, attempt = 1) {
  uploadStatus.innerHTML = `<div class="alert alert-info">Uploading questions ${currentIdx+1}… (lần ${attempt})</div>`;
  nextBtn.disabled = true;

  const form = new FormData();
  form.append('token', token);
  form.append('folder', folder);
  form.append('questionIndex', currentIdx);
  form.append('video', blob, `Q${currentIdx+1}.webm`);

  try {
    const res = await fetch('Backend/api/upload-one.php', { method: 'POST', body: form });

    if (res.ok) {
      const json = await res.json();
      uploadStatus.innerHTML = `<div class="alert alert-success">Upload success ${json.savedAs}</div>`;

      if (currentIdx === questions.length - 1) {
        setTimeout(() => {
          uploadStatus.innerHTML = `<div class="alert alert-success fs-2">Interview finished!<br>Thanks for participated ❤️</div>`;
        }, 1000);
      } else {
        currentIdx++;
        showQuestion(currentIdx);
      }
    } else throw new Error('Server error');
  } catch (e) {
    console.error('Upload error:', e);
    if (attempt <= 3) {
      const delay = 1000 * attempt;
      uploadStatus.innerHTML += `<br><small class="text-warning">Thử lại sau ${delay/1000}s…</small>`;
      setTimeout(() => uploadVideo(blob, attempt + 1), delay);
    } else {
      uploadStatus.innerHTML = `<div class="alert alert-danger">Upload failed after 3 times.</div>`;
      if (retryBtn) {
        retryBtn.classList.remove('d-none');
        retryBtn.onclick = () => { 
          retryBtn.classList.add('d-none'); 
          uploadVideo(blob); 
        };
      }
    }
  } finally {
    nextBtn.disabled = false;
  }
}