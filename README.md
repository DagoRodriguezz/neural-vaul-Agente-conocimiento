[![Live Demo](https://img.shields.io/badge/Demo-Vercel-blue?style=for-the-badge&logo=vercel)](https://TU-LINK.vercel.app)
# 🧠 NeuralVault - AI Knowledge Manager

![Python](https://img.shields.io/badge/Python-3.12-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688) ![LangGraph](https://img.shields.io/badge/LangGraph-Agentic-purple) ![React](https://img.shields.io/badge/React-Vite-61DAFB)

NeuralVault es un entorno de gestión de conocimiento local (PKM) que utiliza agentes de Inteligencia Artificial para leer, analizar y razonar sobre tus notas en formato Markdown. Actúa como un "Segundo Cerebro", enlazando conceptos automáticamente y proporcionando una interfaz de chat interactiva conectada a tus archivos locales.

## 🚀 Características Principales

* **Arquitectura RAG Local:** Acceso y razonamiento sobre tu bóveda de notas sin indexación externa invasiva.
* **Grafo de Conocimiento Interactivo:** Visualización 2D en tiempo real de los nodos y enlaces bidireccionales entre tus archivos.
* **Agente Autónomo (LangGraph):** Memoria de sesión fluida, ejecución de herramientas de lectura/escritura y prevención activa contra vulnerabilidades de *Path Traversal*.
* **Streaming Asíncrono (SSE):** Respuestas generadas en tiempo real mediante *Server-Sent Events*.

## 🛠️ Stack Tecnológico

* **Backend:** Python, FastAPI, LangGraph, Google GenAI.
* **Frontend:** Vite, React, Tailwind CSS, react-force-graph.
* **Despliegue:** Docker, Docker Compose.

## 💡 Nota de Arquitectura y Desarrollo

Mi enfoque principal y área de especialidad en este proyecto es la **Arquitectura Backend y la Ingeniería de Agentes IA (LangGraph/FastAPI)**. Para lograr un producto visualmente profesional y agilizar el desarrollo de la interfaz, el frontend en React/Tailwind fue co-desarrollado utilizando herramientas de IA generativa. Esto me permitió centrar los esfuerzos de ingeniería en la lógica compleja del servidor, el streaming SSE, la orquestación del agente y la manipulación segura del sistema de archivos local.

## 📦 Ejecución del Proyecto

El proyecto está preparado para ejecutarse de forma aislada mediante contenedores. Se incluye una bóveda de prueba (`mock_vault`) montada como volumen para evaluar las capacidades del agente inmediatamente.

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/neuralvault.git
cd neuralvault

# Levantar los servicios
docker-compose up --build -d
```
La aplicación estará disponible en `http://localhost:5173`.

---
*Desarrollado por Juan David Rodriguez - Software Engineer*
