
import {ipKeyGenerator, rateLimit} from 'express-rate-limit'
export const uploadLimiterrateLimit=rateLimit({windowMs:60000,max:5});
export const loginLimiterrateLimit=rateLimit({windowMs:900000,max:5});
export const getFilesLimiterrateLimit=rateLimit({windowMs:900000,max:5});