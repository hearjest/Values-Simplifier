import {checkToken} from './jwtGen.js'

async function verifyToken(req, res, next) {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = checkToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
export {verifyToken} 