/* global YT */
const form = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const message = document.getElementById('message');
const uploadText = document.querySelector('.upload-text');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const progressStage = document.getElementById('progressStage');
const youtubeForm = document.getElementById('youtubeForm');
const youtubeUrlInput = document.getElementById('youtubeUrl');
const srtFormTest = document.getElementById('srtFormTest');
const srtFileInputTest = document.getElementById('srtFileInputTest');
const ytPlayerContainer = document.getElementById('ytPlayer');

let syncintervalID = null;
let ytPlayer = null;
let subsAbortController = null;

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=[A-Za-z0-9_-]{11}|shorts\/[A-Za-z0-9_-]{11}|embed\/[A-Za-z0-9_-]{11}|live\/[A-Za-z0-9_-]{11})|youtu\.be\/[A-Za-z0-9_-]{11})(?:[?&][^\s]*)?$/i;

function extractVideoIdFromSrtFileName(fileName) {
    const match = fileName.match(/\[([A-Za-z0-9_-]{11})\]/);
    return match ? match[1] : '';
}

function extractVideoIdFromPresignedLink(link) {
    try {
        const noQuery = String(link || '').split('?')[0];
        const fileName = noQuery.split('/').pop() || '';
        return fileName.replace(/\.srt$/i, '');
    } catch {
        return '';
    }
}

function setMessageState(state) {
    message.classList.remove('success', 'error');
    if (state === 'success' || state === 'error') {
        message.classList.add(state);
    }
}

function parseSubs(srtText) {
    const re = /^\d+\s*\r?\n(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})\s*\r?\n([\s\S]*?)(?=\r?\n\r?\n\d+\s*\r?\n|\s*$)/gm;
    return [...srtText.matchAll(re)].map((m) => ({
        start: srtTimeToSeconds(m[1]),
        end: srtTimeToSeconds(m[2]),
        text: m[3].trim(),
    }));
}
 
function srtTimeToSeconds(t) {
    const [hms, ms] = t.split(',');
    const [h, m, s] = hms.split(':').map(Number);
    return h * 3600 + m * 60 + s + Number(ms) / 1000;
}

function renderSubs(parsedSrtText) {
    const pane = document.getElementById('subsPan');
    if (!pane) return;

    if (subsAbortController) {
        subsAbortController.abort();
    }
    subsAbortController = new AbortController();

    pane.innerHTML = parsedSrtText
        .map((sub, i) => `<div class="subs" id="sub-${i}">${sub.text}</div>`)
        .join('');

    pane.addEventListener(
        'click',
        (e) => {
            const line = e.target.closest('.subs');
            if (!line || !ytPlayer) return;

            const index = parseInt(line.id.split('-')[1], 10);
            if (Number.isNaN(index)) return;

            ytPlayer.seekTo(parsedSrtText[index].start, true);
            ytPlayer.playVideo();
        },
        { signal: subsAbortController.signal }
    );
}

