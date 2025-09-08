// 学習サポートアプリ - JavaScript

// メモリ内データストレージ（ページリロードで消える）
let appData = {
    schools: [{ name: '', date: '' }],
    todos: [],
    materials: { name: '', total: 0, current: 0 },
    images: [],
    notes: ''
};

// DOM要素の取得
const elements = {
    // 志望校関連
    schoolNameDisplay1: document.getElementById('schoolNameDisplay1'),
    daysRemaining1: document.getElementById('daysRemaining1'),
    editBtn1: document.getElementById('editBtn1'),
    inputArea1: document.getElementById('inputArea1'),
    schoolName1: document.getElementById('schoolName1'),
    examDate1: document.getElementById('examDate1'),
    saveBtn1: document.getElementById('saveBtn1'),

    // Todo関連
    todoInput: document.getElementById('todoInput'),
    addTodoBtn: document.getElementById('addTodoBtn'),
    todoList: document.getElementById('todoList'),

    // 教材進捗関連
    materialName: document.getElementById('materialName'),
    totalPages: document.getElementById('totalPages'),
    currentPage: document.getElementById('currentPage'),
    progressInfo: document.getElementById('progressInfo'),

    // 画像関連
    imageUpload: document.getElementById('imageUpload'),
    addImageBtn: document.getElementById('addImageBtn'),
    imageGallery: document.getElementById('imageGallery'),

    // メモ関連
    freeNotes: document.getElementById('freeNotes')
};

/**
 * 日数計算
 * @param {string} examDate - 試験日（YYYY-MM-DD形式）
 * @returns {number} - 残り日数
 */
function calculateDaysRemaining(examDate) {
    if (!examDate) return 0;
    
    const today = new Date();
    const exam = new Date(examDate);
    today.setHours(0, 0, 0, 0);
    exam.setHours(0, 0, 0, 0);
    
    const diffTime = exam - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}

/**
 * 志望校表示更新
 */
function updateSchoolDisplay() {
    const school = appData.schools[0];
    const days = calculateDaysRemaining(school.date);
    
    elements.schoolNameDisplay1.textContent = school.name || '志望校を設定してください';
    elements.daysRemaining1.textContent = `${days}日`;
    
    if (school.date && school.name) {
        const date = new Date(school.date).toLocaleDateString('ja-JP');
        elements.schoolNameDisplay1.textContent = `${school.name} (${date})`;
    }
}

/**
 * Todo表示更新
 */
