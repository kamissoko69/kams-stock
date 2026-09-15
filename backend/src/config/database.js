import pg from "pg"; import dotenv from "dotenv"; dotenv.config();
const {Pool}=pg; export const pool=new Pool({host:process.env.DB_HOST||"postgres",port:+(process.env.DB_PORT||5432),database:process.env.DB_NAME||"kams_stock",user:process.env.DB_USER||"kams_admin",password:process.env.DB_PASSWORD||"kams_password",max:15});
export const query=(q,p)=>pool.query(q,p);
export async function tx(fn){const c=await pool.connect();try{await c.query("BEGIN");const r=await fn(c);await c.query("COMMIT");return r}catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}}