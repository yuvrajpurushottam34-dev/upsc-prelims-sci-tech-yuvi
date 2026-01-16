/* ===============================
   CONFIG
================================ */

const BANK_URL = "sci_tech.json";

/* ===============================
   HELPERS
================================ */

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function loadBank() {
  const res = await fetch(BANK_URL);
  if (!res.ok) throw new Error("Failed to load question bank");
  return res.json();
}

function groupByYear(questions) {
  const map = {};
  questions.forEach(q => {
    if (!map[q.year]) map[q.year] = [];
    map[q.year].push(q);
  });
  return map;
}

function getStateKey(year) {
  return `upsc_scitech_${year}`;
}

function defaultState(group) {
  return {
    index: 0,
    answers: Array(group.length).fill(null),
    score: null
  };
}

function loadState(year, group) {
  const raw = localStorage.getItem(getStateKey(year));
  if (!raw) return defaultState(group);

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.answers)) return defaultState(group);
    return parsed;
  } catch {
    return defaultState(group);
  }
}

function saveState(year, state) {
  localStorage.setItem(getStateKey(year), JSON.stringify(state));
}

function computeScore(group, answers) {
  let score = 0;
  group.forEach((q, i) => {
    if (answers[i] === q.answerIndex) score++;
  });
  return score;
}

/* ===============================
   HOME PAGE (index.html)
================================ */

async function initHome() {
  const bank = await loadBank();
  const questions = bank.questions || [];

  const yearMap = groupByYear(questions);
  const years = Object.keys(yearMap)
    .map(Number)
    .sort((a, b) => b - a); // latest first

  const meta = document.getElementById("meta");
  if (meta) {
    meta.textContent = `${questions.length} questions • ${years.length} years`;
  }

  const testsDiv = document.getElementById("tests");
  if (!testsDiv) return;

  testsDiv.innerHTML = "";

  years.forEach(year => {
    const count = yearMap[year].length;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div style="font-weight:700;">${year} – Science & Technology</div>
      <div class="small">${count} questions</div>
    `;

    card.onclick = () => {
      window.location.href = `test.html?year=${year}`;
    };

    testsDiv.appendChild(card);
  });
}

/* ===============================
   TEST PAGE (test.html)
================================ */

async function initTest() {
  const year = Number(qs("year"));
  if (!year) return;

  const bank = await loadBank();
  const questions = bank.questions || [];
  const group = questions.filter(q => q.year === year);

  if (group.length === 0) return;

  const crumb = document.getElementById("crumb");
  if (crumb) {
    crumb.textContent = `UPSC Prelims ${year} • Science & Technology • ${group.length} questions`;
  }

  let state = loadState(year, group);

  const questionEl = document.getElementById("question");
  const optionsEl = document.getElementById("options");
  const progressEl = document.getElementById("progress");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  function renderQuestion() {
    const q = group[state.index];
    progressEl.textContent = `Q ${state.index + 1} / ${group.length}`;
    questionEl.textContent = q.question;

    optionsEl.innerHTML = "";

    q.options.forEach((opt, idx) => {
      const label = document.createElement("label");
      label.className = "opt";
      label.innerHTML = `
        <input type="radio" name="opt" value="${idx}" ${state.answers[state.index] === idx ? "checked" : ""}>
        <span style="margin-left:8px;">${opt}</span>
      `;
      label.onclick = () => {
        state.answers[state.index] = idx;
        saveState(year, state);
        renderQuestion();
      };
      optionsEl.appendChild(label);
    });

    prevBtn.disabled = state.index === 0;
    nextBtn.textContent = state.index === group.length - 1 ? "Finish" : "Next";
  }

  prevBtn.onclick = () => {
    if (state.index > 0) {
      state.index--;
      saveState(year, state);
      renderQuestion();
    }
  };

  nextBtn.onclick = () => {
    if (state.index < group.length - 1) {
      state.index++;
      saveState(year, state);
      renderQuestion();
      return;
    }

    if (state.answers.includes(null)) {
      alert("Please answer all questions before finishing.");
      return;
    }

    state.score = computeScore(group, state.answers);
    saveState(year, state);

    showResult();
  };

  function showResult() {
    const stage = document.getElementById("stage");

    stage.innerHTML = `
      <h2>Test Completed</h2>
      <p>Score: ${state.score} / ${group.length}</p>
      <div style="margin-top:12px;">
        <button class="btn2" id="reviewBtn">Review Answers</button>
        <button class="btn2" onclick="location.href='index.html'">Back</button>
        <button class="btn" onclick="localStorage.removeItem('${getStateKey(year)}'); location.reload();">Retake</button>
      </div>
    `;

    document.getElementById("reviewBtn").onclick = () => {
      renderReview(stage, group, state.answers);
    };
  }

  renderQuestion();
}

/* ===============================
   REVIEW MODE
================================ */

function renderReview(stageEl, group, answers) {
  let html = `<h2>Answer Review</h2>`;

  group.forEach((q, i) => {
    html += `
      <div style="margin-bottom:16px; padding:12px; border:1px solid #2a2a31; border-radius:10px;">
        <strong>Q${i + 1}. ${q.question}</strong>
    `;

    q.options.forEach((opt, idx) => {
      let style = "";
      let tag = "";

      if (idx === q.answerIndex) {
        style = "background:#1b5e20;color:white;";
        tag = " (Correct)";
      }

      if (answers[i] === idx && answers[i] !== q.answerIndex) {
        style = "background:#7f1d1d;color:white;";
        tag = " (Your Answer)";
      }

      if (answers[i] === idx && answers[i] === q.answerIndex) {
        tag = " (Your Answer & Correct)";
      }

      html += `
        <div style="margin:4px 0;padding:6px 10px;border-radius:6px;${style}">
          ${opt}${tag}
        </div>
      `;
    });

    html += `</div>`;
  });

  stageEl.innerHTML = html;
}

/* ===============================
   BOOT
================================ */

(function boot() {
  if (document.getElementById("tests")) {
    initHome().catch(console.error);
  }
  if (document.getElementById("question")) {
    initTest().catch(console.error);
  }
})();
