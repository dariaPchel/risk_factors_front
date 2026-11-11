package handler

import (
	"context"
	"fmt"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"web_backend/internal/app/repository"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/sirupsen/logrus"
	"golang.org/x/crypto/bcrypt"
)

const jwtSecret = "super_secret_jwt_key_for_lr4_change_in_prod"

type Handler struct {
	Repository *repository.Repository
}

func NewHandler(r *repository.Repository) *Handler {
	return &Handler{Repository: r}
}

func getCurrentUserID(ctx *gin.Context) uint {
	userID, exists := ctx.Get("user_id")
	if !exists {
		return 0
	}
	return userID.(uint)
}

// getMinioFileURL возвращает полный URL для доступа к файлу из MinIO
func (h *Handler) getMinioFileURL(filename string) string {
	if filename == "" {
		return ""
	}
	return fmt.Sprintf("http://localhost:9000/%s/%s", h.Repository.MinioBucket, filename)
}

func (h *Handler) AuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authHeader := ctx.GetHeader("Authorization")
		if authHeader == "" {
			ctx.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Требуется авторизация"})
			ctx.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			ctx.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Неверный формат токена"})
			ctx.Abort()
			return
		}

		tokenString := parts[1]

		isBlacklisted, err := h.Repository.IsBlacklisted(context.Background(), tokenString)
		if err != nil {
			logrus.Error("Ошибка проверки блеклиста Redis: ", err)
		}
		if isBlacklisted {
			ctx.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Токен аннулирован (logout)"})
			ctx.Abort()
			return
		}
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("неожиданный метод подписи: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			ctx.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Недействительный токен"})
			ctx.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			ctx.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Неверные claims токена"})
			ctx.Abort()
			return
		}

		ctx.Set("user_id", uint(claims["user_id"].(float64)))
		ctx.Next()
	}
}

func (h *Handler) OptionalAuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authHeader := ctx.GetHeader("Authorization")
		if authHeader == "" {
			ctx.Next()
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			tokenString := parts[1]
			isBlacklisted, _ := h.Repository.IsBlacklisted(context.Background(), tokenString)
			if !isBlacklisted {
				token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
					return []byte(jwtSecret), nil
				})
				if err == nil && token.Valid {
					if claims, ok := token.Claims.(jwt.MapClaims); ok {
						ctx.Set("user_id", uint(claims["user_id"].(float64)))
					}
				}
			}
		}
		ctx.Next()
	}
}

func (h *Handler) uploadToMinio(fileHeader *multipart.FileHeader) (string, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	ext := filepath.Ext(fileHeader.Filename)
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	_, err = h.Repository.MinioClient.PutObject(
		context.Background(),
		h.Repository.MinioBucket,
		filename,
		file,
		fileHeader.Size,
		minio.PutObjectOptions{ContentType: contentType},
	)
	if err != nil {
		return "", err
	}
	return filename, nil
}

func (h *Handler) RegisterUser(ctx *gin.Context) {
	var req RegisterRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Неверные данные"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Ошибка хеширования пароля"})
		return
	}

	user := repository.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashedPassword),
	}

	if err := h.Repository.CreateUser(&user); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Ошибка регистрации (возможно, email занят)"})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Пользователь зарегистрирован",
		"user_id": user.ID,
	})
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

func (h *Handler) LoginUser(ctx *gin.Context) {
	var req LoginRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		logrus.Errorf("LoginUser: ошибка парсинга JSON: %v", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Неверный формат данных"})
		return
	}

	logrus.Infof("LoginUser: попытка входа email=%s", req.Email)

	user, err := h.Repository.GetUserByEmail(req.Email)
	if err != nil {
		logrus.Errorf("LoginUser: пользователь не найден: email=%s, err=%v", req.Email, err)
		ctx.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Пользователь не найден"})
		return
	}

	logrus.Infof("LoginUser: пользователь найден, id=%d, password_len=%d", user.ID, len(user.Password))

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		logrus.Errorf("LoginUser: пароль не совпал: err=%v", err)
		ctx.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Неверный пароль"})
		return
	}

	logrus.Infof("LoginUser: успешный вход id=%d", user.ID)

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"exp":     expirationTime.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Ошибка генерации токена"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{
		"status":       "success",
		"message":      "Аутентификация успешна",
		"access_token": tokenString,
		"expires_in":   86400,
	})
}

