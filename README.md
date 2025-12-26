# VK Webhook для СпросиИИ

Webhook-сервер для интеграции VK Messenger с платформой СпросиИИ. Принимает сообщения из VK и пересылает их в систему.

## Возможности

- Приём сообщений из VK через Callback API
- Автоматическое создание контактов и бесед
- Пересылка сообщений в СпросиИИ API
- Health check для мониторинга

## Технологии

- Node.js + NestJS
- TypeScript
- VK Callback API
- Swagger (OpenAPI)
- Docker

## Установка

```bash
# Клонировать репозиторий
git clone https://github.com/Saaayurii/webhook-ASKII.git
cd webhook-ASKII

# Установить зависимости
npm install

# Создать .env файл
cp .env.example .env
# Заполнить переменные в .env

# Запустить в dev режиме
npm run start:dev

# Или собрать и запустить
npm run build
npm run start:prod
```

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `VK_TOKEN` | Токен доступа группы VK |
| `VK_CONFIRMATION` | Код подтверждения для Callback API |
| `VK_GROUP_ID` | ID группы VK |
| `VK_API_VERSION` | Версия VK API (по умолчанию 5.199) |
| `API_BASE_URL` | URL СпросиИИ API |
| `API_TOKEN` | Токен для СпросиИИ API |
| `ACCOUNT_ID` | ID аккаунта |
| `INBOX_ID` | ID inbox |
| `PORT` | Порт сервера (по умолчанию 3000) |
| `WEBHOOK_URL` | Публичный URL webhook-сервера |

## API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/vk/callback` | Webhook для VK Callback API |
| GET | `/vk/health` | Health check |
| GET | `/vk/status` | Статус сервиса и подключений |
| POST | `/vk/test` | Тест отправки сообщения |
| POST | `/vk/test-api` | Тест подключения к API |

## Swagger документация

После запуска сервера Swagger UI доступен по адресу:
```
http://localhost:3000/api/docs
```

## Docker

### Запуск с docker-compose

```bash
# Создать .env файл
cp .env.example .env
# Заполнить переменные

# Запустить
docker-compose up -d

# Логи
docker-compose logs -f

# Остановить
docker-compose down
```

### Сборка образа вручную

```bash
docker build -t vk-webhook .
docker run -p 3000:3000 --env-file .env vk-webhook
```

## Деплой на Render

1. Создать Web Service на [render.com](https://render.com)
2. Подключить этот репозиторий
3. Render автоматически использует `render.yaml`
4. Добавить переменные окружения в панели Render
5. После деплоя скопировать URL сервиса
6. В настройках группы VK указать Callback URL: `https://ваш-сервис.onrender.com/vk/callback`

## Настройка VK

1. Перейти в управление группой VK
2. Раздел "Работа с API" -> "Callback API"
3. Указать URL сервера: `https://ваш-сервис.onrender.com/vk/callback`
4. Скопировать код подтверждения в `VK_CONFIRMATION`
5. Подтвердить сервер
6. Включить события: "Входящее сообщение"

## Структура проекта

```
src/
├── main.ts                 # Точка входа
├── app.module.ts           # Главный модуль
├── config/
│   └── configuration.ts    # Конфигурация
└── vk/
    ├── vk.module.ts        # VK модуль
    ├── vk.controller.ts    # Обработка запросов
    ├── vk.service.ts       # Работа с VK API
    ├── api.service.ts      # Работа с СпросиИИ API
    └── dto/
        └── vk-callback.dto.ts  # DTO для Swagger
```
