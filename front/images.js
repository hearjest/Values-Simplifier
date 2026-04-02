
const closeUpBackground = document.getElementById('imgCloseUp');
const closeUpImg = document.getElementById('closeUp');

closeUpBackground.addEventListener('click', () => {
    closeUpBackground.style.display = 'none';
    closeUpImg.style.display = 'none';
});

closeUpImg.addEventListener('click', () => {
    window.open(closeUpImg.src);
});

function addImgToBox(imgBox, link) {
    const cleanup = new AbortController();
    const { signal } = cleanup;
    let container = document.createElement('div');
    container.className = 'image-container';
    let img = document.createElement('img');
    img.src = link;
    img.addEventListener('click', () => {
        closeUpBackground.style.display = 'flex';
        closeUpBackground.style.width = '100%';
        closeUpImg.style.display = 'block';
        closeUpImg.src = link;
        closeUpImg.target = "_blank";
    },{signal});
    let optionsDiv = document.createElement('div');
    optionsDiv.className = 'image-options';
    let optionsBtn = document.createElement('button');
    optionsBtn.className = 'options-btn';
    optionsBtn.innerHTML = '⋮';
    optionsBtn.type = 'button';
    let menu = document.createElement('div');
    menu.className = 'options-menu';
    let downloadBtn = document.createElement('button');
    downloadBtn.className = 'menu-item';
    downloadBtn.textContent = 'Download';
    downloadBtn.addEventListener('onClick',()=>{
        window.open(link, '_blank');
        menu.classList.remove('show');
    },{signal});
    let deleteBtn = document.createElement('button');
    deleteBtn.className = 'menu-item';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
        const pathname = new URL(link).pathname;
        const fileName = pathname.substring(pathname.lastIndexOf('/') + 1).split('?')[0];
        const res = await fetch('/api/removeImage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName }),
            credentials: 'include',
        });
        if (res.ok) {
            cleanup.abort();
            container.remove();
        }
}, { once: true,signal });
    menu.append(downloadBtn, deleteBtn);
    optionsDiv.append(optionsBtn, menu);
    optionsBtn.addEventListener('click',(e)=>{
        e.stopPropagation();
        document.querySelectorAll('.options-menu.show').forEach(m => {
            if (m !== menu) m.classList.remove('show');
        });
        menu.classList.toggle('show');
    },{signal})
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            menu.classList.remove('show');
        }
    },{signal});
    container.append(optionsDiv, img);
    imgBox.append(container);
}

async function loadUserImages() {
    try {
        const response = await fetch('/api/getFiles', {
            method: 'GET',
            credentials: 'include'
        });
        const res = await response.json();
        let imgBox = document.getElementById('imgBox');
        imgBox.innerHTML = '';
        if (res.result && res.result.length > 0) {
            for (let i = 0; i < res.result.length; i++) {
                const link = res.result[i];
                addImgToBox(imgBox, link);
            }
        }
    } catch (error) {
        console.error('Error loading images:', error);
    }
}

const getFilesBtn = document.getElementById('getFilesBtn');
getFilesBtn.addEventListener('click', loadUserImages);

const syncButton = document.getElementById('sync');
syncButton.addEventListener('click', async () => {
    await loadUserImages();
});

async function deleteImg(link,container){
    const pathname=new URL(link).pathname
        const fileName=pathname.substring(pathname.lastIndexOf('/') + 1).split('?')[0];
        let res = await fetch("/api/removeImage", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: fileName }),
            credentials: "include",
        });
        if (res.ok) {
            container.remove();
        }
}