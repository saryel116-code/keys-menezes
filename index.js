const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(express.json());

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Erro ao abrir a BD', err.message);
    else console.log('Conectado à base de dados SQLite.');
});

db.run(`CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    days INTEGER,
    device_id TEXT,
    expires_at DATETIME
)`);

app.get('/api/validate', (req, res) => {
    const { key, device_id } = req.query;

    if (!key || !device_id) {
        return res.json({ success: false, message: 'Dados incompletos.' });
    }

    db.get(`SELECT * FROM licenses WHERE key = ?`, [key], (err, row) => {
        if (err) return res.json({ success: false, message: 'Erro no servidor.' });
        
        if (!row) {
            return res.json({ success: false, message: 'Chave inválida!' });
        }

        const now = new Date();

        if (!row.device_id) {
            const expiresAt = new Date();
            expiresAt.setDate(now.getDate() + row.days);

            db.run(`UPDATE licenses SET device_id = ?, expires_at = ? WHERE key = ?`, 
                [device_id, expiresAt.toISOString(), key], (updateErr) => {
                    if (updateErr) return res.json({ success: false, message: 'Erro ao ativar chave.' });
                    return res.json({ success: true, message: 'Acesso autorizado!' });
                });
        } else {
            if (row.device_id !== device_id) {
                return res.json({ success: false, message: 'Chave em uso noutro dispositivo!' });
            }

            const expiryDate = new Date(row.expires_at);
            if (now > expiryDate) {
                return res.json({ success: false, message: 'Chave expirada!' });
            }

            return res.json({ success: true, message: 'Acesso autorizado!' });
        }
    });
});

app.get('/api/create', (req, res) => {
    const { key, days } = req.query;
    if (!key || !days) return res.send('Falta a key ou os days.');

    db.run(`INSERT INTO licenses (key, days) VALUES (?, ?)`, [key, parseInt(days)], function(err) {
        if (err) return res.send('Erro: A chave já existe ou dados inválidos.');
        res.send(`Chave <b>${key}</b> criada com validade de <b>${days} dias</b>!`);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));
