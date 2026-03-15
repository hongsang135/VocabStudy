let vocabData = [];
let currentQuestionWord = null;

window.onload = () => {
    const saved = localStorage.getItem('vocab');
    if (saved) {
        try {
            vocabData = JSON.parse(saved);
            // Đảm bảo dữ liệu cũ tương thích với logic mới
            vocabData.forEach(v => {
                if (!v.LastDate) v.LastDate = new Date().toISOString();
                if (!v.Interval) v.Interval = "0"; // Giờ sẽ tính bằng phút
                if (!v['Cấp độ']) v['Cấp độ'] = "0";
                if (!v.STT) v.STT = Date.now().toString() + Math.random();
            });
            document.getElementById('csvTextArea').value = arrayToCSV(vocabData);
            updateStats();
            generateQuestion();
        } catch (e) {
            console.error("Lỗi nạp dữ liệu:", e);
        }
    } else {
        switchTab('data');
    }
};

// --- THUẬT TOÁN 5 CẤP ĐỘ (MOCHIMOCHI) ---
function updateWordMochi(idx, isCorrect) {
    let word = vocabData[idx];
    let lv = parseInt(word['Cấp độ'] || 0);

    if (isCorrect) {
        if (lv < 5) lv++; // Tối đa cấp độ 5
    } else {
        // Nếu sai, rớt về cấp 1 để học lại dồn dập
        lv = 1;
    }

    // Khoảng cách ôn tập (tính bằng PHÚT)
    let intervalMinutes = 0;
    switch (lv) {
        case 1: intervalMinutes = 5; break;       // Cấp 1: 5 phút sau
        case 2: intervalMinutes = 120; break;     // Cấp 2: 2 giờ sau
        case 3: intervalMinutes = 1440; break;    // Cấp 3: 24 giờ sau
        case 4: intervalMinutes = 4320; break;    // Cấp 4: 3 ngày sau
        case 5: intervalMinutes = 10080; break;   // Cấp 5: 7 ngày sau
        default: intervalMinutes = 0;
    }

    word['Cấp độ'] = lv.toString();
    word.Interval = intervalMinutes.toString();
    word.LastDate = new Date().toISOString();
}

// Lọc từ đến hạn ôn tập (Thời điểm vàng)
function getDueWords() {
    const now = new Date().getTime();
    return vocabData.filter(v => {
        const lastTime = new Date(v.LastDate).getTime();
        const intervalMs = parseInt(v.Interval || 0) * 60 * 1000;
        return now >= (lastTime + intervalMs);
    });
}

function checkAnswer(selected, correct) {
    const isCorrect = (selected === correct);
    const feedback = document.getElementById('feedback');
    document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

    if (isCorrect) {
        feedback.innerText = "Chính xác! Từ đã được lên cấp.";
        feedback.className = 'correct';
    } else {
        feedback.innerText = `Chưa đúng! Đáp án: ${correct}`;
        feedback.className = 'wrong';
    }

    const idx = vocabData.findIndex(v => v.STT === currentQuestionWord.STT);
    if (idx !== -1) {
        updateWordMochi(idx, isCorrect); // Gọi hàm thuật toán ở đây
        saveToLocal();
        updateStats();
        document.getElementById('csvTextArea').value = arrayToCSV(vocabData);
    }
    document.getElementById('btn-next').style.display = 'inline-block';
}

// --- CÁC HÀM HỖ TRỢ GIAO DIỆN ---

