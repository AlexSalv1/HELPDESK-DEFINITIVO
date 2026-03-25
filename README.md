# 🛠️ Sistema de Help Desk

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)
![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-success?style=for-the-badge)

Um sistema robusto e responsivo de gestão de chamados (tickets) focado em otimizar o fluxo de atendimento e a gestão de utilizadores. Desenvolvido para fins de aprendizagem e aprimoramento em back-end e base de dados relacional.

## 📋 Índice

- [Funcionalidades](#-funcionalidades)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Como executar localmente](#-como-executar-localmente)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Próximos Passos (Roadmap)](#-próximos-passos-roadmap)

## ✨ Funcionalidades

* **Painel Administrativo:** Gestão completa de utilizadores (criação, exclusão e edição de permissões) e dashboard com estatísticas detalhadas, incluindo o tempo médio de resolução dos chamados.
* **Gestão de Tickets:** Modal centralizado em "Ver Detalhes" para visualização rápida, edição de chamados abertos e controlo do processo de resolução.
* **Comunicação Direta:** Chat integrado diretamente nos tickets para interação em tempo real entre a equipa e o cliente.
* **Segurança de Dados:** Autenticação de utilizadores com senhas encriptadas utilizando Bcrypt.
* **Experiência do Utilizador (UX/UI):** * Design totalmente responsivo (adapta-se a telemóveis e computadores).
  * Menu lateral intuitivo e filtros de pesquisa dinâmicos.
  * **Dark Mode** persistente (guarda a preferência visual do utilizador).

## 🚀 Tecnologias Utilizadas

* **Back-end:** Node.js com a framework Express.
* **Base de Dados:** SQLite (banco relacional leve e embutido).
* **Segurança:** Bcrypt (hash de senhas).
* **Front-end:** HTML, CSS e JavaScript (Vanilla).

## 📂 Estrutura do Projeto

Uma visão geral de como os ficheiros estão organizados:

```text
Helpdesk/
├── public/          # Ficheiros estáticos (CSS, JS do front-end, imagens)
├── views/           # Páginas HTML / Templates
├── routes/          # Definição das rotas da API e navegação
├── controllers/     # Lógica de negócio e funções do sistema
├── database/        # Ficheiro do SQLite e configuração da base de dados
├── server.js        # Ficheiro principal que inicia o servidor Node
└── package.json     # Dependências e scripts do projeto