function syncToSubs(parsedSrtText) {
    let subIndex = -1;

    if (syncintervalID != null) {
        clearInterval(syncintervalID);
    }

    const id = setInterval(() => {
        if (!ytPlayer || ytPlayer.getPlayerState() !== YT.PlayerState.PLAYING) return;

        const currentTime = ytPlayer.getCurrentTime();
        const index = parsedSrtText.findIndex((s) => currentTime >= s.start && currentTime <= s.end);
        if (index === subIndex) return;

        subIndex = index;
        document.querySelectorAll('.subs').forEach((el) => el.classList.remove('active'));

        if (index !== -1) {
            const el = document.getElementById(`sub-${index}`);
            if (el) {
                el.classList.add('active');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, 500);

    return id;
}

function updateProgress(percent, stageText, state = 'working') {
    const safePercent = Math.max(0, Math.min(100, percent));

    if (progressContainer) {
        progressContainer.style.display = 'block';
        progressContainer.dataset.state = state;
    }
    if (progressFill) {
        progressFill.style.width = `${safePercent}%`;
    }
    if (progressLabel) {
        progressLabel.textContent = `${Math.round(safePercent)}%`;
    }
    if (progressStage && stageText) {
        progressStage.textContent = stageText;
    }
}

async function completeWithSubtitles(payload, closeSocket) {
    const { url, videoId } = payload || {};
    console.log('[socket] completed payload', payload);

    if (!url || !videoId) {
        message.textContent = 'Completed event payload is missing url or videoId';
        setMessageState('error');
        updateProgress(100, 'Failed', 'error');
        closeSocket();
        return;
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Could not fetch subtitles file from completed URL');
    }
    const srtBuffer = await response.arrayBuffer();
    const srtText = new TextDecoder('utf-8').decode(srtBuffer);

    if (ytPlayerContainer) {
        ytPlayerContainer.style.display = 'block';
    }

    if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        ytPlayer.destroy();
    }

    ytPlayer = new YT.Player('ytPlayer', {
        videoId,
        events: {
            onReady: () => {
                const subs = parseSubs(srtText);
                console.log(subs)
                renderSubs(subs);
                syncintervalID = syncToSubs(subs);
            },
        },
    });

    message.textContent = 'Job is done!';
    setMessageState('success');
    updateProgress(100, 'Completed', 'success');
    closeSocket();
}

function createSocketHandlers(socket, options = {}) {
    const { onBeforeComplete } = options;
    let isClosed = false;

    const closeSocket = () => {
        if (isClosed) return;
        isClosed = true;

        socket.off('completed', onCompleted);
        socket.off('failed', onFailed);
        socket.off('processBegin', onProcessBegin);
        socket.off('bucketUpload', onBucketUpload);
        socket.off('downloadingVideo', onDownloadingVideo);
        socket.off('extractedAudio', onExtractedAudio);
        socket.off('Running model on audio', onRunningModel);
        socket.off('creatingSubtitles', onCreatingSubtitles);
        socket.off('uplaodedSubtitle', onUploadedSubtitle);

        console.log('[socket] disconnect');
        socket.disconnect();
    };

    const onCompleted = async (payload) => {
        try {
            let finalPayload = payload;
            if (onBeforeComplete) {
                const maybePayload = await onBeforeComplete(payload);
                if (maybePayload && typeof maybePayload === 'object') {
                    finalPayload = maybePayload;
                }
            }
            await completeWithSubtitles(finalPayload, closeSocket);
        } catch (error) {
            console.error('[socket] failed to handle completed event', error);
            message.textContent = 'An error occurred while finalizing the completed job';
            setMessageState('error');
            updateProgress(100, 'Failed', 'error');
            closeSocket();
        }
    };

    const onFailed = () => {
        message.textContent = 'SOMETHING WENT WRONG';
        setMessageState('error');
        updateProgress(100, 'Failed', 'error');
        closeSocket();
    };

    const onProcessBegin = () => {
        message.textContent = 'Worker now processing image...';
        setMessageState();
        updateProgress(65, 'Worker processing image...', 'working');
    };

    const onBucketUpload = () => {
        message.textContent = 'Uploading your processed image to the cloud...';
        setMessageState();
        updateProgress(85, 'Uploading processed image...', 'working');
    };

    const onDownloadingVideo = () => { updateProgress(30, 'Downloading video audio...', 'working'); };
    const onExtractedAudio = () => { updateProgress(50, 'Audio extracted. Running transcription...', 'working'); };
    const onRunningModel = () => { updateProgress(65, 'Transcribing with Whisper...', 'working'); };
    const onCreatingSubtitles = () => { updateProgress(85, 'Creating subtitle file...', 'working'); };
    const onUploadedSubtitle = () => { updateProgress(95, 'Uploading subtitles...', 'working'); };

    socket.on('completed', onCompleted);
    socket.on('failed', onFailed);
    socket.on('processBegin', onProcessBegin);
    socket.on('bucketUpload', onBucketUpload);
    socket.on('downloadingVideo', onDownloadingVideo);
    socket.on('extractedAudio', onExtractedAudio);
    socket.on('Running model on audio', onRunningModel);
    socket.on('creatingSubtitles', onCreatingSubtitles);
    socket.on('uplaodedSubtitle', onUploadedSubtitle);

    return { closeSocket };
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadText.textContent = e.target.files[0].name;
        } else {
            uploadText.textContent = 'Choose a file or drag it here';
        }
    });
}

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = document.getElementById('fileInput').files[0];

        if (!file) {
            message.textContent = 'Select a file before uploading';
            setMessageState('error');
            return;
        }

        setMessageState();
        message.textContent = 'Preparing upload...';
        updateProgress(5, 'Preparing upload...', 'working');

        // eslint-disable-next-line
        const socket = io();
        const { closeSocket } = createSocketHandlers(socket);

        try {
            const presignRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    fileName: file.name,
                    mimeType: file.type,
                    size: file.size,
                }),
            });

            if (!presignRes.ok) {
                throw new Error('Could not get upload URL');
            }

            updateProgress(20, 'Upload URL ready. Uploading file...', 'working');
            const { url, newFileName, uuid } = await presignRes.json();

            const putRes = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                },
                body: file,
            });
            if (!putRes.ok) throw new Error('Upload failed');

            message.textContent = 'Upload success!';
            setMessageState();
            updateProgress(45, 'Upload complete. Scheduling job...', 'working');

            console.log('[socket] subTo', newFileName);
            socket.emit('subTo', newFileName);

            const method = document.getElementById('method');
            const conc = method.value;

            const queueRes = await fetch('/api/upload/job', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    method: conc,
                    uuid,
                    newFileName,
                    size: file.size,
                    mimetype: file.type,
                }),
            });

            if (!queueRes.ok) {
                throw new Error('Could not queue processing job');
            }

            updateProgress(55, 'Job queued. Waiting for worker...', 'working');
        } catch {
            message.textContent = 'An error occurred while uploading the file';
            setMessageState('error');
            updateProgress(100, 'Failed', 'error');
            closeSocket();
        }
    });
}

