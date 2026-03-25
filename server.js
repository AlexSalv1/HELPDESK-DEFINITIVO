const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt'); // Segurança ativada

const app = express();
const PORT = 3000;

// --- CONFIGURAÇÕES ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: 'chave_secreta_do_projeto',
    resave: false,
    saveUninitialized: true
}));

// --- CONEXÃO E ESTRUTURA DO BANCO ---
const db = new sqlite3.Database('./banco_dados.sqlite', (err) => {
    if (err) console.error(err.message);
    else console.log('Conectado ao Banco de Dados SQLite.');
});

db.serialize(() => {
    // 1. Criar Tabelas
    db.run(`CREATE TABLE IF NOT EXISTS Usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, email TEXT UNIQUE, senha TEXT, tipo TEXT, tema TEXT DEFAULT 'light')`);
    db.run(`CREATE TABLE IF NOT EXISTS Chamados (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT, descricao TEXT, categoria TEXT, resolucao TEXT, status TEXT DEFAULT 'Aberto', cliente_id INTEGER, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, concluido_em DATETIME)`);
    db.run(`CREATE TABLE IF NOT EXISTS Mensagens (id INTEGER PRIMARY KEY AUTOINCREMENT, chamado_id INTEGER, remetente_nome TEXT, remetente_tipo TEXT, texto TEXT, data_envio DATETIME DEFAULT CURRENT_TIMESTAMP)`);

    // 2. Prevenção de erros de colunas
    const colunasChamados = [
        "ALTER TABLE Chamados ADD COLUMN categoria TEXT",
        "ALTER TABLE Chamados ADD COLUMN descricao TEXT",
        "ALTER TABLE Chamados ADD COLUMN resolucao TEXT",
        "ALTER TABLE Chamados ADD COLUMN cliente_id INTEGER",
        "ALTER TABLE Chamados ADD COLUMN criado_em DATETIME DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE Chamados ADD COLUMN concluido_em DATETIME"
    ];
    colunasChamados.forEach(cmd => db.run(cmd, () => {}));
    db.run("ALTER TABLE Usuarios ADD COLUMN tema TEXT DEFAULT 'light'", () => {});

    // 3. Usuários Padrão com Bcrypt
    db.get("SELECT * FROM Usuarios WHERE email = 'admin@empresa.com'", async (err, row) => {
        if (!row) {
            const hashSenha = await bcrypt.hash('123456', 10);
            db.run("INSERT INTO Usuarios (nome, email, senha, tipo) VALUES ('Maria Cliente', 'maria@email.com', ?, 'cliente')", [hashSenha]);
            db.run("INSERT INTO Usuarios (nome, email, senha, tipo) VALUES ('João Admin', 'admin@empresa.com', ?, 'admin')", [hashSenha]);
            console.log("Usuários padrão criados com senhas protegidas!");
        }
    });
});

// --- ROTAS DE AUTENTICAÇÃO E USUÁRIO ---
// --- ROTA DE LOGIN COM RAIO-X ---
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    
    console.log(`\n🕵️ TENTATIVA DE LOGIN:`);
    console.log(`E-mail digitado: [${email}]`);
    console.log(`Senha digitada: [${senha}]`);

    db.get("SELECT * FROM Usuarios WHERE email = ?", [email], async (err, usuario) => {
        if (err) {
            console.error("❌ Erro no banco de dados:", err);
            return res.send("Erro interno.");
        }

        if (!usuario) {
            console.log("❌ RESULTADO: Usuário não encontrado no banco.");
            return res.send("<h1>Acesso Negado. Usuário não encontrado.</h1><a href='/'>Voltar</a>");
        }

        console.log(` Usuário encontrado no banco: ${usuario.nome}`);
        console.log(` Senha (Hash) salva no banco: ${usuario.senha}`);

        try {
            // Compara a senha digitada com o que está no banco
            const senhaValida = await bcrypt.compare(senha, usuario.senha);
            console.log(` Resultado do Bcrypt (As senhas batem?): ${senhaValida}`);

            if (senhaValida) {
                console.log(" ACESSO LIBERADO!");
                req.session.usuarioId = usuario.id;
                req.session.usuarioTipo = usuario.tipo;
                req.session.usuarioNome = usuario.nome;
                req.session.usuarioTema = usuario.tema;
                res.redirect('/painel.html');
            } else {
                console.log(" ACESSO NEGADO: Senha incorreta.");
                res.send("<h1>Acesso Negado. Senha incorreta.</h1><a href='/'>Voltar</a>");
            }
        } catch (error) {
            console.log("⚠️ ERRO DO BCRYPT: A senha salva não é um Hash válido.");
            res.send("<h1>Erro de Criptografia. O banco precisa ser resetado.</h1>");
        }
    });
});

