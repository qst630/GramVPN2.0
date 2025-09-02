# GramVPN - Telegram Mini App

VPN сервис в виде Telegram Mini App с системой подписок и реферальной программой.

## 🚀 Быстрый старт

### 1. Настройка Supabase

1. Создайте проект в [Supabase](https://supabase.com)
2. Нажмите "Connect to Supabase" в правом верхнем углу приложения
3. Введите URL и API ключ вашего проекта

### 2. Развертывание базы данных

Выполните миграции в Supabase Dashboard → SQL Editor:

```sql
-- Выполните файлы миграций по порядку:
-- 1. supabase/migrations/20250902084702_delicate_beacon.sql
-- 2. supabase/migrations/20250902115122_round_heart.sql
```

### 3. Развертывание Edge Functions

#### Вариант 1: Через Supabase CLI
```bash
# Установите Supabase CLI
npm install -g supabase

# Войдите в аккаунт
supabase login

# Свяжите с проектом
supabase link --project-ref YOUR_PROJECT_ID

# Разверните функции
supabase functions deploy vpn-management
supabase functions deploy test-connection
```

#### Вариант 2: Через Dashboard
1. Откройте Supabase Dashboard
2. Перейдите в Edge Functions
3. Создайте новую функцию `vpn-management`
4. Скопируйте код из `supabase/functions/vpn-management/index.ts`
5. Сохраните и разверните

### 4. Настройка Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен бота
3. Настройте Mini App:
   ```
   /newapp
   /setmenubutton
   ```
4. Укажите URL вашего приложения

## 🔧 Разработка

### Структура проекта

```
src/
├── components/     # React компоненты
├── hooks/         # React хуки
├── screens/       # Экраны приложения
├── services/      # API сервисы
├── types/         # TypeScript типы
└── lib/          # Утилиты

supabase/
├── functions/     # Edge Functions
└── migrations/    # SQL миграции
```

### Основные сервисы

- **vpnService** - Основной сервис для работы с VPN
- **useTelegram** - Хук для работы с Telegram WebApp API
- **useVPN** - Хук для управления состоянием VPN

### Debug Panel

Для отладки используйте Debug Panel (красная кнопка справа внизу):
- Проверка подключения к БД
- Тестирование Edge Functions
- Создание тестовых пользователей
- Просмотр логов

## 📊 База данных

### Основные таблицы

- **users** - Пользователи
- **subscriptions** - Подписки
- **servers** - VPN серверы
- **payments** - Платежи
- **promo_codes** - Промокоды
- **referral_bonuses** - Реферальные бонусы

## 🚨 Устранение неполадок

### Ошибка "Failed to fetch"
- Edge Function не развернута
- Неправильные API ключи
- Проект приостановлен в Supabase

### Пользователи не сохраняются в БД
- Проверьте подключение к Supabase
- Убедитесь что миграции выполнены
- Проверьте Edge Function в Dashboard

### CORS ошибки
- Edge Function должна правильно обрабатывать OPTIONS запросы
- Проверьте CORS заголовки в функции

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте Debug Panel
2. Посмотрите логи в Supabase Dashboard
3. Убедитесь что все функции развернуты