document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Logic ---
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');

    function switchView(targetId) {
        // Validation: Ensure targetId exists
        const targetSection = document.getElementById(targetId);
        if (!targetSection) return;

        // Update Active Link
        navLinks.forEach(link => {
            const linkTarget = link.getAttribute('data-target');
            if (linkTarget === targetId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Switch Section
        sections.forEach(section => {
            section.classList.remove('active-section');
            if (section.id === targetId) {
                section.classList.add('active-section');
            }
        });
    }

    function handleHashChange() {
        const hash = window.location.hash.substring(1); // Remove '#'
        if (hash) {
            switchView(hash);
        } else {
            // Default view
            switchView('converter-section');
        }
    }

    // Event Listeners
    window.addEventListener('hashchange', handleHashChange);

    // Initial Load
    handleHashChange();

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('data-target');
            // If it's a real link with data-target, update hash
            if (targetId) {
                e.preventDefault();
                window.location.hash = targetId;
            }
            // For placeholder links without data-target, default behavior (href="#") or preventDefault
        });
    });

    // --- Converter Logic (Original) ---
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectFileBtn = document.getElementById('select-file-btn');
    const addMoreBtn = document.getElementById('add-more-btn');
    const editorArea = document.getElementById('editor-area');
    const fileListContainer = document.getElementById('file-list');
    const fileCountSpan = document.getElementById('file-count');
    const formatSelect = document.getElementById('format-select');
    const convertBtn = document.getElementById('convert-btn');
    const resetBtn = document.getElementById('reset-btn');

    // State
    let fileQueue = [];

    // Event Listeners for Drag & Drop
    setupDragAndDrop(dropZone, (files) => handleFiles(files));

    // File Input Events
    selectFileBtn.addEventListener('click', () => fileInput.click());
    addMoreBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
        fileInput.value = '';
    });

    // Reset Event
    resetBtn.addEventListener('click', resetUI);

    // Convert Event
    convertBtn.addEventListener('click', convertAndDownload);

    // Functions
    function handleFiles(files) {
        const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (newFiles.length === 0) {
            alert('画像ファイルを選択してください。');
            return;
        }

        newFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const fileObj = {
                    id: Date.now() + Math.random(),
                    file: file,
                    preview: e.target.result,
                    name: file.name
                };
                fileQueue.push(fileObj);
                renderFileList();
            };
            reader.readAsDataURL(file);
        });

        showEditor();
    }

    function renderFileList() {
        fileListContainer.innerHTML = '';
        fileCountSpan.textContent = `(${fileQueue.length})`;

        fileQueue.forEach(item => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            const img = document.createElement('img');
            img.src = item.preview;
            img.className = 'file-preview';

            const name = document.createElement('div');
            name.className = 'file-name';
            name.textContent = item.name;
            name.title = item.name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file-btn';
            removeBtn.innerHTML = '×';
            removeBtn.title = '削除';
            removeBtn.onclick = () => removeFile(item.id);

            fileItem.appendChild(img);
            fileItem.appendChild(name);
            fileItem.appendChild(removeBtn);

            fileListContainer.appendChild(fileItem);
        });

        updateConvertButtonText();

        if (fileQueue.length === 0) {
            resetUI();
        }
    }

    function updateConvertButtonText() {
        if (fileQueue.length > 1) {
            convertBtn.textContent = '一括変換してZIPでダウンロード';
        } else {
            convertBtn.textContent = '変換してダウンロード';
        }
    }

    function removeFile(id) {
        fileQueue = fileQueue.filter(item => item.id !== id);
        renderFileList();
    }

    function showEditor() {
        dropZone.classList.add('hidden');
        editorArea.classList.remove('hidden');
    }

    function resetUI() {
        fileQueue = [];
        fileListContainer.innerHTML = '';
        fileCountSpan.textContent = '(0)';
        updateConvertButtonText();

        editorArea.classList.add('hidden');
        dropZone.classList.remove('hidden');
    }

    async function convertAndDownload() {
        if (fileQueue.length === 0) return;

        const format = formatSelect.value;
        let extension;
        if (format === 'image/jpeg') extension = 'jpg';
        else if (format === 'image/png') extension = 'png';
        else if (format === 'image/webp') extension = 'webp';
        else if (format === 'image/bmp') extension = 'bmp';
        else if (format === 'application/pdf') extension = 'pdf';
        else extension = 'bin';

        const originalBtnText = convertBtn.textContent;
        convertBtn.textContent = '変換中...';
        convertBtn.disabled = true;

        try {
            const conversionPromises = fileQueue.map(item => processFile(item, format, extension));
            const results = await Promise.all(conversionPromises);

            if (results.length === 1) {
                const result = results[0];
                downloadBlob(result.blob, result.name);
            } else {
                const zip = new JSZip();
                results.forEach(result => {
                    zip.file(result.name, result.blob);
                });

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(zipBlob, 'images_converted.zip');
            }

        } catch (error) {
            console.error(error);
            alert('変換中にエラーが発生しました。');
        } finally {
            convertBtn.textContent = originalBtnText;
            convertBtn.disabled = false;
        }
    }

    function processFile(item, format, extension) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
                const fileName = `${nameWithoutExt}.${extension}`;

                if (format === 'application/pdf') {
                    try {
                        const { jsPDF } = window.jspdf;
                        const pdf = new jsPDF({
                            orientation: img.naturalWidth > img.naturalHeight ? 'l' : 'p',
                            unit: 'px',
                            format: [img.naturalWidth, img.naturalHeight]
                        });
                        pdf.addImage(img, 'JPEG', 0, 0, img.naturalWidth, img.naturalHeight);
                        const pdfBlob = pdf.output('blob');
                        resolve({ name: fileName, blob: pdfBlob });
                    } catch (e) {
                        reject(e);
                    }
                    return;
                }

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;

                if (format === 'image/jpeg' || format === 'image/bmp') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve({ name: fileName, blob: blob });
                    } else {
                        reject('Conversion failed');
                    }
                }, format, 0.9);
            };
            img.onerror = reject;
            img.src = item.preview;
        });
    }

    // --- Resizer Logic ---
    const resizeDropZone = document.getElementById('resize-drop-zone');
    const resizeFileInput = document.getElementById('resize-file-input');
    const resizeSelectFileBtn = document.getElementById('resize-select-file-btn');
    const resizeEditorArea = document.getElementById('resize-editor-area');

    // File List Elements
    const resizeFileListContainer = document.getElementById('resize-file-list');
    const resizeFileCountSpan = document.getElementById('resize-file-count');
    const resizeAddMoreBtn = document.getElementById('resize-add-more-btn');

    // Controls
    const widthInput = document.getElementById('resize-width');
    const heightInput = document.getElementById('resize-height');
    const lockAspectRatioCheckbox = document.getElementById('lock-aspect-ratio');

    // Percentage Controls
    const percentageInput = document.getElementById('resize-percentage');
    const percentageSlider = document.getElementById('resize-percentage-slider');

    // Mode Switcher
    const modeTabs = document.querySelectorAll('.mode-tab');
    const pixelInputs = document.getElementById('pixel-inputs');
    const percentageInputs = document.getElementById('percentage-inputs');

    const doResizeBtn = document.getElementById('do-resize-btn');
    const resizeResetBtn = document.getElementById('resize-reset-btn');

    let resizeQueue = [];
    let currentResizeMode = 'pixel'; // 'pixel' or 'percentage'

    // Drag & Drop
    setupDragAndDrop(resizeDropZone, (files) => handleResizeFiles(files));

    // File Input
    resizeSelectFileBtn.addEventListener('click', () => resizeFileInput.click());
    resizeAddMoreBtn.addEventListener('click', () => resizeFileInput.click());

    resizeFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleResizeFiles(e.target.files);
        resizeFileInput.value = '';
    });

    // Reset
    resizeResetBtn.addEventListener('click', resetResizeUI);

    // Mode Switching
    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentResizeMode = tab.dataset.mode;

            if (currentResizeMode === 'pixel') {
                pixelInputs.classList.remove('hidden');
                percentageInputs.classList.add('hidden');
                // If single file, try to sync inputs
                if (resizeQueue.length === 1) {
                    syncDimensionsFromPercentage();
                }
            } else {
                pixelInputs.classList.add('hidden');
                percentageInputs.classList.remove('hidden');
            }
        });
    });

    // Inputs Synchronization
    widthInput.addEventListener('input', () => {
        if (resizeQueue.length === 1 && lockAspectRatioCheckbox.checked) {
            const aspect = resizeQueue[0].width / resizeQueue[0].height;
            const w = parseFloat(widthInput.value);
            if (!isNaN(w)) {
                heightInput.value = Math.round(w / aspect);
            }
        }
    });

    heightInput.addEventListener('input', () => {
        if (resizeQueue.length === 1 && lockAspectRatioCheckbox.checked) {
            const aspect = resizeQueue[0].width / resizeQueue[0].height;
            const h = parseFloat(heightInput.value);
            if (!isNaN(h)) {
                widthInput.value = Math.round(h * aspect);
            }
        }
    });

    // Percentage Inputs Sync
    percentageInput.addEventListener('input', () => {
        percentageSlider.value = percentageInput.value;
    });

    percentageSlider.addEventListener('input', () => {
        percentageInput.value = percentageSlider.value;
    });

    // Main Resize Action
    doResizeBtn.addEventListener('click', async () => {
        if (resizeQueue.length === 0) return;

        // Validation for Pixel Mode
        if (currentResizeMode === 'pixel') {
            // If multiple files, allow empty inputs (will fail later? no, we need logic)
            // For multiple files in pixel mode, we usually need fixed dimensions or a strategy.
            // Strategy: If width/height entered, force that dimension. If Lock Aspect Ratio, calculate other.
            // If both entered, force both (stretch).
            const w = parseInt(widthInput.value);
            const h = parseInt(heightInput.value);

            if (!w && !h) {
                alert('幅または高さを指定してください。');
                return;
            }
        }

        const btnOriginalText = doResizeBtn.textContent;
        doResizeBtn.textContent = '処理中...';
        doResizeBtn.disabled = true;

        try {
            const resizePromises = resizeQueue.map(item => processResizeItem(item));
            const results = await Promise.all(resizePromises);

            if (results.length === 1) {
                const result = results[0];
                downloadBlob(result.blob, result.name);
            } else {
                const zip = new JSZip();
                results.forEach(result => {
                    zip.file(result.name, result.blob);
                });
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(zipBlob, 'images_resized.zip');
            }

        } catch (e) {
            console.error(e);
            alert('リサイズに失敗しました');
        } finally {
            doResizeBtn.textContent = btnOriginalText;
            doResizeBtn.disabled = false;
        }

    });

    function handleResizeFiles(files) {
        const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (newFiles.length === 0) {
            alert('画像ファイルを選択してください');
            return;
        }

        newFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    resizeQueue.push({
                        id: Date.now() + Math.random(),
                        file: file,
                        name: file.name,
                        type: file.type,
                        preview: e.target.result,
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        img: img
                    });

                    if (resizeQueue.length === 1) {
                        // Set initial input values for the first image
                        widthInput.value = img.naturalWidth;
                        heightInput.value = img.naturalHeight;
                    } // else: multiple files, maybe clear inputs or keep as is? Keep as is implies "last set" or "first set".

                    renderResizeFileList();
                    resizeDropZone.classList.add('hidden');
                    resizeEditorArea.classList.remove('hidden');
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function renderResizeFileList() {
        resizeFileListContainer.innerHTML = '';
        resizeFileCountSpan.textContent = `(${resizeQueue.length})`;

        resizeQueue.forEach(item => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            const img = document.createElement('img');
            img.src = item.preview;
            img.className = 'file-preview';

            const name = document.createElement('div');
            name.className = 'file-name';
            name.textContent = item.name;
            name.title = item.name;

            const info = document.createElement('div');
            info.style.fontSize = '0.7rem';
            info.style.color = '#64748b';
            info.style.textAlign = 'center';
            info.textContent = `${item.width} x ${item.height}`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => removeResizeFile(item.id);

            fileItem.appendChild(img);
            fileItem.appendChild(name);
            fileItem.appendChild(info);
            fileItem.appendChild(removeBtn);

            resizeFileListContainer.appendChild(fileItem);
        });

        updateResizeButtonText();

        if (resizeQueue.length === 0) {
            resetResizeUI();
        }
    }

    function updateResizeButtonText() {
        if (resizeQueue.length > 1) {
            doResizeBtn.textContent = '一括リサイズしてZIPでダウンロード';
        } else {
            doResizeBtn.textContent = 'リサイズしてダウンロード';
        }
    }

    function removeResizeFile(id) {
        resizeQueue = resizeQueue.filter(item => item.id !== id);
        renderResizeFileList();
    }

    function resetResizeUI() {
        resizeQueue = [];
        resizeFileListContainer.innerHTML = '';
        widthInput.value = '';
        heightInput.value = '';
        resizeEditorArea.classList.add('hidden');
        resizeDropZone.classList.remove('hidden');

        // Reset inputs
        percentageSlider.value = 50;
        percentageInput.value = 50;
    }

    function syncDimensionsFromPercentage() {
        // Optional helper to show what pixel size would be (for first image)
        // Not strictly necessary but nice to have
    }

    async function processResizeItem(item) {
        let targetW, targetH;

        if (currentResizeMode === 'percentage') {
            const pct = parseInt(percentageInput.value) / 100;
            targetW = Math.round(item.width * pct);
            targetH = Math.round(item.height * pct);
        } else {
            // Pixel Mode
            const inputW = parseInt(widthInput.value);
            const inputH = parseInt(heightInput.value);
            const aspect = item.width / item.height;

            if (lockAspectRatioCheckbox.checked) {
                if (inputW && !inputH) {
                    targetW = inputW;
                    targetH = Math.round(inputW / aspect);
                } else if (!inputW && inputH) {
                    targetH = inputH;
                    targetW = Math.round(inputH * aspect);
                } else if (inputW && inputH) {
                    // Priority to Width if both? Or width as driver.
                    // Actually if Lock Aspect is checked, usually UI prevents typing both freely.
                    // But if multi-files with different aspects... 
                    // Let's assume we rescale to fit Width.
                    targetW = inputW;
                    targetH = Math.round(inputW / aspect);
                } else {
                    // Fallback
                    targetW = item.width;
                    targetH = item.height;
                }
            } else {
                targetW = inputW || item.width;
                targetH = inputH || item.height;
            }
        }

        const blob = await resizeImage(item.img, targetW, targetH, item.type);
        const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
        const ext = item.type.split('/')[1] || 'png';
        const fileName = `${nameWithoutExt}_${targetW}x${targetH}.${ext}`;

        return { name: fileName, blob: blob };
    }

    function resizeImage(img, width, height, type) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = width;
            canvas.height = height;

            // Draw background white for JPEGs to avoid black background
            if (type === 'image/jpeg' || type === 'image/bmp') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
            }

            // High quality scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject('Resize failed');
            }, type, 0.9);
        });
    }


    // --- Shared Utilities ---
    function setupDragAndDrop(element, callback) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('drag-over');
        });

        element.addEventListener('dragleave', () => {
            element.classList.remove('drag-over');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                callback(e.dataTransfer.files);
            }
        });
    }

    function downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
