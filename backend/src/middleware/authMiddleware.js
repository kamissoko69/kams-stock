import jwt from "jsonwebtoken";
const secret=process.env.JWT_SECRET||"change-me";
export function auth(req,res,next){const h=req.headers.authorization||"";try{if(!h.startsWith("Bearer "))throw 0;req.user=jwt.verify(h.slice(7),secret);next()}catch{res.status(401).json({message:"Session invalide ou expirée."})}}
export const allow=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({message:"Accès refusé."});