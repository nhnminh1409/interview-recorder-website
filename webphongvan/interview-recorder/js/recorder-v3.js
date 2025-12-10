// RECORDER V7.0 – PHIÊN BẢN HOÀN HẢO CUỐI CÙNG (ĐÃ FIX HOÀN TOÀN)
let recorder, stream, recordedBlob = null;
const video = document.getElementById('videoPreview');
const stopBtn = document.getElementById('stopBtn');
const nextBtn = document.getElementById('nextBtn');
const retryBtn = document.getElementById('retryBtn');
const status = document.getElementById('status');
const uploadStatus = document.getElementById('uploadStatus');
const timerDisplay = document.getElementById('timerDisplay');

let questions = [], currentIdx = 0;
const token = sessionStorage.getItem('token');
const userName = sessionStorage.getItem('userName');
let folder = sessionStorage.getItem('folder');
const MAX_SIZE = 200 * 1024 * 1024;

const TIME_CONFIG = {
  QUESTION_PREPARE: 5,
  PREPARE_TIME: 3,
  RECORDING_TIME: 60,
  BREAK_TIME: 5
};

let timerId = null;
let currentCountdown = 0;
let currentPhase = '';

// ==================== NÚT "BẮT ĐẦU GHI NGAY" (từ câu 2) ====================
const skipPrepareBtn = document.createElement('div');
skipPrepareBtn.className = 'text-center mt-4';
skipPrepareBtn.innerHTML = `
  <button class="btn btn-primary btn-lg" style="min-width:340px;height:66px;font-size:1.4rem;font-weight:700;border-radius:22px;box-shadow:0 10px 30px rgba(0,0,0,0.2);">
    Bắt đầu ghi ngay
  </button>
`;
skipPrepareBtn.style.display = 'none';
skipPrepareBtn.onclick = () => {
  stopTimer();
  skipPrepareBtn.style.display = 'none';  // ← Dòng này làm nút biến mất ngay lập tức
  handlePrepareComplete(); // bắt đầu ghi ngay, không cần chờ
};
document.querySelector('#videoPreview').parentNode.appendChild(skipPrepareBtn);

// ==================== KHỞI TẠO ====================
(async () => {
  if (!token || !userName) {
    alert('Phiên làm việc không hợp lệ!');
    location.href = 'index.html';
    return;
  }

  if (!folder) {
    try {
      const resp = await fetch('api/session-start.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userName })
      });
      const data = await resp.json();
      if (data.ok) {
        folder = data.folder;
        sessionStorage.setItem('folder', folder);
      } else throw new Error();
    } catch (e) {
      alert('Không kết nối được server!');
      location.href = 'index.html';
      return;
    }
  }

  fetch('questions.json')
    .then(r => r.json())
    .then(q => {
      questions = q;
      document.getElementById('totalQ').textContent = questions.length;
      showQuestion(0);
    })
    .catch(() => alert('Không tải được questions.json'));
})();

// STOP TIMER
function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

// UPDATE TIMER
function updateTimer(seconds, phase) {
  if (!timerDisplay) return;
  const timeStr = `00:${seconds.toString().padStart(2, '0')}`;
  timerDisplay.innerHTML = `<span class="timer-text">${timeStr}</span>`;
  timerDisplay.className = `timer-circle timer-${phase.replace('_', '-')}`;
  timerDisplay.classList.remove('timer-danger', 'timer-warning');
  if (seconds <= 5) timerDisplay.classList.add('timer-danger');
  else if (seconds <= 10 && phase === 'recording') timerDisplay.classList.add('timer-warning');
}

// START COUNTDOWN
function startCountdown(seconds, phase, onComplete) {
  console.log(`START ${phase}: ${seconds}s`);
  stopTimer();
  currentPhase = phase;
  currentCountdown = seconds;
  updateTimer(seconds, phase);

  timerId = setInterval(() => {
    currentCountdown--;
    if (currentCountdown > 0) {
      updateTimer(currentCountdown, phase);
    } else {
      console.log(`${phase} COMPLETED`);
      stopTimer();
      updateTimer(0, phase);
      if (onComplete) onComplete();
    }
  }, 1000);
}