if (youtubeForm && youtubeUrlInput) {
    youtubeForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (syncintervalID != null) {
            clearInterval(syncintervalID);
            syncintervalID = null;
        }

        const youtubeUrl = youtubeUrlInput.value.trim();
        if (!YOUTUBE_URL_REGEX.test(youtubeUrl)) {
            message.textContent = 'Please enter a valid YouTube URL';
            setMessageState('error');
            return;
        }

        setMessageState();
        message.textContent = 'Submitting YouTube URL...';
        updateProgress(15, 'Valid URL. Queueing subtitle job...', 'working');

        try {
            const queueRes = await fetch('/api/makeSubtitles', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: youtubeUrl,
                    fileName: 'youtube-subtitle-request',
                    method: 'subtitle',
                    uuid: `yt-${Date.now()}`,
                    newFileName: youtubeUrl,
                    mimetype: 'text/plain',
                    size: 0,
                }),
            });

            if (!queueRes.ok) {
                message.innerText="Failed to download via yt_dpl, likely need to change VPN location"
                throw new Error('Could not queue subtitle job');
            }

            const { videoId } = await queueRes.json();

            // eslint-disable-next-line
            const socket = io();
            createSocketHandlers(socket, {
                onBeforeComplete: async (payload) => {
                    if (payload && payload.videoId) {
                        return payload;
                    }
                    return {
                        ...payload,
                        videoId,
                    };
                },
            });

            message.textContent = 'YouTube subtitle job queued';
            setMessageState('success');
            updateProgress(55, 'Subtitle job queued.', 'working');

            console.log('[socket] subTo', videoId);
            socket.emit('subTo', videoId);
            youtubeForm.reset();
        } catch {
            message.textContent = 'An error occurred while submitting the YouTube URL';
            setMessageState('error');
            updateProgress(100, 'Failed', 'error');
        }
    });
}

