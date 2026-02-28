import pino from 'pino'
import {getRequestId} from './context.js'

const logger = pino({
    level:'info',
    transport:{
        target:'pino-pretty',
        options:{
            colorize:true,
            destination:2,
            mkdir:true
       }
   },
   timestamp: pino.stdTimeFunctions.isoTime,
    mixin() {
        const requestId= getRequestId();
        return requestId?{requestId}:{};
   },
    bindings:(bindings)=>{
        return {
            pid: bindings.pid,
            host: bindings.hostname,
        };
    },
})

export {logger}