// TIMER HANDLERS
function handleQuestionPrepareComplete() {
  status.innerHTML = '<small class="text-primary">Chuẩn bị ghi (3s)...</small>';
  startCountdown(TIME_CONFIG.PREPARE_TIME, 'prepare', handlePrepareComplete);
}

function handlePrepareComplete() {
  console.log('START RECORDING');
  startRecording();
}

function handleRecordingComplete() {
  if (recorder?.state === 'recording') {
    recorder.stop();
  }
}

// ==================== BREAK SAU KHI GHI XONG ====================
function startBreak() {
  console.log('startBreak() – currentIdx:', currentIdx);

  if (currentIdx === 0) {
    // CÂU 1: Nghỉ 5s + hiện nút Next
    status.innerHTML = '<small class="text-info">Nghỉ 5 giây...</small>';
    nextBtn.classList.remove('d-none');
    nextBtn.disabled = false;
    nextBtn.textContent = (currentIdx === questions.length - 1) ? 'Upload & Finish' : 'Next →';

    startCountdown(TIME_CONFIG.BREAK_TIME, 'break', () => {
      if (nextBtn && !nextBtn.disabled) nextBtn.click();
    });
  } else {
    // TỪ CÂU 2: Nghỉ 5s BẮT BUỘC → 3s preview + nút skip
    status.innerHTML = '<small class="text-info">Nghỉ 5 giây...</small>';
    nextBtn.classList.add('d-none');
    nextBtn.disabled = true;
    skipPrepareBtn.style.display = 'none';

    startCountdown(TIME_CONFIG.BREAK_TIME, 'break', () => {
      status.innerHTML = '<small class="text-primary">Chuẩn bị ghi (3s)...<br><strong>Bạn có thể bấm nút để bắt đầu ngay</strong></small>';
      skipPrepareBtn.style.display = 'block';
      skipPrepareBtn.querySelector('button').disabled = false;
      skipPrepareBtn.querySelector('button').textContent = 'Bắt đầu ghi ngay';

      startCountdown(TIME_CONFIG.PREPARE_TIME, 'prepare', () => {
        skipPrepareBtn.style.display = 'none';
        handlePrepareComplete();
      });
    });
  }
}

// UPDATE PROGRESS
function updateProgress() {
  if (!questions.length) return;
  const percent = ((currentIdx + 1) / questions.length) * 100;
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
    progressBar.textContent = `${currentIdx + 1}/${questions.length}`;
  }
}

// ==================== SHOW QUESTION ====================
function showQuestion(idx) {
  console.log(`Question ${idx + 1}/${questions.length}`);
  currentIdx = idx;
  if (idx >= questions.length) return;

  document.getElementById('questionText').innerHTML = questions[idx];
  document.getElementById('currentQ').textContent = idx + 1;
  updateProgress();

  stopTimer();
  stopBtn.classList.add('d-none');
  nextBtn.classList.add('d-none');
  retryBtn?.classList.add('d-none');
  uploadStatus.innerHTML = '';
  recordedBlob = null;
  if (video) video.srcObject = null;
  skipPrepareBtn.style.display = 'none';

  if (currentIdx === 0) {
    status.innerHTML = '<small class="text-primary">Chuẩn bị câu hỏi...</small>';
    startCountdown(TIME_CONFIG.QUESTION_PREPARE, 'question_prepare', handleQuestionPrepareComplete);
  } else {
    status.innerHTML = '';
  }
}