function updateTodoDisplay() {
    elements.todoList.innerHTML = '';
    
    if (appData.todos.length === 0) {
        elements.todoList.innerHTML = '<li class="empty-state">まだタスクがありません</li>';
        return;
    }
    
    appData.todos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        
        li.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">削除</button>
        `;
        
        // チェックボックスイベント
        li.querySelector('.todo-checkbox').addEventListener('change', (e) => {
            appData.todos[index].completed = e.target.checked;
            updateTodoDisplay();
        });
        
        // 削除ボタンイベント
        li.querySelector('.btn-danger').addEventListener('click', () => {
            if (confirm('このタスクを削除しますか？')) {
                appData.todos.splice(index, 1);
                updateTodoDisplay();
            }
        });
        
        elements.todoList.appendChild(li);
    });
}

/**
 * 進捗表示更新
 */
function updateProgressDisplay() {
    const { name, total, current } = appData.materials;
    const days = calculateDaysRemaining(appData.schools[0].date);
    
    elements.materialName.value = name;
    elements.totalPages.value = total;
    elements.currentPage.value = current;
    
    if (days > 0 && total > current && total > 0) {
        const remainingPages = total - current;
        const pagesPerDay = Math.ceil(remainingPages / days);
        const progressPercent = Math.round((current / total) * 100);
        
        elements.progressInfo.innerHTML = `
            <div>1日あたり: ${pagesPerDay}ページ</div>
            <div>残り${remainingPages}ページ (進捗: ${progressPercent}%)</div>
        `;
    } else if (total > 0 && current >= total) {
        elements.progressInfo.innerHTML = '<div>🎉 完了しました！</div>';
    } else {
        elements.progressInfo.innerHTML = '<div>1日あたり: 0ページ</div>';
    }
}

/**
 * 画像表示更新
 */
function updateImageDisplay() {
    elements.imageGallery.innerHTML = '';
    
    if (appData.images.length === 0) {
        elements.imageGallery.innerHTML = '<div class="empty-state">復習したい問題の画像がここに表示されます</div>';
        return;
    }
    
    appData.images.forEach((image, index) => {
        const div = document.createElement('div');
        div.className = 'image-item fade-in';
        
        const img = document.createElement('img');
        img.src = image.data;
        img.alt = image.name;
        img.title = image.name;
        img.loading = 'lazy'; // 遅延読み込み
        
        // 画像クリックで拡大表示
        img.addEventListener('click', () => {
            showImageOverlay(image.data);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-image-btn';
        deleteBtn.textContent = '×';
        deleteBtn.title = '削除';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('この画像を削除しますか？')) {
                appData.images.splice(index, 1);
                updateImageDisplay();
            }
        });
        
        div.appendChild(img);
        div.appendChild(deleteBtn);
        elements.imageGallery.appendChild(div);
    });
}

/**
 * 画像拡大表示
 * @param {string} imageSrc - 画像のソース
 */
function showImageOverlay(imageSrc) {
    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';
    
    const fullImg = document.createElement('img');
    fullImg.src = imageSrc;
    fullImg.loading = 'eager';
    
    overlay.appendChild(fullImg);
    document.body.appendChild(overlay);
    
    // クリックまたはタップで閉じる
    overlay.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    // ESCキーで閉じる
    const handleKeyPress = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleKeyPress);
        }
    };
    document.addEventListener('keydown', handleKeyPress);
}

/**
 * HTMLエスケープ
 * @param {string} text - エスケープするテキスト
 * @returns {string} - エスケープされたテキスト
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * ファイル読み込み
 * @param {File} file - ファイル
 * @returns {Promise<string>} - Base64データURL
 */
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
}

/**
 * 画像ファイルの検証
 * @param {File} file - ファイル
 * @returns {boolean} - 有効な画像ファイルかどうか
 */
function validateImageFile(file) {
    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        return false;
    }
    
    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
        alert('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。');
        return false;
    }
    
    return true;
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    // 志望校編集
    elements.editBtn1.addEventListener('click', () => {
        elements.inputArea1.classList.add('active');
        elements.schoolName1.value = appData.schools[0].name;
        elements.examDate1.value = appData.schools[0].date;
        
        // iPadでのフォーカス調整
        setTimeout(() => {
            elements.schoolName1.focus();
        }, 100);
    });
    
    elements.saveBtn1.addEventListener('click', () => {
        appData.schools[0].name = elements.schoolName1.value.trim();
        appData.schools[0].date = elements.examDate1.value;
        elements.inputArea1.classList.remove('active');
        updateSchoolDisplay();
        updateProgressDisplay();
        
        // キーボードを閉じる
        document.activeElement.blur();
        
        // 保存完了のフィードバック
        elements.saveBtn1.textContent = '保存完了!';
        elements.saveBtn1.style.background = 'linear-gradient(135deg, #48bb78, #38a169)';
        setTimeout(() => {
            elements.saveBtn1.textContent = '保存';
            elements.saveBtn1.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        }, 1000);
    });

    // Todo追加
    const addTodo = () => {
        const text = elements.todoInput.value.trim();
        if (text) {
            appData.todos.push({ text, completed: false });
            elements.todoInput.value = '';
            updateTodoDisplay();
            
            // 成功時の視覚フィードバック
            elements.addTodoBtn.style.background = 'linear-gradient(135deg, #48bb78, #38a169)';
            setTimeout(() => {
                elements.addTodoBtn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
            }, 200);
        }
    };
    
    elements.addTodoBtn.addEventListener('click', addTodo);
    elements.todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
            e.preventDefault(); // iPadでの改行防止
        }
    });

    // 教材進捗
    elements.materialName.addEventListener('input', (e) => {
        appData.materials.name = e.target.value.trim();
    });
    
    elements.totalPages.addEventListener('input',