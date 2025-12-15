importScripts('https://unpkg.com/@ffmpeg/ffmpeg@0.11.0/dist/ffmpeg.min.js');

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
                    logger: ({ message }) => {
                        // Forward limited debug logs if needed, or handle progress logic here
                        // We will handle progress logic inside processVideoItem mainly,
                        // but setting a global logger here is also an option if we want to catch everything.
                        // For now, let's keep the custom logger inside the conversion flow to reset it easily.
                    }
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
                // Should be loaded, but check again
                if (!ffmpeg) {
                    ffmpeg = createFFmpeg({
                        log: true,
                        corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
                        mainName: 'main'
                    });
                }
                await ffmpeg.load();
            }

            // Progress tracking variables
            let duration = 0;

            ffmpeg.setLogger(({ message }) => {
                // 1. Duration
                if (message.includes('Duration:')) {
                    const durationMatch = message.match(/Duration:\s*(\d+:\d+:\d+\.\d+)/);
                    if (durationMatch && durationMatch[1]) {
                        duration = parseTime(durationMatch[1]);
                    }
                }

                // 2. Time/Progress
                if (message.includes('time=')) {
                    const timeMatch = message.match(/time=\s*(\S+)/);
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
            const safeInputName = `input.${ext}`;
            const outputName = `output.${format}`;

            ffmpeg.FS('writeFile', safeInputName, await fetchFile(file));

            await ffmpeg.run('-i', safeInputName, outputName);

            const resultData = ffmpeg.FS('readFile', outputName);

            // Cleanup
            try {
                ffmpeg.FS('unlink', safeInputName);
                ffmpeg.FS('unlink', outputName);
            } catch (cleanupErr) {
                console.error('Cleanup error', cleanupErr);
            }

            const blob = new Blob([resultData.buffer], { type: `video/${format}` });

            // Generate result name
            const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
            const resultName = `${nameWithoutExt}.${format}`;

            self.postMessage({
                type: 'done',
                data: { id, blob, name: resultName }
            });

            // Reset logger
            ffmpeg.setLogger(() => { });

            // Try to exit/cleanup to free memory if possible, though creating fresh might be safer/cleaner 
            // but slow. For now keep the instance alive for next files.
            // ffmpeg.exit(); // Calling exit() might kill the instance completely.

        } catch (error) {
            self.postMessage({ type: 'error', error: error.message });
        }
    }
};
