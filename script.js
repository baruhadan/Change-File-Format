document.addEventListener('DOMContentLoaded', () => {
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
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    // File Input Events
    selectFileBtn.addEventListener('click', () => fileInput.click());
    addMoreBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
        // Reset input to allow selecting same file again
        fileInput.value = '';
    });

    // Reset Event
    resetBtn.addEventListener('click', resetUI);

    // Convert Event
    convertBtn.addEventListener('click', convertAndDownload);

    // Update button text based on file count
    // Initial update not needed as queue starts empty, handled in renderFileList

    // Functions
    function handleFiles(files) {
        const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (newFiles.length === 0) {
            alert('画像ファイルを選択してください。');
            return;
        }

        newFiles.forEach(file => {
            // Read file for preview
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

        // Update button text
        updateConvertButtonText();

        // Hide editor if queue is empty
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
        // Determine extension
        let extension;
        if (format === 'image/jpeg') extension = 'jpg';
        else if (format === 'image/png') extension = 'png';
        else if (format === 'image/webp') extension = 'webp';
        else if (format === 'image/bmp') extension = 'bmp';
        else if (format === 'application/pdf') extension = 'pdf';
        else extension = 'bin'; // fallback

        // Show loading state
        const originalBtnText = convertBtn.textContent;
        convertBtn.textContent = '変換中...';
        convertBtn.disabled = true;

        try {
            const conversionPromises = fileQueue.map(item => processFile(item, format, extension));
            const results = await Promise.all(conversionPromises);

            if (results.length === 1) {
                // Single download
                const result = results[0];
                downloadBlob(result.blob, result.name);
            } else {
                // ZIP download
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

    // Helper to process a single file to Blob
    function processFile(item, format, extension) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
                const fileName = `${nameWithoutExt}.${extension}`;

                // Handle PDF separately
                if (format === 'application/pdf') {
                    try {
                        const { jsPDF } = window.jspdf;

                        // Create PDF matching image dimensions (pixels -> points)
                        // jsPDF default unit is mm, but we can use px or points.
                        // 1px = 0.75pt (approx) depending on DPI, but simply:
                        // Let's make the PDF page size match the image pixel size (in points/units)
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

                // Handle Image Formats (Canvas)
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;

                // Add white background for non-transparent formats
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