func (h *Handler) LogoutUser(ctx *gin.Context) {
	authHeader := ctx.GetHeader("Authorization")
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) == 2 && parts[0] == "Bearer" {
		h.Repository.AddToBlacklist(context.Background(), parts[1], 24*time.Hour)
	}
	ctx.JSON(http.StatusOK, gin.H{"status": "success", "message": "Деавторизация успешна"})
}

func (h *Handler) GetRiskFactors(ctx *gin.Context) {
	currentUserID := getCurrentUserID(ctx)
	var maxAge *int
	if maxAgeStr := ctx.Query("maxAge"); maxAgeStr != "" {
		if age, err := strconv.Atoi(maxAgeStr); err == nil {
			maxAge = &age
		}
	}
	factors, err := h.Repository.GetRiskFactors(maxAge)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка получения списка"})
		return
	}
	var result []gin.H
	for _, f := range factors {
		isCreator := 0
		if f.CreatedBy == currentUserID {
			isCreator = 1
		}
		isLiked := 0
		for _, user := range f.LikedBy {
			if user.ID == currentUserID {
				isLiked = 1
				break
			}
		}
		result = append(result, gin.H{
			"id":              f.ID,
			"name":            f.Name,
			"description":     f.Description,
			"age":             f.Age,
			"bmi":             f.BMI,
			"risk_percentage": f.RiskPercentage,
			"image_url":       f.ImageURL,
			"video_url":       f.VideoURL,
			"likes_count":     len(f.LikedBy),
			"is_creator":      isCreator,
			"is_liked":        isLiked,
			"status":          f.Status,
			"created_at":      f.CreatedAt,
			"published_at":    f.PublishedAt,
		})
	}
	ctx.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *Handler) GetFeed(ctx *gin.Context) {
	currentUserID := getCurrentUserID(ctx)
	idStr := ctx.Param("id")
	var factor repository.RiskFactor
	var err error

	if idStr == "" {
		factors, _ := h.Repository.GetRiskFactors(nil)
		if len(factors) > 0 {
			factor = factors[0]
		} else {
			ctx.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Лента пуста"})
			return
		}
	} else {
		id, convErr := strconv.Atoi(idStr)
		if convErr != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Неверный ID"})
			return
		}
		if ctx.Query("next") == "true" {
			factor, err = h.Repository.GetNextRiskFactor(id)
		} else if ctx.Query("prev") == "true" {
			factor, err = h.Repository.GetPrevRiskFactor(id)
		} else {
			factor, err = h.Repository.GetRiskFactor(id)
		}
	}

	if err != nil || factor.Status != "published" {
		ctx.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Фактор риска не найден"})
		return
	}

	isCreator := 0
	if factor.CreatedBy == currentUserID {
		isCreator = 1
	}

	isLiked := 0
	for _, user := range factor.LikedBy {
		if user.ID == currentUserID {
			isLiked = 1
			break
		}
	}

	ctx.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"id":              factor.ID,
			"name":            factor.Name,
			"description":     factor.Description,
			"age":             factor.Age,
			"bmi":             factor.BMI,
			"risk_percentage": factor.RiskPercentage,
			"image_url":       factor.ImageURL,
			"video_url":       factor.VideoURL,
			"likes_count":     len(factor.LikedBy),
			"is_creator":      isCreator,
			"is_liked":        isLiked,
			"published_at":    factor.PublishedAt,
		},
	})
}

func (h *Handler) GetDraft(ctx *gin.Context) {
	currentUserID := getCurrentUserID(ctx)
	if currentUserID == 0 {
		ctx.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Требуется авторизация"})
		return
	}

	factor, err := h.Repository.GetDraft(currentUserID)
	if err != nil {
		ctx.JSON(http.StatusOK, gin.H{"status": "success", "data": nil})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"status": "success", "data": factor})
}

