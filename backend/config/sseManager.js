// backend/config/sseManager.js
class SSEManager {
    constructor() {
        this.clients = new Map();
        this.stats = {
            totalConnections: 0,
            activeConnections: 0,
            messagesSent: 0,
            startTime: Date.now()
        };
    }

    addClient(userId, res, lastEventId = null) {
        if (this.clients.has(userId)) {
            const oldClient = this.clients.get(userId);
            if (!oldClient.res.writableEnded) {
                oldClient.res.write(`event: replaced\ndata: Nueva conexión iniciada\n\n`);
                oldClient.res.end();
            }
        }

        this.clients.set(userId, {
            res,
            timestamp: Date.now(),
            lastEventId,
            userId
        });

        this.stats.activeConnections = this.clients.size;
        this.stats.totalConnections++;

        console.log(`✅ Cliente SSE conectado - Usuario: ${userId} - Total: ${this.clients.size}`);
        
        return this.clients.size;
    }

    removeClient(userId) {
        const removed = this.clients.delete(userId);
        if (removed) {
            this.stats.activeConnections = this.clients.size;
            console.log(`❌ Cliente SSE desconectado - Usuario: ${userId} - Restantes: ${this.clients.size}`);
        }
        return removed;
    }

    sendToUser(userId, event, data) {
        const client = this.clients.get(userId);
        
        if (client && !client.res.writableEnded) {
            try {
                const eventData = typeof data === 'string' ? data : JSON.stringify(data);
                client.res.write(`event: ${event}\ndata: ${eventData}\n\n`);
                this.stats.messagesSent++;
                
                if (data.id) {
                    client.lastEventId = data.id;
                }
                
                return true;
            } catch (error) {
                console.error(`Error enviando a usuario ${userId}:`, error);
                this.removeClient(userId);
                return false;
            }
        }
        
        return false;
    }

    isUserConnected(userId) {
        const client = this.clients.get(userId);
        return client && !client.res.writableEnded;
    }

    healthCheck() {
        const now = Date.now();
        let cleaned = 0;
        
        this.clients.forEach((client, userId) => {
            if (client.res.writableEnded || (now - client.timestamp) > 86400000) {
                this.removeClient(userId);
                cleaned++;
            }
        });
        
        if (cleaned > 0) {
            console.log(`🧹 Limpieza: ${cleaned} conexiones cerradas`);
        }
        
        return cleaned;
    }
}

const sseManager = new SSEManager();
setInterval(() => sseManager.healthCheck(), 3600000);

module.exports = sseManager;