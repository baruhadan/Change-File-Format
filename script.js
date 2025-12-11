document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectFileBtn = document.getElementById('select-file-btn');
    const editorArea = document.getElementById('editor-area');
    const imagePreview = document.getElementById('image-preview');
    const formatSelect = document.getElementById('format-select');
    const convertBtn = document.getElementById('convert-btn');
    const resetBtn = document.getElementById('reset-btn');

    let originalImage = null;
    let originalFileName = '';

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
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // File Input Events
    selectFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Reset Event
    resetBtn.addEventListener('click', resetUI);

    // Convert Event
    convertBtn.addEventListener('click', convertImage);

    // Functions
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('画像ファイルを選択してください。');
            return;
        }

        originalFileName = file.name.split('.')[0]; 
        
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage = new Image();
            originalImage.onload = () => {
                showEditor();
            };
            originalImage.src = e.target.result;
            imagePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function showEditor() {
        dropZone.classList.add('hidden');
        editorArea.classList.remove('hidden');
    }

    function resetUI() {
        fileInput.value = '';
        originalImage = null;
        originalFileName = '';
        imagePreview.src = '';
        
        editorArea.classList.add('hidden');
        dropZone.classList.remove('hidden');
    }

    function convertImage() {
        if (!originalImage) return;

        const format = formatSelect.value;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas dimensions to match image
        canvas.width = originalImage.naturalWidth;
        canvas.height = originalImage.naturalHeight;

        // Draw image
        // Check if format is JPEG to add white background (prevent black transparency)
        if (format === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(originalImage, 0, 0);

        // Convert and Download
        canvas.toBlob((blob) => {
            if (!blob) {
                alert('変換に失敗しました。');
                return;
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const extension = format.split('/')[1];
            
            a.href = url;
            a.download = `${originalFileName}_converted.${extension}`;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, format, 0.9); // Quality 0.9 for JPEG/WEBP
    }
});
