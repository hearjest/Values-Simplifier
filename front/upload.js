const form = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const message = document.getElementById('message');
const uploadText = document.querySelector('.upload-text');

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
    // eslint-disable-next-line
    const socket = io();
    
    socket.on("completed", ({ url ,oldFilePath}) => {
        let imgBox = document.getElementById('imgBox');
        // eslint-disable-next-line
        addImgToBox(imgBox, url,oldFilePath);
        socket.disconnect();
    });

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
        if (presignRes.ok) {
            console.log("Uploaded metadata!");
        }
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
        if (putRes.ok) {
            console.log("Uploaded putres?");
        }
        socket.emit("subTo", newFileName);
        const method = document.getElementById('method');
        const conc = method.value;
        await fetch("/api/upload/job", {
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
        
    } catch {
        message.textContent = 'An error occurred while uploading the file';
        message.className = 'message error';
    }
});

document.getElementById('funnybutton').addEventListener('click', async () => {
    console.log(await fetch('/api/checkHealth', {
        method: 'GET',
        credentials: "include"
    }));
});
