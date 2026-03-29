import {Server} from 'socket.io'

let io=null;

function initialize(expressApp){
    io = new Server(expressApp)
}

/* hi 
*/
function getIO(){
    if(io!=null){
        return io;
    }
    console.error("Socket failed to connect")
    return null;
}

export {initialize,getIO}