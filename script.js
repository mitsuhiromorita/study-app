document.addEventListener('DOMContentLoaded', () => {
    // === DOM要素の取得 ===
    const schoolNameInput = document.getElementById('schoolName');
    const examDateInput = document.getElementById('examDate');
    const daysRemainingSpan = document.getElementById('daysRemaining');

    const todoInput = document.getElementById('todoInput');
    const addTodoBtn = document.getElementById('addTodoBtn');
    const todoListUl = document.getElementById('todoList');

    const materialNameInput = document.getElementById('materialName');
    const totalPageInput = document.getElementById('totalPage');
    const currentPageInput = document.getElementById('currentPage');
    const pagesPerDaySpan = document.getElementById('pagesPerDay');

    const imageUploadInput = document.getElementById('imageUpload');
    const addImageBtn = document.getElementById('addImageBtn');
    const imageGalleryDiv = document.getElementById('imageGallery');

    const freeNotesTextarea = document.getElementById('freeNotes');

    // === ローカルストレージからのデータ読み込み ===
    const loadData = () => {
        // 志望校カウントダウン
        schoolNameInput.value = localStorage.getItem('schoolName') || '';
        examDateInput.value = localStorage.getItem('examDate') || '';
        updateDaysRemaining();

        // Todoリスト
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        todos.forEach(todo => addTodoToDOM(todo.text, todo.completed));

        // 教材進捗管理
        materialNameInput.value = localStorage.getItem('materialName') || '';
        totalPageInput.value = localStorage.getItem('totalPage') || '0';
        currentPageInput.value = localStorage.getItem('currentPage') || '0';
        updatePagesPerDay();

        // 復習問題（画像）- IndexedDBから読み込み
        loadImagesFromIndexedDB();

        // 自由メモ
        freeNotesTextarea.value = localStorage.getItem('freeNotes') || '';
    };

    // === 志望校カウントダウン ===
    const updateDaysRemaining = () => {
        const examDateStr = examDateInput.value;
        if (examDateStr) {
            const examDate = new Date(examDateStr);
            const today = new Date();
            // 時刻情報をリセットして日付のみを比較
            examDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            const diffTime = examDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            daysRemainingSpan.textContent = diffDays >= 0 ? diffDays : '0'; // 過ぎたら0日
        } else {
            daysRemainingSpan.textContent = '0';
        }
    };

    schoolNameInput.addEventListener('input', () => {
        localStorage.setItem('schoolName', schoolNameInput.value);
    });
    examDateInput.addEventListener('change', () => {
        localStorage.setItem('examDate', examDateInput.value);
        updateDaysRemaining();
        updatePagesPerDay(); // 試験日が変更されたら進捗も再計算
    });

    // === Todoリスト ===
    const saveTodos = () => {
        const todos = [];
        todoListUl.querySelectorAll('li').forEach(li => {
            todos.push({
                text: li.querySelector('span').textContent,
                completed: li.querySelector('input[type="checkbox"]').checked
            });
        });
        localStorage.setItem('todos', JSON.stringify(todos));
    };

    const addTodoToDOM = (text, completed = false) => {
        if (!text.trim()) return;

        const li = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = completed;
        checkbox.addEventListener('change', () => {
            li.classList.toggle('completed', checkbox.checked);
            saveTodos();
        });

        const todoTextSpan = document.createElement('span');
        todoTextSpan.textContent = text;

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '削除';
        deleteButton.addEventListener('click', () => {
            todoListUl.removeChild(li);
            saveTodos();
        });

        li.appendChild(checkbox);
        li.appendChild(todoTextSpan);
        li.appendChild(deleteButton);
        li.classList.toggle('completed', completed);
        todoListUl.appendChild(li);

        todoInput.value = ''; // 入力欄をクリア
    };

    addTodoBtn.addEventListener('click', () => {
        addTodoToDOM(todoInput.value);
        saveTodos();
    });
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodoToDOM(todoInput.value);
            saveTodos();
        }
    });

    // === 教材進捗管理 ===
    const updatePagesPerDay = () => {
        const total = parseInt(totalPageInput.value, 10);
        const current = parseInt(currentPageInput.value, 10);
        const remainingDays = parseInt(daysRemainingSpan.textContent, 10);

        if (isNaN(total) || isNaN(current) || total <= 0 || remainingDays <= 0 || current > total) {
            pagesPerDaySpan.textContent = '0';
            return;
        }

        const remainingPages = total - current;
        const pagesPerDay = remainingPages / remainingDays;
        pagesPerDaySpan.textContent = pagesPerDay.toFixed(1); // 小数点以下1桁まで
    };

    materialNameInput.addEventListener('input', () => {
        localStorage.setItem('materialName', materialNameInput.value);
    });
    totalPageInput.addEventListener('input', () => {
        localStorage.setItem('totalPage', totalPageInput.value);
        updatePagesPerDay();
    });
    currentPageInput.addEventListener('input', () => {
        localStorage.setItem('currentPage', currentPageInput.value);
        updatePagesPerDay();
    });

    // === 復習問題（画像） - IndexedDBを使用 ===
    let db;
    const DB_NAME = 'reviewImagesDB';
    const STORE_NAME = 'images';

    const openDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);

            request.onupgradeneeded = (event) => {
                db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    };

    const addImageToDB = (imageData, fileName) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.add({ data: imageData, name: fileName, timestamp: Date.now() });

        transaction.oncomplete = () => {
            console.log('Image added to IndexedDB');
            displayImage(imageData, fileName);
        };
        transaction.onerror = (event) => {
            console.error('Error adding image:', event.target.error);
        };
    };

    const loadImagesFromIndexedDB = async () => {
        await openDB(); // DBが開かれるのを待つ
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = (event) => {
            imageGalleryDiv.innerHTML = ''; // ギャラリーをクリア
            if (event.target.result.length === 0) {
                imageGalleryDiv.textContent = 'ここに復習したい問題の画像が表示されます。';
            } else {
                event.target.result.forEach(imageObj => {
                    displayImage(imageObj.data, imageObj.name, imageObj.id);
                });
            }
        };
        request.onerror = (event) => {
            console.error('Error loading images:', event.target.error);
        };
    };
    
    const displayImage = (imageData, fileName, id = null) => {
        const imgContainer = document.createElement('div');
        imgContainer.classList.add('image-item'); // スタイル用にクラスを追加
        imgContainer.dataset.imageId = id; // 削除用にIDを保持

        const img = document.createElement('img');
        img.src = imageData;
        img.alt = fileName;
        img.title = fileName; // ホバーでファイル名を表示

        // 画像クリックで拡大表示（簡易的なもの）
        img.addEventListener('click', () => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0,0,0,0.8); display: flex;
                justify-content: center; align-items: center; z-index: 1000;
            `;
            const fullImg = document.createElement('img');
            fullImg.src = imageData;
            fullImg.style.maxWidth = '90%';
            fullImg.style.maxHeight = '90%';
            fullImg.style.objectFit = 'contain';
            overlay.appendChild(fullImg);
            document.body.appendChild(overlay);

            overlay.addEventListener('click', () => document.body.removeChild(overlay));
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'X';
        deleteBtn.classList.add('delete-image-btn');
        deleteBtn.addEventListener('click', () => {
            if (confirm('この画像を削除しますか？')) {
                deleteImageFromDB(id);
                imgContainer.remove();
                if (imageGalleryDiv.children.length === 0) {
                     imageGalleryDiv.textContent = 'ここに復習したい問題の画像が表示されます。';
                }
            }
        });

        imgContainer.appendChild(img);
        imgContainer.appendChild(deleteBtn);
        imageGalleryDiv.appendChild(imgContainer);

        // 初期のテキストを削除
        if (imageGalleryDiv.textContent === 'ここに復習したい問題の画像が表示されます。') {
            imageGalleryDiv.textContent = '';
        }
    };

    const deleteImageFromDB = (id) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(id);
        transaction.oncomplete = () => {
            console.log('Image deleted from IndexedDB');
        };
        transaction.onerror = (event) => {
            console.error('Error deleting image:', event.target.error);
        };
    };

    addImageBtn.addEventListener('click', () => {
        const file = imageUploadInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                addImageToDB(e.target.result, file.name);
            };
            reader.readAsDataURL(file); // 画像をBase64形式で読み込む
            imageUploadInput.value = ''; // ファイル選択をクリア
        } else {
            alert('画像ファイルを選択してください。');
        }
    });

    // === 自由メモ ===
    // 変更があるたびにLocalStorageに保存（簡単なDebounce処理を導入しても良い）
    let saveTimeout;
    freeNotesTextarea.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            localStorage.setItem('freeNotes', freeNotesTextarea.value);
        }, 500); // 500ms後に保存
    });

    // === カウントダウン設定 ===
    const SCHOOL_MAX = 5;
    for (let i = 1; i <= SCHOOL_MAX; i++) {
        setupSchoolCountdown(i);
    }

    function setupSchoolCountdown(idx) {
        const editBtn = document.getElementById(`editCountdownBtn${idx}`);
        const saveBtn = document.getElementById(`saveCountdownBtn${idx}`);
        const inputArea = document.getElementById(`countdownInputArea${idx}`);
        const schoolNameInput = document.getElementById(`schoolName${idx}`);
        const examDateInput = document.getElementById(`examDate${idx}`);
        const schoolNameDisplay = document.getElementById(`schoolNameDisplay${idx}`);
        const examDateDisplay = document.getElementById(`examDateDisplay${idx}`);
        const daysRemaining = document.getElementById(`daysRemaining${idx}`);
        const schoolCountdownDiv = document.getElementById(`schoolCountdown${idx}`);

        function updateDisplay() {
            const name = localStorage.getItem(`schoolName${idx}`) || '';
            const date = localStorage.getItem(`examDate${idx}`) || '';
            schoolNameDisplay.textContent = name ? `第${idx}志望: ${name}` : '';
            examDateDisplay.textContent = date ? `（${date}）` : '';
            if (date) {
                const today = new Date();
                const exam = new Date(date);
                const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
                daysRemaining.textContent = diff >= 0 ? diff : 0;
            } else {
                daysRemaining.textContent = '0';
            }
            // 入力がなければ非表示
            if (name || inputArea.style.display === '') {
                schoolCountdownDiv.style.display = '';
            } else {
                schoolCountdownDiv.style.display = 'none';
            }
        }

        editBtn.addEventListener('click', function() {
            inputArea.style.display = '';
            editBtn.style.display = 'none';
            // 入力欄に現在値をセット
            schoolNameInput.value = localStorage.getItem(`schoolName${idx}`) || '';
            examDateInput.value = localStorage.getItem(`examDate${idx}`) || '';
        });

        saveBtn.addEventListener('click', function() {
            localStorage.setItem(`schoolName${idx}`, schoolNameInput.value);
            localStorage.setItem(`examDate${idx}`, examDateInput.value);
            inputArea.style.display = 'none';
            editBtn.style.display = '';
            updateDisplay();
            // 次順位の志望校欄を表示（未入力なら空欄で）
            if (schoolNameInput.value && idx < SCHOOL_MAX) {
                const nextDiv = document.getElementById(`schoolCountdown${idx + 1}`);
                if (nextDiv) nextDiv.style.display = '';
            }
        });

        // 初期表示
        inputArea.style.display = 'none';
        editBtn.style.display = '';
        updateDisplay();
    }

    // === 初期ロード ===
    loadData();
});