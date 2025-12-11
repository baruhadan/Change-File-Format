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

        // Hide editor if queue is empty
        if (fileQueue.length === 0) {
            resetUI();
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

        editorArea.classList.add('hidden');
        dropZone.classList.remove('hidden');
    }

    async function convertAndDownload() {
        if (fileQueue.length === 0) return;

        const format = formatSelect.value;
        const extension = format.split('/')[1]; // png, jpeg, webp
        const zip = new JSZip();

        // Show loading state
        const originalBtnText = convertBtn.textContent;
        convertBtn.textContent = '変換中...';
        convertBtn.disabled = true;

        try {
            const conversionPromises = fileQueue.map(item => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;

                        // Add white background for JPEG
                        if (format === 'image/jpeg') {
                            ctx.fillStyle = '#FFFFFF';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }

                        ctx.drawImage(img, 0, 0);

                        canvas.toBlob((blob) => {
                            if (blob) {
                                // Create filename for ZIP entry
                                const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
                                resolve({
                                    name: `${nameWithoutExt}.${extension}`,
                                    blob: blob
                                });
                            } else {
                                reject('Conversion failed');
                            }
                        }, format, 0.9);
                    };
                    img.onerror = reject;
                    img.src = item.preview;
                });
            });

            const results = await Promise.all(conversionPromises);

            // Add files to ZIP
            results.forEach(result => {
                zip.file(result.name, result.blob);
            });

            // Generate ZIP
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            // Download
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'images_converted.zip';
            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error(error);
            alert('変換中にエラーが発生しました。');
        } finally {
            convertBtn.textContent = originalBtnText;
            convertBtn.disabled = false;
        }
    }
});
