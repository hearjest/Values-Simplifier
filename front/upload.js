const form = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const message = document.getElementById('message');
const uploadText = document.querySelector('.upload-text');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const progressStage = document.getElementById('progressStage');

function setMessageState(state) {
    message.classList.remove('success', 'error');
    if (state === 'success' || state === 'error') {
        message.classList.add(state);
    }
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

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        uploadText.textContent = e.target.files[0].name;
    } else {
        uploadText.textContent = 'Choose a file or drag it here';
    }
});

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
    let isClosed = false;

    const closeSocket = () => {
        if (isClosed) {
            return;
        }
        isClosed = true;
        socket.off('completed', onCompleted);
        socket.off('failed', onFailed);
        socket.off('processBegin', onProcessBegin);
        socket.off('bucketUpload', onBucketUpload);
        socket.disconnect();
    };

    const onCompleted = ({ url, oldFilePath }) => {
        message.textContent = 'Job is done!';
        setMessageState('success');
        updateProgress(100, 'Completed', 'success');
        const imgBox = document.getElementById('imgBox');
        // eslint-disable-next-line
        addImgToBox(imgBox, url, oldFilePath);
        closeSocket();
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

    socket.on('completed', onCompleted);
    socket.on('failed', onFailed);
    socket.on('processBegin', onProcessBegin);
    socket.on('bucketUpload', onBucketUpload);

    try {
        const presignRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                "fileName": file.name,
                "mimeType": file.type,
                "size": file.size,
            }),
        });

        if (!presignRes.ok) {
            throw new Error('Could not get upload URL');
        }

        updateProgress(20, 'Upload URL ready. Uploading file...', 'working');
        const { url, newFileName, uuid } = await presignRes.json();

        const putRes = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": file.type || "application/octet-stream",
            },
            body: file,
        });
        if (!putRes.ok) throw new Error("Upload failed");

        message.textContent = "Upload success!";
        setMessageState();
        updateProgress(45, 'Upload complete. Scheduling job...', 'working');

        socket.emit("subTo", newFileName);
        const method = document.getElementById('method');
        const conc = method.value;

        const queueRes = await fetch("/api/upload/job", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fileName: file.name,
                method: conc,
                uuid: uuid,
                newFileName: newFileName,
                size: file.size,
                mimetype: file.type
            })
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

document.getElementById('funnybutton').addEventListener('click', async () => {
    console.log(await fetch('/api/checkHealth', {
        method: 'GET',
        credentials: "include"
    }));
});
