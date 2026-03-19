const cat = document.getElementById('THE-CAGE');
const bod=document.body;
const giffy=document.getElementById('THE-CREATURE')
const oggiffy=giffy.src;
bod.addEventListener('click',(e)=>{
    restartGippy();
    cat.style.visibility="visible"
    console.log("Cat")
    const x=e.clientX;
    const y=e.clientY;
    cat.style.left=x+"px";
    cat.style.top=y+'px';
    setTimeout(()=>{
        cat.style.visibility="hidden"
    },1200);
    
})

function restartGippy(){
    giffy.src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
    requestAnimationFrame(()=>{
        giffy.src=oggiffy;
    })
}
