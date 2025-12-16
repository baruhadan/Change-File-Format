document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Logic ---
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');

    function switchSection(targetId) {
        // Toggle Sections
        sections.forEach(sec => {
            if (sec.id === targetId) {
                sec.classList.remove('hidden-section');
                sec.classList.add('active-section');
            } else {
                sec.classList.add('hidden-section');
                sec.classList.remove('active-section');
            }
        });

        // Toggle Nav Links
        navLinks.forEach(link => {
            if (link.dataset.target === targetId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    function updateSectionFromHash() {
        const hash = window.location.hash.slice(1); // Remove '#'
        let targetId = 'home-section'; // Default to Home

        if (hash) {
            const isValidSection = Array.from(sections).some(sec => sec.id === hash);
            if (isValidSection) {
                targetId = hash;
            }
        }

        switchSection(targetId);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.dataset.target;
            window.location.hash = targetId;
        });
    });

    // Handle Hero Buttons and Feature Cards
    const startNowBtn = document.getElementById('start-now-btn');
    if (startNowBtn) {
        startNowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const featuresSection = document.getElementById('features');
            if (featuresSection) {
                featuresSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    const internalLinks = document.querySelectorAll('[data-target]');
    internalLinks.forEach(link => {
        if (!link.classList.contains('nav-link')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.dataset.target;
                window.location.hash = targetId;

                // If it's the home section (Logo), scroll to top instantly
                if (targetId === 'home-section') {
                    window.scrollTo({ top: 0, behavior: 'auto' });
                }
            });
        }
    });

    // Handle back/forward buttons
    window.addEventListener('hashchange', updateSectionFromHash);

    // Initial load
    updateSectionFromHash();


    // --- Image Converter Logic ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectFileBtn = document.getElementById('select-file-btn');
    const editorArea = document.getElementById('editor-area');
    const fileListContainer = document.getElementById('file-list');
    const fileCountSpan = document.getElementById('file-count');
    const formatSelect = document.getElementById('format-select');
    const convertBtn = document.getElementById('convert-btn');
    const resetBtn = document.getElementById('reset-btn');
    const addMoreBtn = document.getElementById('add-more-btn');

    let fileQueue = [];

    // Drag & Drop Events
    setupDragAndDrop(dropZone, (files) => handleFiles(files));

    // File Input Events
    selectFileBtn.addEventListener('click', () => fileInput.click());
    addMoreBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFiles(e.target.files);
        fileInput.value = ''; // Reset for same file selection
    });

    // Reset Button
    resetBtn.addEventListener('click', resetUI);

    // Convert Button
    convertBtn.addEventListener('click', convertAndDownload);

    function handleFiles(files) {
        const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (newFiles.length === 0) {
            alert('画像ファイルを選択してください。');
            return;
        }

        newFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                fileQueue.push({
                    id: Date.now() + Math.random(),
                    file: file,
                    name: file.name,
                    preview: e.target.result
                });
                renderFileList();
            };
            reader.readAsDataURL(file);
        });

        dropZone.classList.add('hidden');
        editorArea.classList.remove('hidden');
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
            name.title = item.name; // Tooltip

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => removeFile(item.id);

            fileItem.appendChild(img);
            fileItem.appendChild(name);
            fileItem.appendChild(removeBtn);

            fileListContainer.appendChild(fileItem);
        });

        // Update Convert Button Text
        if (fileQueue.length > 1) {
            convertBtn.textContent = '一括変換してZIPでダウンロード';
        } else {
            convertBtn.textContent = '変換してダウンロード';
        }

        if (fileQueue.length === 0) {
            resetUI();
        }
    }

    function removeFile(id) {
        fileQueue = fileQueue.filter(item => item.id !== id);
        renderFileList();
    }

    function resetUI() {
        fileQueue = [];
        fileListContainer.innerHTML = '';
        fileCountSpan.textContent = '(0)';
        convertBtn.textContent = '変換してダウンロード';
        editorArea.classList.add('hidden');
        dropZone.classList.remove('hidden');
    }

    async function convertAndDownload() {
        if (fileQueue.length === 0) return;

        const format = formatSelect.value;
        const btnOriginalText = convertBtn.textContent;
        convertBtn.textContent = '変換中...';
        convertBtn.disabled = true;

        try {
            const promises = fileQueue.map(item => processImage(item, format));
            const results = await Promise.all(promises);

            if (results.length === 1) {
                // Single file download
                downloadBlob(results[0].blob, results[0].name);
            } else {
                // Zip download
                const zip = new JSZip();
                results.forEach(result => {
                    zip.file(result.name, result.blob);
                });
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(zipBlob, 'images_converted.zip');
            }

        } catch (error) {
            console.error(error);
            alert('変換中にエラーが発生しました');
        } finally {
            convertBtn.textContent = btnOriginalText;
            convertBtn.disabled = false;
        }
    }

    function processImage(item, format) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');

                // For JPEG/BMP, fill white background (transparent becomes black otherwise)
                if (format === 'image/jpeg' || format === 'image/bmp') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0);

                if (format === 'application/pdf') {
                    // PDF Conversion
                    try {
                        const { jsPDF } = window.jspdf;
                        // Orient based on dimensions
                        const orientation = img.width > img.height ? 'l' : 'p';
                        const pdf = new jsPDF({
                            orientation: orientation,
                            unit: 'px',
                            format: [img.width, img.height]
                        });
                        pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, img.width, img.height);
                        const pdfBlob = pdf.output('blob');
                        const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
                        resolve({ name: `${nameWithoutExt}.pdf`, blob: pdfBlob });
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    // Image Conversion
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
                            // mapping format to extension
                            let ext = 'png';
                            if (format === 'image/jpeg') ext = 'jpg';
                            if (format === 'image/webp') ext = 'webp';
                            if (format === 'image/bmp') ext = 'bmp';

                            resolve({ name: `${nameWithoutExt}.${ext}`, blob: blob });
                        } else {
                            reject('Conversion failed');
                        }
                    }, format, 0.9);
                }
            };
            img.onerror = reject;
            img.src = item.preview;
        });
    }

    // --- Image Resizer Logic ---
    const resizeDropZone = document.getElementById('resize-drop-zone');
    const resizeFileInput = document.getElementById('resize-file-input');
    const resizeSelectFileBtn = document.getElementById('resize-select-file-btn');
    const resizeAddMoreBtn = document.getElementById('resize-add-more-btn');
    const resizeEditorArea = document.getElementById('resize-editor-area');
    const resizeFileListContainer = document.getElementById('resize-file-list');
    const resizeFileCountSpan = document.getElementById('resize-file-count');
    const doResizeBtn = document.getElementById('do-resize-btn');
    const resizeResetBtn = document.getElementById('resize-reset-btn');

    // Controls
    const pixelInputs = document.getElementById('pixel-inputs');
    const percentageInputs = document.getElementById('percentage-inputs');
    const widthInput = document.getElementById('resize-width');
    const heightInput = document.getElementById('resize-height');
    const lockAspectRatioCheckbox = document.getElementById('lock-aspect-ratio');
    const percentageInput = document.getElementById('resize-percentage');
    const percentageSlider = document.getElementById('resize-percentage-slider');
    const modeTabs = document.querySelectorAll('.mode-tab');

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
    // --- Audio Converter Logic ---
    const audioDropZone = document.getElementById('audio-drop-zone');
    const audioFileInput = document.getElementById('audio-file-input');
    const audioSelectFileBtn = document.getElementById('audio-select-file-btn');
    const audioAddMoreBtn = document.getElementById('audio-add-more-btn');
    const audioEditorArea = document.getElementById('audio-editor-area');
    const audioFileListContainer = document.getElementById('audio-file-list');
    const audioFileCountSpan = document.getElementById('audio-file-count');
    const audioFormatSelect = document.getElementById('audio-format-select');
    const audioConvertBtn = document.getElementById('audio-convert-btn');
    const audioResetBtn = document.getElementById('audio-reset-btn');

    let audioQueue = [];
    let ffmpeg = null;

    // Load FFmpeg
    async function loadFFmpeg() {
        if (ffmpeg && ffmpeg.isLoaded()) return;

        if (!ffmpeg) {
            const { createFFmpeg } = FFmpeg;
            ffmpeg = createFFmpeg({
                log: true,
                corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
                mainName: 'main'
            });
        }

        if (!ffmpeg.isLoaded()) {
            await ffmpeg.load();
        }
    }

    // Drag & Drop
    setupDragAndDrop(audioDropZone, (files) => handleAudioFiles(files));

    // File Input
    audioSelectFileBtn.addEventListener('click', () => audioFileInput.click());
    audioAddMoreBtn.addEventListener('click', () => audioFileInput.click());

    audioFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleAudioFiles(e.target.files);
        audioFileInput.value = '';
    });

    // Reset
    audioResetBtn.addEventListener('click', resetAudioUI);

    // Convert
    audioConvertBtn.addEventListener('click', convertAudioAndDownload);

    function handleAudioFiles(files) {
        const newFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));

        if (newFiles.length === 0) {
            alert('音声ファイルを選択してください。');
            return;
        }

        newFiles.forEach(file => {
            audioQueue.push({
                id: Date.now() + Math.random(),
                file: file,
                name: file.name,
                status: 'pending'
            });
        });

        renderAudioFileList();
        showAudioEditor();
    }

    function renderAudioFileList() {
        audioFileListContainer.innerHTML = '';
        audioFileCountSpan.textContent = `(${audioQueue.length})`;

        audioQueue.forEach(item => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            const iconDiv = document.createElement('div');
            iconDiv.className = 'file-preview';
            iconDiv.style.display = 'flex';
            iconDiv.style.alignItems = 'center';
            iconDiv.style.justifyContent = 'center';
            iconDiv.style.backgroundColor = '#f1f5f9';
            iconDiv.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';

            const name = document.createElement('div');
            name.className = 'file-name';
            name.textContent = item.name;
            name.title = item.name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => removeAudioFile(item.id);

            fileItem.appendChild(iconDiv);
            fileItem.appendChild(name);
            fileItem.appendChild(removeBtn);

            audioFileListContainer.appendChild(fileItem);
        });

        updateAudioConvertButtonText();

        if (audioQueue.length === 0) {
            resetAudioUI();
        }
    }

    function updateAudioConvertButtonText() {
        if (audioQueue.length > 1) {
            audioConvertBtn.textContent = '一括変換してZIPでダウンロード';
        } else {
            audioConvertBtn.textContent = '変換してダウンロード';
        }
    }

    function removeAudioFile(id) {
        audioQueue = audioQueue.filter(item => item.id !== id);
        renderAudioFileList();
    }

    function showAudioEditor() {
        audioDropZone.classList.add('hidden');
        audioEditorArea.classList.remove('hidden');
    }

    function resetAudioUI() {
        audioQueue = [];
        audioFileListContainer.innerHTML = '';
        audioFileCountSpan.textContent = '(0)';
        updateAudioConvertButtonText();
        audioEditorArea.classList.add('hidden');
        audioDropZone.classList.remove('hidden');
    }

    async function convertAudioAndDownload() {
        if (audioQueue.length === 0) return;

        const format = audioFormatSelect.value;
        const btnOriginalText = audioConvertBtn.textContent;
        audioConvertBtn.textContent = 'FFmpeg準備中...';
        audioConvertBtn.disabled = true;

        try {
            if (!ffmpeg) {
                await loadFFmpeg();
            }

            audioConvertBtn.textContent = '変換中...';

            const results = [];

            for (const item of audioQueue) {
                if (!ffmpeg || !ffmpeg.isLoaded()) {
                    await loadFFmpeg();
                }

                const result = await processAudioItem(item, format);
                results.push(result);

                // Single-threaded FFmpeg workaround: reset instance after use
                try {
                    ffmpeg.exit();
                } catch (e) { }
                ffmpeg = null;
            }

            if (results.length === 1) {
                downloadBlob(results[0].blob, results[0].name);
            } else {
                const zip = new JSZip();
                results.forEach(result => {
                    zip.file(result.name, result.blob);
                });
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(zipBlob, 'audio_converted.zip');
            }

        } catch (error) {
            console.error(error);
            // If load failed or any other error occurred, reset ffmpeg instance if it's not loaded correctly
            if (ffmpeg && !ffmpeg.isLoaded()) {
                ffmpeg = null;
            }
            alert('変換中にエラーが発生しました。コンソールログを確認してください。\n' + error.message);
        } finally {
            audioConvertBtn.textContent = btnOriginalText;
            audioConvertBtn.disabled = false;
        }
    }

    async function processAudioItem(item, format) {
        const { fetchFile } = FFmpeg;
        const name = item.name;

        const ext = name.split('.').pop();
        const safeInputName = `input.${ext}`;
        const outputName = `output.${format}`;

        ffmpeg.FS('writeFile', safeInputName, await fetchFile(item.file));

        await ffmpeg.run('-i', safeInputName, outputName);

        const data = ffmpeg.FS('readFile', outputName);

        try {
            ffmpeg.FS('unlink', safeInputName);
            ffmpeg.FS('unlink', outputName);
        } catch (e) { }

        const blob = new Blob([data.buffer], { type: `audio/${format}` });
        const nameWithoutExt = name.substring(0, name.lastIndexOf('.')) || name;

        return {
            name: `${nameWithoutExt}.${format}`,
            blob: blob
        };

    }

    // --- Video Converter Logic ---
    const videoDropZone = document.getElementById('video-drop-zone');
    const videoFileInput = document.getElementById('video-file-input');
    const videoSelectFileBtn = document.getElementById('video-select-file-btn');
    const videoAddMoreBtn = document.getElementById('video-add-more-btn');
    const videoEditorArea = document.getElementById('video-editor-area');
    const videoFileListContainer = document.getElementById('video-file-list');
    const videoFileCountSpan = document.getElementById('video-file-count');
    const videoFormatSelect = document.getElementById('video-format-select');
    const videoConvertBtn = document.getElementById('video-convert-btn');
    const videoResetBtn = document.getElementById('video-reset-btn');

    // Progress Bar Elements
    const videoProgressContainer = document.getElementById('video-progress-container');
    const videoProgressBar = document.getElementById('video-progress-bar');
    const videoProgressText = document.getElementById('video-progress-text');
    const videoFileProgress = document.getElementById('video-file-progress');

    let videoQueue = [];
    let videoWorker = null;

    // Drag & Drop
    setupDragAndDrop(videoDropZone, (files) => handleVideoFiles(files));

    // File Input
    videoSelectFileBtn.addEventListener('click', () => videoFileInput.click());
    videoAddMoreBtn.addEventListener('click', () => videoFileInput.click());

    videoFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleVideoFiles(e.target.files);
        videoFileInput.value = '';
    });

    // Reset
    videoResetBtn.addEventListener('click', resetVideoUI);

    // Convert
    videoConvertBtn.addEventListener('click', convertVideoAndDownload);

    // --- Worker Code for Blob Inlining ---
    // Note: 'importScripts' is removed here because we will inject the library code manually
    const workerLogicCode = `
const { createFFmpeg, fetchFile } = FFmpeg;
let ffmpeg = null;

// Parse time string (HH:MM:SS.ms) to seconds
function parseTime(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    let seconds = 0;
    let multiplier = 1;

    for (let i = parts.length - 1; i >= 0; i--) {
        seconds += parseFloat(parts[i]) * multiplier;
        multiplier *= 60;
    }
    return seconds;
}

self.onmessage = async (e) => {
    const { type, data } = e.data;

    if (type === 'load') {
        try {
            if (!ffmpeg) {
                ffmpeg = createFFmpeg({
                    log: true,
                    corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
                    mainName: 'main',
                    logger: ({ message }) => { }
                });
            }
            if (!ffmpeg.isLoaded()) {
                await ffmpeg.load();
            }
            self.postMessage({ type: 'loaded' });
        } catch (error) {
            self.postMessage({ type: 'error', error: error.message });
        }
    } else if (type === 'convert') {
        const { file, fileName, format, id } = data;
        try {
            if (!ffmpeg || !ffmpeg.isLoaded()) {
                 if(!ffmpeg) {
                    ffmpeg = createFFmpeg({
                        log: true,
                        corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
                        mainName: 'main'
                    });
                 }
                 await ffmpeg.load();
            }

            let duration = 0;

            ffmpeg.setLogger(({ message }) => {
                if (message.includes('Duration:')) {
                    const durationMatch = message.match(/Duration:\\s*(\\d+:\\d+:\\d+\\.\\d+)/);
                    if (durationMatch && durationMatch[1]) {
                        duration = parseTime(durationMatch[1]);
                    }
                }

                if (message.includes('time=')) {
                    const timeMatch = message.match(/time=\\s*(\\S+)/);
                    if (timeMatch && timeMatch[1]) {
                        const timeStr = timeMatch[1];
                        const currentTime = parseTime(timeStr);
                        
                        if (duration > 0) {
                            const ratio = Math.min(currentTime / duration, 1);
                            self.postMessage({ 
                                type: 'progress', 
                                data: { id, ratio, percent: Math.round(ratio * 100) } 
                            });
                        }
                    }
                }
            });

            const ext = fileName.split('.').pop();
            const safeInputName = \`input.\${ext}\`;
            const outputName = \`output.\${format}\`;

            ffmpeg.FS('writeFile', safeInputName, await fetchFile(file));

            try {
                await ffmpeg.run('-i', safeInputName, outputName);
            } catch (e) {
                if (e.message && e.message.includes('exit(0)')) {
                    // Expected exit(0) - ignore
                } else {
                    throw e;
                }
            }

            const resultData = ffmpeg.FS('readFile', outputName);

            try {
                ffmpeg.FS('unlink', safeInputName);
                ffmpeg.FS('unlink', outputName);
            } catch (cleanupErr) { }

            const blob = new Blob([resultData.buffer], { type: \`video/\${format}\` });
    
            const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
            const resultName = \`\${nameWithoutExt}.\${format}\`;

            self.postMessage({
                type: 'done',
                data: { id, blob, name: resultName }
            });

            ffmpeg.setLogger(() => {});

            // Force cleanup to avoid "already running" errors
            try {
               if (ffmpeg) ffmpeg.exit();
            } catch (e) {}
            ffmpeg = null;

        } catch (error) {
            // Even on error, try to cleanup
            try {
               if (ffmpeg) ffmpeg.exit();
            } catch (e) {}
            ffmpeg = null;
            
            self.postMessage({ type: 'error', error: error.message });
        }
    }
};
`;

    let videoWorkerLoadingPromise = null;

    async function initVideoWorker() {
        if (videoWorker) return;
        if (videoWorkerLoadingPromise) return videoWorkerLoadingPromise;

        videoWorkerLoadingPromise = (async () => {
            try {
                // Fetch FFmpeg library from main thread to bypass Blob Worker restrictions
                const response = await fetch('https://unpkg.com/@ffmpeg/ffmpeg@0.11.0/dist/ffmpeg.min.js');
                if (!response.ok) throw new Error('Failed to load FFmpeg library');
                const ffmpegLib = await response.text();

                const combinedCode = 'const document = { baseURI: self.location.href };\n' + ffmpegLib + '\n' + workerLogicCode;
                const blob = new Blob([combinedCode], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);

                videoWorker = new Worker(workerUrl);
                videoWorker.addEventListener('message', handleWorkerMessage);
                videoWorker.postMessage({ type: 'load' }); // Preload FFmpeg
            } catch (e) {
                console.error(e);
                alert('変換エンジンの準備に失敗しました: ' + e.message);
                videoConvertBtn.disabled = false;
                videoConvertBtn.textContent = '変換してダウンロード';
                throw e;
            }
        })();

        try {
            await videoWorkerLoadingPromise;
        } finally {
            videoWorkerLoadingPromise = null;
        }
    }

    function handleVideoFiles(files) {
        const newFiles = Array.from(files).filter(file => file.type.startsWith('video/'));

        if (newFiles.length === 0) {
            alert('動画ファイルを選択してください。');
            return;
        }

        newFiles.forEach(file => {
            videoQueue.push({
                id: Date.now() + Math.random(),
                file: file,
                name: file.name,
                status: 'pending'
            });
        });

        renderVideoFileList();
        showVideoEditor();

        // Start init worker when files are added (no await needed here as preloading)
        initVideoWorker().catch(console.error);
    }

    function renderVideoFileList() {
        videoFileListContainer.innerHTML = '';
        videoFileCountSpan.textContent = `(${videoQueue.length})`;

        videoQueue.forEach(item => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            const iconDiv = document.createElement('div');
            iconDiv.className = 'file-preview';
            iconDiv.style.display = 'flex';
            iconDiv.style.alignItems = 'center';
            iconDiv.style.justifyContent = 'center';
            iconDiv.style.backgroundColor = '#f1f5f9';
            iconDiv.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l5 5-5 5"/><path d="M4 4v16h16V4H4z"/></svg>';

            const name = document.createElement('div');
            name.className = 'file-name';
            name.textContent = item.name;
            name.title = item.name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => removeVideoFile(item.id);

            fileItem.appendChild(iconDiv);
            fileItem.appendChild(name);
            fileItem.appendChild(removeBtn);

            videoFileListContainer.appendChild(fileItem);
        });

        updateVideoConvertButtonText();

        if (videoQueue.length === 0) {
            resetVideoUI();
        }
    }

    function updateVideoConvertButtonText() {
        if (videoQueue.length > 1) {
            videoConvertBtn.textContent = '一括変換してZIPでダウンロード';
        } else {
            videoConvertBtn.textContent = '変換してダウンロード';
        }
    }

    function removeVideoFile(id) {
        videoQueue = videoQueue.filter(item => item.id !== id);
        renderVideoFileList();
    }

    function showVideoEditor() {
        videoDropZone.classList.add('hidden');
        videoEditorArea.classList.remove('hidden');
    }

    function resetVideoUI() {
        videoQueue = [];
        videoFileListContainer.innerHTML = '';
        videoFileCountSpan.textContent = '(0)';
        updateVideoConvertButtonText();
        videoEditorArea.classList.add('hidden');
        videoDropZone.classList.remove('hidden');
        videoProgressContainer.classList.add('hidden');

        // Terminate worker to free memory? Or keep it?
        // videoWorker.terminate(); videoWorker = null; // Maybe keep it for better UX next time
    }

    // -- Conversion Execution State --
    let videoResults = [];
    let currentVideoIdx = 0;
    let isVideoConverting = false;

    async function convertVideoAndDownload() {
        if (videoQueue.length === 0 || isVideoConverting) return;

        try {
            await initVideoWorker();
        } catch (e) {
            return; // Already handled in initVideoWorker
        }
        isVideoConverting = true;
        videoResults = [];
        currentVideoIdx = 0;

        const format = videoFormatSelect.value;
        const btnOriginalText = videoConvertBtn.textContent;
        videoConvertBtn.textContent = '初期化中...';
        videoConvertBtn.disabled = true;

        // Reset & Show Progress
        videoProgressBar.style.width = '0%';
        videoProgressText.textContent = '準備中...';
        videoFileProgress.textContent = `0/${videoQueue.length}`;
        videoProgressContainer.classList.remove('hidden');

        // Start first item
        processNextVideoItem(format);
    }

    function processNextVideoItem(format) {
        if (currentVideoIdx >= videoQueue.length) {
            // All done
            finishVideoConversion();
            return;
        }

        const item = videoQueue[currentVideoIdx];
        videoFileProgress.textContent = `${currentVideoIdx + 1}/${videoQueue.length}`;
        videoProgressText.textContent = `変換中... (${item.name})`;
        videoProgressBar.style.width = '0%';

        videoWorker.postMessage({
            type: 'convert',
            data: {
                id: item.id,
                file: item.file,
                fileName: item.name,
                format: format
            }
        });
    }

    function handleWorkerMessage(e) {
        const { type, data, error } = e.data;
        const format = videoFormatSelect.value;

        if (type === 'loaded') {
            console.log('Video Worker Loaded');
        } else if (type === 'progress') {
            const { percent, ratio } = data;
            videoProgressBar.style.width = `${percent}%`;
            const item = videoQueue[currentVideoIdx];
            videoProgressText.textContent = `変換中... ${percent}% (${item ? item.name : ''})`;

        } else if (type === 'done') {
            videoResults.push(data);
            currentVideoIdx++;
            processNextVideoItem(format);

        } else if (type === 'error') {
            console.error('Worker Error:', error);
            alert('変換エラー: ' + error);
            isVideoConverting = false;
            videoConvertBtn.disabled = false;
            videoConvertBtn.textContent = '変換してダウンロード'; // Reset text
            videoProgressContainer.classList.add('hidden');
        }
    }

    async function finishVideoConversion() {
        videoProgressText.textContent = '変換完了！';
        videoProgressBar.style.width = '100%';

        try {
            if (videoResults.length === 1) {
                downloadBlob(videoResults[0].blob, videoResults[0].name);
            } else {
                const zip = new JSZip();
                videoResults.forEach(result => {
                    zip.file(result.name, result.blob);
                });
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(zipBlob, 'videos_converted.zip');
            }
        } catch (e) {
            console.error(e);
            alert('ダウンロード処理中にエラーが発生しました');
        }

        isVideoConverting = false;
        videoConvertBtn.disabled = false;
        updateVideoConvertButtonText();
    }
});
