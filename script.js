const API_KEY = 'AIzaSyDeTK0P8wouQMW5kUyVU8HsU3Bp7ECtwHY';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const HISTORY_KEY = 'tireAnalysisHistory';

document.getElementById('imageInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            handleImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }
});

document.addEventListener('paste', function(e) {
    if (e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = function(e) {
                    handleImage(e.target.result);
                };
                reader.readAsDataURL(blob);
            }
        }
    }
});

document.getElementById('pasteBtn').addEventListener('click', function() {
    alert('Press Ctrl+V to paste an image');
});

function handleImage(base64Image) {
    const preview = document.getElementById('imagePreview');
    preview.style.display = 'block';
    preview.src = base64Image;

    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    loading.style.display = 'block';
    result.innerHTML = '';

    analyzeImage(base64Image).then(analysis => {
        loading.style.display = 'none';
        displayResults(analysis);
    });
}

async function analyzeImage(base64Image) {
    try {
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Analyze this tire image and provide a brief assessment with 3-4 key points about cracks, defects, or damage. Focus on critical findings only.Remember no headings only normal sentences",
                    }, {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image.split(',')[1]
                        }
                    }]
                }]
            })
        });

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error:', error);
        return 'Error analyzing image. Please try again.';
    }
}

function saveToHistory(imageData, analysis, confidence) {
    try {
        const history = getHistory();
        const historyItem = {
            id: Date.now(),
            date: new Date().toISOString(),
            image: imageData,
            analysis: analysis,
            confidence: confidence,
            verdict: getVerdict(confidence)
        };
        
        history.unshift(historyItem);
        
        // Keep only the 10 most recent items
        const trimmedHistory = history.slice(0, 10);
        
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
        updateHistoryDisplay();
    } catch (error) {
        console.error('Error saving to history:', error);
    }
}

function getHistory() {
    try {
        const history = localStorage.getItem(HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('Error getting history:', error);
        return [];
    }
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('historyList');
    const history = getHistory();
    
    if (!historyList) return;
    
    if (history.length === 0) {
        historyList.innerHTML = '<p class="no-history">No analysis history yet</p>';
        return;
    }
    
    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-date">${new Date(item.date).toLocaleString()}</div>
            <img src="${item.image}" alt="Analyzed tire" class="history-image">
            <div class="history-details">
                <div class="history-verdict ${getStatusClass(item.confidence)}">${item.verdict}</div>
                <p class="history-analysis">${item.analysis}</p>
            </div>
        </div>
    `).join('');
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
        localStorage.removeItem(HISTORY_KEY);
        updateHistoryDisplay();
    }
}

function displayResults(analysis) {
    const keyPoints = extractKeyPoints(analysis);
    const confidence = calculateConfidence(analysis);
    
    const result = document.getElementById('result');
    
    result.innerHTML = `
        <div class="analysis ${getStatusClass(confidence)}">
            ${keyPoints}
            <div class="verdict">Verdict: ${getVerdict(confidence)}</div>
            <button class="copy-btn" onclick="copyAnalysis(\`${analysis.replace(/`/g, '\\`')}\`)">Copy Analysis</button>
        </div>
    `;
    
    saveToHistory(document.getElementById('imagePreview').src, analysis, confidence);
}

function extractKeyPoints(analysis) {
    const points = analysis.split('.').filter(p => p.trim() && p.length > 10);
    return points.slice(0, 4).map(point => 
        `<p>• ${point.trim()}</p>`
    ).join('');
}

function calculateConfidence(analysis) {
    const text = analysis.toLowerCase();
    if (text.includes('excellent') || text.includes('perfect')) return 95;
    if (text.includes('good') || text.includes('minor')) return 85;
    if (text.includes('moderate') || text.includes('concerning')) return 60;
    if (text.includes('poor') || text.includes('serious') || text.includes('unsafe')) return 30;
    return 50;
}

function getStatusClass(confidence) {
    if (confidence >= 80) return 'status-good';
    if (confidence >= 50) return 'status-medium';
    return 'status-bad';
}

function getVerdict(confidence) {
    if (confidence >= 80) return 'Safe to Use';
    if (confidence >= 50) return 'Needs Inspection';
    return 'Immediate Replacement Required';
}

function copyAnalysis(text) {
    const decodedText =text.replace(/&quot;/g, '"')
                           .replace(/&#39;/g, "'")
                           .replace(/&lt;/g, '<')
                           .replace(/&gt;/g, '>')
                           .replace(/&amp;/g, '&');
                           
    navigator.clipboard.writeText(decodedText)
        .then(() => {
            const copyBtn = document.querySelector('.copy-btn');
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = 'Copy Analysis';
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy text. Please try again.');
        });
}

window.onload = function() {
    initializeHistoryPanel();
    updateHistoryDisplay();
};

function initializeHistoryPanel() {
    const toggleBtn = document.getElementById('toggleHistory');
    const closeBtn = document.getElementById('closeHistory');
    const panel = document.getElementById('historyPanel');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            panel.classList.add('open');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            panel.classList.remove('open');
        });
    }
}
