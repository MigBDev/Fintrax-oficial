import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import './config/passport.js'; // Import passport configuration
import usuarioRoutes from './routes/usuarioRoutes.js';
import transaccionRoutes from './routes/TransaccionRoutes.js';
import categoriaRoutes from './routes/CategoriaRoutes.js'; // ✅ NUEVO
import metasAhorroRoutes from './routes/metasAhorroRoutes.js'; // ✅ NUEVO
import path from 'path';
dotenv.config({ path: '../.env' });
import chatbotRoutes from "./routes/chatbot.routes.js";




const app = express();

app.use(cors());
app.use(express.json());

app.use(passport.initialize());

// Rutas
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/transacciones', transaccionRoutes);
app.use('/api/categorias', categoriaRoutes); //   
app.use('/api/metas', metasAhorroRoutes); // ✅ NUEVO
app.use("/api/chatbot", chatbotRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/', (req, res) => {
  res.send('Backend de FintraX funcionando');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});