app.get('/api/logout', (req, res) => {
    req.session.destroy(); 
    res.redirect('/');     
});

app.post('/api/usuario/tema', (req, res) => {
    if (!req.session.usuarioId) return res.status(401).json({ erro: "Não logado" });
    const { tema } = req.body;
    db.run("UPDATE Usuarios SET tema = ? WHERE id = ?", [tema, req.session.usuarioId], (err) => {
        if (err) return res.status(500).json(err);
        req.session.usuarioTema = tema;
        res.json({ sucesso: true });
    });
});

// --- ROTAS DE CHAMADOS ---
app.get('/api/chamados', (req, res) => {
    if (!req.session.usuarioId) return res.status(401).json({ erro: "Não logado" });
    const { usuarioId, usuarioTipo, usuarioNome, usuarioTema } = req.session;
    
    // Usamos o LEFT JOIN para puxar o 'nome' da tabela Usuarios baseado no 'cliente_id' do Chamado
    let sql = "";
    let params = [];

    if (usuarioTipo === 'admin') {
        sql = `SELECT Chamados.*, Usuarios.nome as cliente_nome 
               FROM Chamados 
               LEFT JOIN Usuarios ON Chamados.cliente_id = Usuarios.id`;
    } else {
        sql = `SELECT Chamados.*, Usuarios.nome as cliente_nome 
               FROM Chamados 
               LEFT JOIN Usuarios ON Chamados.cliente_id = Usuarios.id 
               WHERE Chamados.cliente_id = ?`;
        params = [usuarioId];
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ erro: "Erro no banco" });
        res.json({ chamados: rows, tipoUsuario: usuarioTipo, nomeUsuario: usuarioNome, temaSalvo: usuarioTema });
    });
});

app.post('/api/chamados', (req, res) => {
    if (!req.session.usuarioId) return res.status(401).send("Logue primeiro!");
    const { titulo, descricao, categoria } = req.body;
    db.run("INSERT INTO Chamados (titulo, descricao, categoria, cliente_id) VALUES (?, ?, ?, ?)", [titulo, descricao, categoria, req.session.usuarioId], (err) => {
        if (err) return res.status(500).send("Erro ao criar");
        res.redirect('/painel.html');
    });
});

app.post('/api/editar-chamado', (req, res) => {
    if (!req.session.usuarioId) return res.status(401).json({ erro: "Não logado" });
    const { id, titulo, descricao, categoria } = req.body;
    const sql = `UPDATE Chamados SET titulo = ?, descricao = ?, categoria = ? WHERE id = ? AND (cliente_id = ? OR ? = 'admin') AND status = 'Aberto'`;
    
    db.run(sql, [titulo, descricao, categoria, id, req.session.usuarioId, req.session.usuarioTipo], function(err) {
        if (err) return res.status(500).json({ erro: err.message });
        if (this.changes === 0) return res.status(403).json({ erro: "Não permitido" });
        res.json({ sucesso: true });
    });
});

app.post('/api/chamados/resolver', (req, res) => {
    if (req.session.usuarioTipo !== 'admin') return res.status(403).send("Acesso negado.");
    db.run("UPDATE Chamados SET status = 'Resolvido', resolucao = ?, concluido_em = CURRENT_TIMESTAMP WHERE id = ?", [req.body.resolucao, req.body.id_chamado], (err) => {
        if (err) console.error(err);
        res.redirect('/painel.html');
    });
});