function generateQuestion() {
    let dueWords = getDueWords();
    
    if (vocabData.length === 0) {
        document.getElementById('quiz-ui').style.display = 'none';
        document.getElementById('empty-ui').style.display = 'block';
        return;
    }

    document.getElementById('quiz-ui').style.display = 'block';
    document.getElementById('empty-ui').style.display = 'none';
    document.getElementById('feedback').className = '';
    document.getElementById('btn-next').style.display = 'none';

    if (dueWords.length === 0) {
        document.getElementById('q-meta').innerText = "✨ Đã hoàn thành từ vựng đến hạn. Đang ôn tập ngẫu nhiên...";
        currentQuestionWord = vocabData[Math.floor(Math.random() * vocabData.length)];
    } else {
        currentQuestionWord = dueWords[Math.floor(Math.random() * dueWords.length)];
        document.getElementById('q-meta').innerText = `Cấp độ: ${currentQuestionWord['Cấp độ']} | Đã đến thời điểm vàng!`;
    }

    const isEng = Math.random() > 0.5;
    const qText = isEng ? `"${currentQuestionWord['Tên đầy đủ']} (${currentQuestionWord['Thuật ngữ']})"` : `"${currentQuestionWord['Nghĩa tiếng Việt']}"`;
    document.getElementById('q-text').innerText = isEng ? `${qText} nghĩa là gì?` : `${qText} trong tiếng Anh là gì?`;

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

function updateStats() {
    let counts = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0};
    vocabData.forEach(v => {
        let lv = v['Cấp độ'] || 0;
        if(counts.hasOwnProperty(lv)) counts[lv]++;
    });
    
    document.getElementById('statsDisplay').innerHTML = 
        `<span style="color:#dc3545">L1: ${counts[1]}</span> | 
         <span style="color:#fd7e14">L2: ${counts[2]}</span> | 
         <span style="color:#ffc107">L3: ${counts[3]}</span> | 
         <span style="color:#28a745">L4: ${counts[4]}</span> | 
         <span style="color:#0056b3">L5: ${counts[5]}</span>`;
}

function switchTab(tab) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(`section-${tab}`).classList.add('active');
    document.getElementById(`nav-${tab}`).classList.add('active');
}

function importFromTextArea() {
    const text = document.getElementById('csvTextArea').value.trim();
    if (!text) return;
    const rows = text.split('\n');
    const headers = rows[0].split(',').map(h => h.trim());
    
    vocabData = rows.slice(1).filter(r => r.trim() !== "").map(row => {
        const values = row.split(',');
        let obj = {};
        headers.forEach((h, i) => obj[h] = values[i] ? values[i].trim() : "");
        return obj;
    });
    saveToLocal();
    updateStats();
    generateQuestion();
    alert("Dữ liệu đã sẵn sàng!");
}

function arrayToCSV(arr) {
    if (arr.length === 0) return "";
    const headers = ["STT", "Thuật ngữ", "Tên đầy đủ", "Nghĩa tiếng Việt", "Cấp độ", "Ghi chú", "LastDate", "Interval", "EF"];
    const rows = arr.map(obj => headers.map(h => obj[h] || "").join(","));
    return headers.join(",") + "\n" + rows.join("\n");
}

function saveToLocal() { localStorage.setItem('vocab', JSON.stringify(vocabData)); }

function exportToCSV() {
    const csv = arrayToCSV(vocabData);
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data_mochi.csv";
    a.click();
}

function addNewWord() {
    const term = document.getElementById('new-term').value.trim();
    const full = document.getElementById('new-full').value.trim();
    const mean = document.getElementById('new-mean').value.trim();
    const note = document.getElementById('new-note').value.trim();

    if (!term || !full || !mean) return alert("Vui lòng nhập đủ thông tin!");

    const newWord = {
        STT: Date.now().toString(),
        "Thuật ngữ": term, "Tên đầy đủ": full, "Nghĩa tiếng Việt": mean,
        "Cấp độ": "1", "Ghi chú": note,
        LastDate: new Date().toISOString(), Interval: "0", EF: "2.5"
    };

    vocabData.push(newWord);
    saveToLocal();
    updateStats();
    document.getElementById('csvTextArea').value = arrayToCSV(vocabData);
    alert("Đã thêm từ mới vào Cấp độ 1!");
    ["new-term", "new-full", "new-mean", "new-note"].forEach(id => document.getElementById(id).value = "");
}