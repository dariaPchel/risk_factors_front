package api

import (
	"log"
	"os"
	"path/filepath"
	"strings"
	"web_backend/internal/app/handler"
	"web_backend/internal/app/repository"

	_ "web_backend/docs"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func StartServer() {
	log.Println("Starting server")
	repo, err := repository.NewRepository()
	if err != nil {
		logrus.Error("Ошибка инициализации репозитория:", err)
		return
	}
	h := handler.NewHandler(repo)
	r := gin.Default()

	// 1. Маршрут для Swagger UI
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// 2. API маршруты
	api := r.Group("/api")
	{
		api.GET("/risk_factors", h.OptionalAuthMiddleware(), h.GetRiskFactors)
		api.GET("/risk_factors/feed", h.GetFeed)
		api.GET("/risk_factors/feed/:id", h.GetFeed)
		api.POST("/users/register", h.RegisterUser)
		api.POST("/users/login", h.LoginUser)
		api.GET("/risk_factors/draft", h.AuthMiddleware(), h.GetDraft)
		api.POST("/risk_factors", h.AuthMiddleware(), h.CreateRiskFactor)
		api.PUT("/risk_factors/:id/publish", h.AuthMiddleware(), h.PublishRiskFactor)
		api.DELETE("/risk_factors/:id", h.AuthMiddleware(), h.DeleteRiskFactor)
		api.POST("/risk_factors/:id/like", h.AuthMiddleware(), h.LikeRiskFactor)
		api.POST("/users/logout", h.AuthMiddleware(), h.LogoutUser)
	}

	// 3. Раздача React-фронтенда (SPA) БЕЗ конфликта маршрутов
	// Путь относительно корня проекта (откуда запускается go run)
	distPath := "../frontend/dist"

	// Проверяем, существует ли папка dist
	if _, err := os.Stat(distPath); os.IsNotExist(err) {
		logrus.Warnf("Папка %s не найдена. Запустите 'npm run build' в папке frontend", distPath)
	} else {
		// Используем NoRoute вместо r.Static, чтобы избежать конфликта с /api
		r.NoRoute(func(c *gin.Context) {
			path := c.Request.URL.Path

			// Игнорируем API и Swagger, пусть Gin сам вернет 404
			if strings.HasPrefix(path, "/api") || strings.HasPrefix(path, "/swagger") {
				c.Next()
				return
			}

			// Пытаемся отдать статический файл (JS, CSS, картинки), если он существует
			filePath := filepath.Join(distPath, path)
			if _, err := os.Stat(filePath); err == nil {
				c.File(filePath)
				return
			}

			// Если файла нет, отдаем index.html (чтобы работал React Router)
			c.File(filepath.Join(distPath, "index.html"))
		})
	}

	log.Println("Server is running on port 3000")
	log.Println("Frontend: http://localhost:3000")
	log.Println("API: http://localhost:3000/api/risk_factors")
	log.Println("Swagger: http://localhost:3000/swagger/index.html")

	r.Run(":3000")
	log.Println("Server down")
}