// ==================== START RECORDING ====================
async function startRecording() {
  try {
    console.log('Starting camera...');
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 1280, height: 720 }, 
      audio: true 
    });
    video.srcObject = stream;
    video.style.transform = 'scaleX(-1)';
    video.style.transformOrigin = 'center center';

    const chunks = [];
    recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      console.log('Recording STOPPED');
      const now = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
      const safeName = userName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeName}_Q${String(currentIdx + 1).padStart(2, '0')}_${now}.webm`;
      recordedBlob = new Blob(chunks, { type: 'video/webm' });

      stream.getTracks().forEach(t => t.stop());
      video.srcObject = null;
      video.src = URL.createObjectURL(recordedBlob);
      video.style.transform = 'scaleX(-1)';

      if (recordedBlob.size > MAX_SIZE) {
        status.innerHTML = '<small class="text-danger">Video quá lớn (>200MB)! Hãy ghi ngắn lại.</small>';
        recordedBlob = null;
        setTimeout(() => showQuestion(currentIdx), 2000);
        return;
      }

      status.innerHTML = '<small class="text-success">Đã ghi xong!</small>';
      timerDisplay.innerHTML=''
      stopBtn.classList.add('d-none');
      
      // TỰ ĐỘNG UPLOAD NGAY SAU KHI GHI XONG
      uploadVideo(recordedBlob);
    };

    recorder.start();
    stopBtn.classList.remove('d-none');
    status.innerHTML = '<small class="text-warning">Đang ghi... </small>';
    startCountdown(TIME_CONFIG.RECORDING_TIME, 'recording', handleRecordingComplete);

  } catch (err) {
    console.error('Camera error:', err);
    status.innerHTML = '<small class="text-danger">Không mở được camera!</small>';
  }
}

// STOP BUTTON
stopBtn.onclick = () => {
  if (recorder?.state === 'recording') {
    console.log('Manual STOP');
    stopTimer();
    recorder.stop();
  }
};

// NEXT BUTTON
nextBtn.onclick = () => {
  console.log('NEXT CLICKED - Q' + (currentIdx + 1));
  stopTimer();
  nextBtn.disabled = true;
  if (recordedBlob) {
    uploadVideo(recordedBlob);
  } else {
    nextBtn.disabled = false;
  }
};

// ==================== UPLOAD VIDEO – GỌI startBreak() SAU KHI UPLOAD XONG ====================
async function uploadVideo(blob, attempt = 1) {
  console.log(`UPLOAD Q${currentIdx + 1}`);
  uploadStatus.innerHTML = `<div class="alert alert-info">Upload câu ${currentIdx+1}… (lần ${attempt})</div>`;

  const form = new FormData();
  form.append('token', token);
  form.append('folder', folder);
  form.append('questionIndex', currentIdx);
  form.append('video', blob, blob.name || `Q${currentIdx+1}.webm`);

  try {
    const res = await fetch('api/upload-one.php', { method: 'POST', body: form });
    if (!res.ok) throw new Error();
    const json = await res.json();
    console.log('SUCCESS:', json);
    uploadStatus.innerHTML = `<div class="alert alert-success">Upload thành công!</div>`;

    fetch('api/transcribe.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `folder=${folder}&questionIndex=${currentIdx}`
    }).catch(e => console.error('Transcribe error:', e));

    setTimeout(() => {
      if (currentIdx === questions.length - 1) {
        showCompletionMessage();
      } else {
        currentIdx++;
        showQuestion(currentIdx);
        // GỌI startBreak() SAU KHI ĐÃ HIỆN CÂU MỚI → ĐỒNG HỒ CHẠY ĐÚNG
        startBreak();
      }
      nextBtn.disabled = false;
    }, 2000);
  } catch (e) {
    console.error('ERROR:', e);
    if (attempt <= 3) {
      setTimeout(() => uploadVideo(blob, attempt + 1), 2000 * attempt);
    } else {
      uploadStatus.innerHTML = '<div class="alert alert-danger">Upload thất bại sau 3 lần!</div>';
      retryBtn.classList.remove('d-none');
      retryBtn.onclick = () => {
        retryBtn.classList.add('d-none');
        uploadVideo(blob, 1);
      };
      nextBtn.disabled = false;
    }
  }
}

// COMPLETION MESSAGE
function showCompletionMessage() {
  document.querySelector('.progress').style.display = 'none';
  document.querySelector('.question-box').style.display = 'none';
  video.parentElement.style.display = 'none';
  timerDisplay.parentElement.style.display = 'none';
  stopBtn.style.display = 'none';
  nextBtn.style.display = 'none';
  retryBtn.style.display = 'none';
  status.style.display = 'none';

  const card = document.querySelector('.interview-card');
  card.innerHTML = `
    <div class="text-center p-5">
      <h1 class="text-success mb-4">🎉 Cảm ơn bạn đã tham gia phỏng vấn!</h1>
      <p class="fs-5">Chúng tôi sẽ liên hệ lại với bạn sau khi xem xét câu trả lời.</p>
    </div>
  `;
}
