document.addEventListener('DOMContentLoaded', () => {

  // ===== 畫面元素 =====
  const loginView = document.getElementById('loginView');
  const deptView = document.getElementById('deptView');
  const playerView = document.getElementById('playerView');

  // ===== 登入 =====
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const backToLogin = document.getElementById('backToLogin');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('loginError');

  // ===== 註冊 =====
  const showRegisterBtn = document.getElementById('showRegisterBtn');
  const registerView = document.getElementById('registerView');
  const registerBtn = document.getElementById('registerBtn');
  const backToLoginFromRegister = document.getElementById('backToLoginFromRegister');
  const regUsernameInput = document.getElementById('regUsername');
  const regPasswordInput = document.getElementById('regPassword');
  const regPasswordConfirm = document.getElementById('regPasswordConfirm');
  const registerError = document.getElementById('registerError');

  // ===== 科別 =====
  const deptButtons = document.getElementById('deptButtons');
  const selectedDept = document.getElementById('selectedDept');
  const selectedUser = document.getElementById('selectedUser');

  // ===== 影片播放 =====
  const videoList = document.getElementById('videoList');
  const videoPlayer = document.getElementById('videoPlayer');
  const videoTitle = document.getElementById('videoTitle');
  const quizArea = document.getElementById('quizArea');
  const quizContent = document.getElementById('quizContent');
  const quizResult = document.getElementById('quizResult');
  const goToQuizMode = document.getElementById('goToQuizMode');

  let currentVideoName = '';
  let watchedVideos = new Set();
  let allVideos = [];
  let isQuizMode = false;

  // ==========================
  // 登入
  // ==========================
  loginBtn.addEventListener('click', () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value;

    loginError.classList.add('hidden');
    loginError.textContent = '';

    if (!user || !pass) {
      loginError.textContent = '請輸入使用者名稱與密碼';
      loginError.classList.remove('hidden');
      return;
    }

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    })
    .then(r => r.json().then(b => ({ status: r.status, body: b })))
    .then(({ status, body }) => {
      if (status === 200 && body.ok) {
        selectedUser.textContent = body.name || user;
        loginView.classList.add('hidden');
        deptView.classList.remove('hidden');
      } else {
        loginError.textContent = body.message || '登入失敗';
        loginError.classList.remove('hidden');
      }
    })
    .catch(() => {
      loginError.textContent = '無法連線到伺服器';
      loginError.classList.remove('hidden');
    });
  });

  // ==========================
  // 註冊
  // ==========================
  showRegisterBtn.addEventListener('click', () => {
    loginView.classList.add('hidden');
    registerView.classList.remove('hidden');
  });
  backToLoginFromRegister.addEventListener('click', () => {
    registerView.classList.add('hidden');
    loginView.classList.remove('hidden');
  });
  registerBtn.addEventListener('click', () => {
    const user = regUsernameInput.value.trim();
    const pass = regPasswordInput.value;
    const pass2 = regPasswordConfirm.value;

    registerError.classList.add('hidden');
    registerError.textContent = '';

    if (!user || !pass) {
      registerError.textContent = '請輸入使用者名稱與密碼';
      registerError.classList.remove('hidden');
      return;
    }
    if (pass !== pass2) {
      registerError.textContent = '兩次密碼不一致';
      registerError.classList.remove('hidden');
      return;
    }

    fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
        usernameInput.value = user;
      } else {
        registerError.textContent = data.message || '註冊失敗';
        registerError.classList.remove('hidden');
      }
    });
  });

  // ==========================
  // 選科別 → 影片模式
  // ==========================
  deptButtons.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const dept = btn.dataset.dept;
  selectedDept.textContent = dept;
  deptView.classList.add('hidden');
  playerView.classList.remove('hidden');

  isQuizMode = false;
  watchedVideos.clear();
  allVideos = [];
  goToQuizMode.classList.add('hidden');

  // 依科別抓影片
  fetch('/api/videos?dept=' + encodeURIComponent(dept))
    .then(r => r.json())
    .then(list => {
      allVideos = list;
      renderVideoList(list);
      if(list.length > 0) playVideo(list[0]);
    });
});