// A ROTA DE EXCLUIR CORRIGIDA!
app.post('/api/excluir-chamado', (req, res) => {
    if (req.session.usuarioTipo !== 'admin') return res.status(403).json({ erro: "Apenas admins." });
    const { id } = req.body;
    
    db.run("DELETE FROM Mensagens WHERE chamado_id = ?", [id], (err) => {
        db.run("DELETE FROM Chamados WHERE id = ?", [id], function(err) {
            if (err) return res.status(500).json({ erro: err.message });
            res.json({ sucesso: true });
        });
    });
});

// --- ROTAS DE CHAT E ESTATÍSTICAS ---
app.get('/api/mensagens/:id', (req, res) => {
    db.all("SELECT * FROM Mensagens WHERE chamado_id = ? ORDER BY data_envio ASC", [req.params.id], (err, rows) => res.json(rows));
});

app.post('/api/mensagens', (req, res) => {
    if (!req.session.usuarioId) return res.status(401).json({ erro: "Acesso negado" });
    db.run("INSERT INTO Mensagens (chamado_id, remetente_nome, remetente_tipo, texto) VALUES (?, ?, ?, ?)", [req.body.chamado_id, req.session.usuarioNome, req.session.usuarioTipo, req.body.texto], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ sucesso: true });
    });
});

app.get('/api/estatisticas', (req, res) => {
    db.get(`SELECT COUNT(*) as total, AVG((julianday(concluido_em) - julianday(criado_em)) * 24) as media FROM Chamados WHERE status = 'Resolvido'`, [], (err, row) => {
        res.json({ totalResolvidos: row.total || 0, tempoMedio: row.media ? row.media.toFixed(1) : 0 });
    });
});

// --- ROTAS ADMIN (GERENCIAMENTO DE USUÁRIOS) ---
app.get('/api/admin/usuarios', (req, res) => {
    if (req.session.usuarioTipo !== 'admin') return res.status(403).json({ erro: "Acesso negado" });
    db.all("SELECT id, nome, email, tipo FROM Usuarios", [], (err, rows) => res.json({ usuarios: rows, idLogado: req.session.usuarioId }));
});

app.post('/api/admin/usuarios', async (req, res) => {
    if (req.session.usuarioTipo !== 'admin') return res.status(403).json({ erro: "Acesso negado" });
    try {
        const hashSenha = await bcrypt.hash(req.body.senha, 10);
        db.run("INSERT INTO Usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)", [req.body.nome, req.body.email, hashSenha, req.body.tipo], function(err) {
            if (err && err.message.includes('UNIQUE')) return res.status(400).json({ erro: "E-mail já cadastrado." });
            res.json({ sucesso: true });
        });
    } catch (e) { res.status(500).json({ erro: "Erro interno" }); }
});

app.post('/api/admin/usuarios/permissao', (req, res) => {
    if (req.session.usuarioTipo !== 'admin') return res.status(403).json({ erro: "Acesso negado" });
    if (req.body.id == req.session.usuarioId) return res.status(400).json({ erro: "Você não pode alterar sua própria permissão." });
    db.run("UPDATE Usuarios SET tipo = ? WHERE id = ?", [req.body.tipo, req.body.id], (err) => res.json({ sucesso: true }));
});

app.post('/api/admin/usuarios/deletar', (req, res) => {
    if (req.session.usuarioTipo !== 'admin') return res.status(403).json({ erro: "Acesso negado" });
    if (req.body.id == req.session.usuarioId) return res.status(400).json({ erro: "Você não pode se deletar." });
    db.run("DELETE FROM Usuarios WHERE id = ?", [req.body.id], (err) => res.json({ sucesso: true }));
});

app.listen(PORT, () => console.log(`Servidor rodando em: http://localhost:${PORT}`));