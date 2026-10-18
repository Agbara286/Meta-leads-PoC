package main

import (
	"io"
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const verifyToken = "my_secret_token_123"

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true 
		},
	}
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex
	broadcast = make(chan []byte)
)

func main() {
	r := gin.Default()

	
	go handleBroadcasts()

	
	r.GET("/webhook", func(c *gin.Context) {
		mode := c.Query("hub.mode")
		token := c.Query("hub.verify_token")
		challenge := c.Query("hub.challenge")

		if mode == "subscribe" && token == verifyToken {
			log.Println("Webhook verified successfully!")
			c.String(http.StatusOK, challenge)
			return
		}
		c.AbortWithStatus(http.StatusForbidden)
	})

	
	r.POST("/webhook", func(c *gin.Context) {
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
			return
		}

		log.Printf("Received Lead Payload: %s\n", string(body))

		
		broadcast <- body

		c.JSON(http.StatusOK, gin.H{"status": "received"})
	})

	
	r.GET("/ws", func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("WebSocket upgrade failed: %v\n", err)
			return
		}

		clientsMu.Lock()
		clients[conn] = true
		clientsMu.Unlock()
		log.Println("New mobile client connected via WebSocket!")

		
		defer func() {
			clientsMu.Lock()
			delete(clients, conn)
			clientsMu.Unlock()
			conn.Close()
		}()

		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	})

	r.Run(":8080")
}

func handleBroadcasts() {
	for msg := range broadcast {
		clientsMu.Lock()
		for client := range clients {
			err := client.WriteMessage(websocket.TextMessage, msg)
			if err != nil {
				log.Printf("WebSocket write error: %v\n", err)
				client.Close()
				delete(clients, client)
			}
		}
		clientsMu.Unlock()
	}
}