function fetchVideos2(dept) {
  fetch('/api/videos2?dept=' + encodeURIComponent(dept))
    .then(r => r.json())
    .then(list => {
      allVideos = list;
      renderVideoList(list);
      if(list.length > 0) {
        playVideo(list[0]);
        const firstLi = videoList.querySelector('li');
        if (firstLi) firstLi.classList.add('active');
      }
    });
}

  // ==========================
  // 取得影片列表
  // ==========================
  function fetchVideos(source = 'videos') {
  fetch('/api/' + source)
    .then(r => r.json())
    .then(list => {
      allVideos = list; // 更新全局影片列表
      renderVideoList(list); // 重新渲染影片列表
      // 預設播放第一支影片
      if(list.length > 0) {
        playVideo(list[0]);
        videoList.querySelector('li').classList.add('active');
      }
    });
}

  function renderVideoList(list) {
    videoList.innerHTML = '';
    list.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item.name.replace(/\.[^/.]+$/, '');
      li.addEventListener('click', () => {
        const prev = videoList.querySelector('li.active');
        if (prev) prev.classList.remove('active');
        li.classList.add('active');
        playVideo(item);
      });
      videoList.appendChild(li);
    });
  }

  function playVideo(item) {
    videoTitle.textContent = item.name.replace(/\.[^/.]+$/, '');
    videoPlayer.src = item.url;
    currentVideoName = item.name;
    videoPlayer.play();
  }

  // ==========================
  // 播完影片
  // ==========================
  videoPlayer.addEventListener('ended', () => {
    if (!currentVideoName) return;

    watchedVideos.add(currentVideoName);

    if (!isQuizMode) {
      // 純影片模式 → 全部播完才出現按鈕
      if (watchedVideos.size === allVideos.length) {
        goToQuizMode.classList.remove('hidden');
      }
    } else {
      // 測驗模式 → 播完影片直接產生題目
      // 顯示動畫文字
quizArea.classList.remove('hidden');

let dotCount = 0;
quizContent.textContent = '產生題目中';
const loadingInterval = setInterval(() => {
  dotCount = (dotCount + 1) % 4; // 0,1,2,3
  quizContent.textContent = '產生題目中' + '.'.repeat(dotCount);
}, 500); // 每 500ms 更新一次

// 請求題目
fetch('/api/quiz?video=' + encodeURIComponent(currentVideoName) + '&source=videos2')
  .then(r => r.json())
  .then(data => {
    clearInterval(loadingInterval); // 停止動畫
    renderQuiz(data);
  })
  .catch(() => {
    clearInterval(loadingInterval);
    quizContent.textContent = '無法產生題目';
  });
    }
  });

  // ==========================
  // 進入測驗模式
  // ==========================
  goToQuizMode.addEventListener('click', () => {
  isQuizMode = true;
  goToQuizMode.classList.add('hidden');

  quizArea.classList.add('hidden');
  quizContent.innerHTML = '';
  quizResult.classList.add('hidden');

  // 影片列表重新載入 → 這次抓 WHO2
  const dept = selectedDept.textContent;
  fetchVideos2(dept);
});

  // ==========================
  // 渲染測驗
  // ==========================
  function renderQuiz(data) {
  quizContent.innerHTML = '';
  quizResult.classList.add('hidden');

  if (!Array.isArray(data)) {
    quizContent.textContent = '題目產生錯誤';
    return;
  }

  const form = document.createElement('div');

  data.forEach((q, qi) => {
    const div = document.createElement('div');
    div.style.marginBottom = '12px';

    // 題目
    const qel = document.createElement('div');
    qel.innerHTML = `<strong>${qi + 1}. ${q.q}</strong>`;
    div.appendChild(qel);

    // 選項
    q.choices.forEach((c, ci) => {
      const label = document.createElement('label');
      label.style.display = 'block';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'q' + qi;
      radio.value = ci;
      label.appendChild(radio);
      label.appendChild(document.createTextNode(' ' + c));
      div.appendChild(label);
    });

    form.appendChild(div);
  });

  // 提交按鈕
  const submit = document.createElement('button');
  submit.textContent = '提交答案';
  submit.className = 'primary';
  submit.dataset.submitted = 'false';

  submit.addEventListener('click', () => {
    if (submit.dataset.submitted === 'true') {
      alert('這個影片的答案已經提交過了！');
      return;
    }

    if (!confirm('確定要提交答案嗎？提交後將不能再修改！')) return;

    let correct = 0;

    data.forEach((q, qi) => {
      const radios = form.querySelectorAll('input[name="q' + qi + '"]');
      const sel = form.querySelector('input[name="q' + qi + '"]:checked');

      // 先重置顏色
      radios.forEach(r => r.parentElement.style.color = 'black');

      // 標示正確答案
      radios.forEach(r => {
        if (Number(r.value) === q.answer) {
          r.parentElement.style.color = 'green';
        }
      });

      // 標示錯誤選擇
      if (sel && Number(sel.value) !== q.answer) {
        sel.parentElement.style.color = 'red';
      }

      if (sel && Number(sel.value) === q.answer) correct++;
    });

    quizResult.classList.remove('hidden');
    quizResult.textContent = `得分：${correct} / ${data.length}`;

    // 按鈕失效
    submit.dataset.submitted = 'true';
    submit.disabled = true;
    submit.style.opacity = 0.5;
    submit.style.cursor = 'not-allowed';
  });

  quizContent.appendChild(form);
  quizContent.appendChild(submit);
}

  // ==========================
  // 登出
  // ==========================
  logoutBtn.addEventListener('click', () => {
    playerView.classList.add('hidden');
    loginView.classList.remove('hidden');
    watchedVideos.clear();
    goToQuizMode.classList.add('hidden');
    videoPlayer.pause();
  });

});