func (h *Handler) CreateRiskFactor(ctx *gin.Context) {
	currentUserID := getCurrentUserID(ctx)
	if currentUserID == 0 {
		ctx.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Требуется авторизация"})
		return
	}

	err := ctx.Request.ParseMultipartForm(10 << 20)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Ошибка разбора формы"})
		return
	}

	existingDraft, err := h.Repository.GetDraft(currentUserID)
	var factor repository.RiskFactor

	if err == nil {
		factor = existingDraft
	} else {
		factor = repository.RiskFactor{
			Status:    "draft",
			CreatedBy: currentUserID,
		}
	}

	factor.Name = ctx.PostForm("name")
	factor.Description = ctx.PostForm("description")
	if ageStr := ctx.PostForm("age"); ageStr != "" {
		factor.Age, _ = strconv.Atoi(ageStr)
	}
	if bmiStr := ctx.PostForm("bmi"); bmiStr != "" {
		factor.BMI, _ = strconv.ParseFloat(bmiStr, 64)
	}
	if riskStr := ctx.PostForm("risk_percentage"); riskStr != "" {
		factor.RiskPercentage, _ = strconv.ParseFloat(riskStr, 64)
	}

	// Загрузка файлов в MinIO с получением ПОЛНОГО URL
	if imgFile, err := ctx.FormFile("image"); err == nil {
		if filename, err := h.uploadToMinio(imgFile); err == nil {
			factor.ImageURL = h.getMinioFileURL(filename)
		}
	}
	if videoFile, err := ctx.FormFile("video"); err == nil {
		if filename, err := h.uploadToMinio(videoFile); err == nil {
			factor.VideoURL = h.getMinioFileURL(filename)
		}
	}

	if factor.ID == 0 {
		err = h.Repository.CreateRiskFactor(&factor)
	} else {
		updates := map[string]interface{}{
			"name": factor.Name, "description": factor.Description, "age": factor.Age,
			"bmi": factor.BMI, "risk_percentage": factor.RiskPercentage,
		}
		if factor.ImageURL != "" {
			updates["image_url"] = factor.ImageURL
		}
		if factor.VideoURL != "" {
			updates["video_url"] = factor.VideoURL
		}
		err = h.Repository.UpdateRiskFactor(factor.ID, updates)
	}

	if err != nil {
		logrus.Error("Ошибка создания/обновления:", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Ошибка сервера"})
		return
	}

	// Возвращаем JSON с маленькими буквами (не PascalCase из Go struct)
	ctx.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Услуга сохранена",
		"data": gin.H{
			"id":           factor.ID,
			"name":         factor.Name,
			"description":  factor.Description,
			"status":       factor.Status,
			"image_url":    factor.ImageURL,
			"video_url":    factor.VideoURL,
			"age":          factor.Age,
			"bmi":          factor.BMI,
			"created_at":   factor.CreatedAt,
			"created_by":   factor.CreatedBy,
			"published_at": factor.PublishedAt,
		},
	})
}

func (h *Handler) PublishRiskFactor(ctx *gin.Context) {
	currentUserID := getCurrentUserID(ctx)
	if currentUserID == 0 {
		ctx.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Требуется авторизация"})
		return
	}

	id, _ := strconv.Atoi(ctx.Param("id"))
	description := ctx.PostForm("description")
	age := 0
	if ageStr := ctx.PostForm("age"); ageStr != "" {
		age, _ = strconv.Atoi(ageStr)
	}
	bmi := 0.0
	if bmiStr := ctx.PostForm("bmi"); bmiStr != "" {
		bmi, _ = strconv.ParseFloat(bmiStr, 64)
	}

	err := h.Repository.PublishRiskFactor(id, currentUserID, description, age, bmi)
	if err != nil {
		ctx.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Нет прав на публикацию или услуга не найдена"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Услуга опубликована",
		"data": gin.H{
			"id": id,
		},
	})
}

func (h *Handler) DeleteRiskFactor(ctx *gin.Context) {
	currentUserID := getCurrentUserID(ctx)
	if currentUserID == 0 {
		ctx.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Требуется авторизация"})
		return
	}

	id, _ := strconv.Atoi(ctx.Param("id"))
	err := h.Repository.DeleteRiskFactorSQL(id, currentUserID)
	if err != nil {
		ctx.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Нет прав на удаление или услуга не найдена"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"status": "success", "message": "Услуга удалена"})
}

type LikeRequest struct {
	Action int `json:"action" binding:"oneof=0 1"`
}

func (h *Handler) LikeRiskFactor(ctx *gin.Context) {
	currentUserID := getCurrentUserID(ctx)
	if currentUserID == 0 {
		ctx.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Требуется авторизация"})
		return
	}

	idStr := ctx.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Неверный ID"})
		return
	}

	var req LikeRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Ошибка JSON: " + err.Error(),
		})
		return
	}

	if req.Action == 1 {
		err = h.Repository.AddLike(uint(id), currentUserID)
	} else {
		err = h.Repository.RemoveLike(uint(id), currentUserID)
	}

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Ошибка БД: " + err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"status": "success", "message": "Лайк обновлен"})
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}
