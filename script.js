let vocabData = [];
let currentQuestionWord = null;

// Tên khóa lưu trữ cục bộ
const LOCAL_STORAGE_KEY = 'my_personal_vocab';

window.onload = async () => {
    // 1. Tải dữ liệu từ máy lên trước để khởi động nhanh
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
        loadDataToApp(JSON.parse(saved));
    } else {
        // Nếu trắng máy thì tự động thử tải từ server
        await fetchFromCloudflare();
    }
};

function loadDataToApp(data) {
    vocabData = data;
    vocabData.forEach(v => {
        if (!v.LastDate) v.LastDate = new Date().toISOString();
        if (!v.Interval) v.Interval = "0";
        if (!v['Cấp độ']) v['Cấp độ'] = "0";
        // Tạo STT định danh duy nhất nếu chưa có
        if (!v.STT) v.STT = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    });
    
    const csvElement = document.getElementById('csvTextArea');
    if (csvElement) csvElement.value = arrayToCSV(vocabData);
    
    updateStats();
    generateQuestion();
}

// --- THUẬT TOÁN 5 CẤP ĐỘ MOCHIMOCHI ---
function updateWordMochi(idx, isCorrect) {
    let word = vocabData[idx];
    let lv = parseInt(word['Cấp độ'] || 0);

    if (isCorrect) {
        if (lv < 5) lv++; 
    } else {
        lv = 1; // Sai rớt về Level 1
    }

    let intervalMinutes = 0;
    switch (lv) {
        case 1: intervalMinutes = 5; break;
        case 2: intervalMinutes = 120; break;
        case 3: intervalMinutes = 1440; break;
        case 4: intervalMinutes = 4320; break;
        case 5: intervalMinutes = 10080; break;
        default: intervalMinutes = 0;
    }

    word['Cấp độ'] = lv.toString();
    word.Interval = intervalMinutes.toString();
    word.LastDate = new Date().toISOString();
}

// --- ĐỒNG BỘ CLOUDFLARE D1 ---
async function pushToCloudflare() {
    const password = prompt("Nhập mật khẩu đồng bộ:");
    if (!password) return;

    const csvContent = arrayToCSV(vocabData);
    
    try {
        const response = await fetch('/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: csvContent, password: password })
        });

        if (response.ok) {
            alert("✅ Đã lưu dữ liệu lên server!");
        } else {
            const msg = await response.text();
            alert("❌ Lỗi: " + msg);
        }
    } catch (e) {
        alert("❌ Lỗi kết nối API.");
    }
}

async function fetchFromCloudflare() {
    try {
        const response = await fetch('/api');
        if (!response.ok) return;
        const csvText = await response.text();
        
        if (csvText && csvText.trim() !== "") {
            importFromCSVText(csvText);
            console.log("Dữ liệu đã tải từ Cloudflare.");
        }
    } catch (e) {
        console.log("Không thể kết nối Database.");
    }
}

// --- QUẢN LÝ CÂU HỎI ---
function getDueWords() {
    const now = new Date().getTime();
    return vocabData.filter(v => {
        const lastTime = new Date(v.LastDate).getTime();
        const intervalMs = parseInt(v.Interval || 0) * 60 * 1000;
        return now >= (lastTime + intervalMs);
    });
}

function generateQuestion() {
    let dueWords = getDueWords();
    if (vocabData.length === 0) {
        switchTab('data');
        return;
    }

    document.getElementById('quiz-ui').style.display = 'block';
    document.getElementById('feedback').className = '';
    document.getElementById('btn-next').style.display = 'none';

    if (dueWords.length === 0) {
        document.getElementById('q-meta').innerText = "✨ Đang ôn tập ngẫu nhiên...";
        currentQuestionWord = vocabData[Math.floor(Math.random() * vocabData.length)];
    } else {
        currentQuestionWord = dueWords[Math.floor(Math.random() * dueWords.length)];
        document.getElementById('q-meta').innerText = `Cấp độ: ${currentQuestionWord['Cấp độ']}`;
    }

    const isEng = Math.random() > 0.5;
    const qText = isEng ? currentQuestionWord['Tên đầy đủ'] : currentQuestionWord['Nghĩa tiếng Việt'];
    document.getElementById('q-text').innerText = qText;

    const correct = isEng ? currentQuestionWord['Nghĩa tiếng Việt'] : `${currentQuestionWord['Tên đầy đủ']} (${currentQuestionWord['Thuật ngữ']})`;
    
    let options = [correct];
    while (options.length < 4) {
        let rand = vocabData[Math.floor(Math.random() * vocabData.length)];
        let opt = isEng ? rand['Nghĩa tiếng Việt'] : `${rand['Tên đầy đủ']} (${rand['Thuật ngữ']})`;
        if (!options.includes(opt)) options.push(opt);
    }
    options.sort(() => Math.random() - 0.5);

    const container = document.getElementById('q-options');
    container.innerHTML = '';
    options.forEach(o => {
        const b = document.createElement('button');
        b.className = 'option-btn';
        b.innerText = o;
        b.onclick = () => checkAnswer(o, correct);
        container.appendChild(b);
    });
}

function checkAnswer(selected, correct) {
    const isCorrect = (selected === correct);
    const feedback = document.getElementById('feedback');
    
    feedback.innerText = isCorrect ? "Chính xác!" : `Sai rồi! Đáp án: ${correct}`;
    feedback.className = isCorrect ? 'correct' : 'wrong';

    const idx = vocabData.findIndex(v => v.STT === currentQuestionWord.STT);
    if (idx !== -1) {
        updateWordMochi(idx, isCorrect);
        saveToLocal();
        updateStats();
    }
    document.getElementById('btn-next').style.display = 'inline-block';
}

// --- TIỆN ÍCH ---
function saveToLocal() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(vocabData));
}

function updateStats() {
    let counts = {1:0, 2:0, 3:0, 4:0, 5:0};
    vocabData.forEach(v => {
        let lv = v['Cấp độ'] || 1;
        if(counts[lv] !== undefined) counts[lv]++;
    });
    document.getElementById('statsDisplay').innerHTML = 
        `L1: ${counts[1]} | L2: ${counts[2]} | L3: ${counts[3]} | L4: ${counts[4]} | L5: ${counts[5]}`;
}

function arrayToCSV(arr) {
    const headers = ["STT", "Thuật ngữ", "Tên đầy đủ", "Nghĩa tiếng Việt", "Cấp độ", "Ghi chú", "LastDate", "Interval", "EF"];
    const rows = arr.map(obj => headers.map(h => obj[h] || "").join(","));
    return [headers.join(","), ...rows].join("\n");
}

function importFromCSVText(text) {
    if (!text) return;
    const rows = text.trim().split('\n');
    const headers = rows[0].split(',').map(h => h.trim());
    const data = rows.slice(1).map(row => {
        const values = row.split(',');
        let obj = {};
        headers.forEach((h, i) => obj[h] = values[i] ? values[i].trim() : "");
        return obj;
    });
    loadDataToApp(data);
}

function switchTab(tab) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${tab}`).classList.add('active');
}