if (srtFormTest && srtFileInputTest) {
    srtFormTest.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            if (syncintervalID != null) {
                clearInterval(syncintervalID);
                syncintervalID = null;
            }

            setMessageState();
            message.textContent = 'Loading local SRT...';
            updateProgress(20, 'Reading local SRT...', 'working');

            const srtFile = srtFileInputTest.files[0];
            const videoId = extractVideoIdFromSrtFileName(srtFile.name);
            const srtBuffer = await srtFile.arrayBuffer();
            const srtText = new TextDecoder('utf-8').decode(srtBuffer);
            const subs = parseSubs(srtText);

            if (ytPlayerContainer) {
                ytPlayerContainer.style.display = 'block';
            }

            if (ytPlayer && typeof ytPlayer.destroy === 'function') {
                ytPlayer.destroy();
            }

            updateProgress(70, 'Initializing player with local subtitles...', 'working');
            ytPlayer = new YT.Player('ytPlayer', {
                videoId,
                events: {
                    onReady: () => {
                        renderSubs(subs);
                        syncintervalID = syncToSubs(subs);
                        message.textContent = 'Local SRT loaded';
                        setMessageState('success');
                        updateProgress(100, 'Ready', 'success');
                    },
                },
            });
        } catch {
            message.textContent = 'Could not load local SRT';
            setMessageState('error');
            updateProgress(100, 'Failed', 'error');
        }
    });
}

const funnyButton = document.getElementById('funnybutton');
if (funnyButton) {
    funnyButton.addEventListener('click', async () => {
        console.log(
            await fetch('/api/checkHealth', {
                method: 'GET',
                credentials: 'include',
            })
        );
    });
}


async function loadUsersSubs() {
    try {
        const response = await fetch('/api/getSubs', {
            method: 'GET',
            credentials: 'include'
        });
        const res = await response.json();
        const imgBox = document.querySelector('.yt-list-users-subs');
        if (!imgBox) return;
        imgBox.innerHTML = '';
        if (res.result && res.result.length > 0) {
            for (let i = 0; i < res.result.length; i++) {
                const link = res.result[i];
                addSubsEntry(link);
            }
        }
    } catch (error) {
        console.error('Error loading images:', error);
    }
}

function addSubsEntry(link){
    const list = document.querySelector('.yt-list-users-subs');
    if (!list || !link) return;

    const videoId = extractVideoIdFromPresignedLink(link);
    let select = list.querySelector('select[name="usersSubsPick"]');
    if (!select) {
        select = document.createElement('select');
        select.name = 'usersSubsPick';
        list.appendChild(select);
    }

    const option = document.createElement('option');
    option.value = link;
    option.dataset.videoId = videoId;
    option.textContent = videoId || 'unknown-video-id';
    select.appendChild(option);

    let loadBtn = list.querySelector('[data-load-users-subs="1"]');
    if (loadBtn) return;

    loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.textContent = 'Load selected';
    loadBtn.dataset.loadUsersSubs = '1';
    loadBtn.addEventListener('click', async () => {
        const selectedOption = select.options[select.selectedIndex];
        if (!selectedOption || !selectedOption.value) {
            message.textContent = 'Select a subtitles file first';
            setMessageState('error');
            return;
        }

        try {
            if (syncintervalID != null) {
                clearInterval(syncintervalID);
                syncintervalID = null;
            }

            setMessageState();
            message.textContent = 'Loading selected subtitles...';
            updateProgress(30, 'Downloading selected SRT...', 'working');

            const response = await fetch(selectedOption.value);
            if (!response.ok) {
                throw new Error('Could not fetch selected SRT');
            }
            const srtText = await response.text();
            const subs = parseSubs(srtText);

            if (ytPlayerContainer) {
                ytPlayerContainer.style.display = 'block';
            }

            if (ytPlayer && typeof ytPlayer.destroy === 'function') {
                ytPlayer.destroy();
            }

            updateProgress(75, 'Initializing player...', 'working');
            ytPlayer = new YT.Player('ytPlayer', {
                videoId: selectedOption.dataset.videoId || '',
                events: {
                    onReady: () => {
                        renderSubs(subs);
                        syncintervalID = syncToSubs(subs);
                        message.textContent = 'Selected subtitles loaded';
                        setMessageState('success');
                        updateProgress(100, 'Ready', 'success');
                    },
                },
            });
        } catch {
            message.textContent = 'Could not load selected subtitles';
            setMessageState('error');
            updateProgress(100, 'Failed', 'error');
        }
    });
    list.appendChild(loadBtn);
}

if (document.querySelector('.yt-list-users-subs')) {
    loadUsersSubs();
}