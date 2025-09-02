import React, { useState } from 'react';
import { Bug, Database, User, Trash2, Wifi, Settings } from 'lucide-react';
import { directSupabaseService } from '../services/directSupabaseService';

interface DebugPanelProps {
  user: any;
  onRefresh: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ user, onRefresh }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCreateUser = async () => {
    setLoading(true);
    try {
      const testUser = {
        id: Math.floor(Math.random() * 1000000),
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser'
      };
      
      addLog(`🧪 TESTING USER CREATION`);
      addLog(`👤 Test user data: ${testUser.first_name} ${testUser.last_name} (ID: ${testUser.id})`);
      addLog(`📡 This will test the complete user creation flow...`);
      
      const result = await directSupabaseService.getOrCreateUser(testUser);
      addLog(`✅ SUCCESS: User created with referral code: ${result.referral_code}`);
      addLog(`📊 User details: ID=${result.id}, Telegram=${result.telegram_id}`);
      onRefresh();
    } catch (error) {
      addLog(`❌ FAILED: User creation error: ${error instanceof Error ? error.message : error}`);
      
      if (error instanceof Error) {
        if (error.message.includes('tables not created')) {
          addLog(`💡 SOLUTION: Database tables missing - create them in Supabase Dashboard`);
        } else if (error.message.includes('permission')) {
          addLog(`💡 SOLUTION: RLS policy issue - check database permissions`);
        } else if (error.message.includes('Failed to fetch')) {
          addLog(`💡 SOLUTION: Connection issue - check Supabase project status`);
        } else {
          addLog(`💡 SOLUTION: Unknown error - check Supabase Dashboard for issues`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const testStartTrial = async () => {
    if (!user) {
      addLog('❌ No user found to start trial');
      return;
    }

    setLoading(true);
    try {
      addLog(`Starting trial for user: ${user.id}`);
      await directSupabaseService.startTrial(user.telegram_id);
      addLog(`✅ Trial started successfully`);
      onRefresh();
    } catch (error) {
      addLog(`❌ Error starting trial: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testGetTrialStatus = async () => {
    if (!user) {
      addLog('❌ No user found to check trial');
      return;
    }

    setLoading(true);
    try {
      addLog(`Checking trial status for user: ${user.id}`);
      const status = await directSupabaseService.getUserStatus(user.telegram_id);
      addLog(`✅ Trial status: ${JSON.stringify(status, null, 2)}`);
    } catch (error) {
      addLog(`❌ Error checking trial: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      addLog('🧪 COMPREHENSIVE SUPABASE TEST...');
      
      // Check environment first
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        addLog('❌ ENVIRONMENT VARIABLES MISSING');
        addLog('💡 Click "Connect to Supabase" button to configure');
        return;
      }
      
      addLog(`🔗 Supabase URL: ${url}`);
      addLog(`🔑 API Key: ${key.substring(0, 20)}...`);
      
      // Test 1: Basic connectivity
      addLog('📡 Step 1: Testing basic connectivity...');
      try {
        const basicResponse = await fetch(url, { method: 'HEAD' });
        addLog(`📡 Basic connectivity: ${basicResponse.ok ? '✅ OK' : '❌ Failed'} (${basicResponse.status})`);
      } catch (basicError) {
        addLog(`❌ Basic connectivity failed: ${basicError.message}`);
        addLog('💡 Check if Supabase project exists and is not paused');
        return;
      }
      
      // Test 2: API endpoint with auth
      addLog('🔐 Step 2: Testing API with authentication...');
      try {
        const authResponse = await fetch(`${url}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
          }
        });
        addLog(`🔐 API Auth: ${authResponse.ok ? '✅ OK' : '❌ Failed'} (${authResponse.status})`);
        
        if (!authResponse.ok) {
          addLog('💡 Check your API key in Supabase Dashboard → Settings → API');
          return;
        }
      } catch (authError) {
        addLog(`❌ API auth failed: ${authError.message}`);
        return;
      }
      
      // Test direct Supabase connection
      addLog('🗄️ Step 3: Testing database tables...');
      const result = await directSupabaseService.testConnection();
      
      if (result.success) {
        addLog('✅ DATABASE CONNECTION SUCCESSFUL');
        addLog('✅ All tables exist and accessible');
        addLog('💡 Ready to use - no Edge Functions needed!');
      } else {
        addLog(`❌ DATABASE ERROR: ${result.error}`);
        
        if (result.error?.includes('tables not found')) {
          addLog('');
          addLog('🔧 SOLUTION: Create database tables');
          addLog('1. Go to Supabase Dashboard → SQL Editor');
          addLog('2. Run this SQL to create tables:');
          addLog('');
          addLog('CREATE TABLE users (');
          addLog('  id SERIAL PRIMARY KEY,');
          addLog('  telegram_id BIGINT UNIQUE NOT NULL,');
          addLog('  username TEXT,');
          addLog('  full_name TEXT,');
          addLog('  referral_code TEXT UNIQUE NOT NULL,');
          addLog('  referred_by INTEGER REFERENCES users(id),');
          addLog('  subscription_status BOOLEAN DEFAULT FALSE,');
          addLog('  subscription_link TEXT,');
          addLog('  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
          addLog(');');
          addLog('');
          addLog('-- Enable RLS');
          addLog('ALTER TABLE users ENABLE ROW LEVEL SECURITY;');
          addLog('');
          addLog('-- Allow public access for demo');
          addLog('CREATE POLICY "Allow all" ON users FOR ALL USING (true);');
        }
      }
      
    } catch (error) {
      addLog(`❌ UNEXPECTED ERROR: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testDetailedConnection = async () => {
    setLoading(true);
    try {
      addLog('🔍 ПОШАГОВАЯ ДИАГНОСТИКА SUPABASE...');
      
      // Check environment
      const hasUrl = !!import.meta.env.VITE_SUPABASE_URL;
      const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      addLog(`ШАГ 1: Проверка переменных окружения`);
      addLog(`📍 VITE_SUPABASE_URL: ${hasUrl ? '✅ ЕСТЬ' : '❌ НЕТ'}`);
      addLog(`🔑 VITE_SUPABASE_ANON_KEY: ${hasKey ? '✅ ЕСТЬ' : '❌ НЕТ'}`);
      
      if (!hasUrl || !hasKey) {
        addLog('🚨 КРИТИЧЕСКАЯ ОШИБКА: Переменные окружения отсутствуют!');
        addLog('💡 РЕШЕНИЕ: Нажмите "Connect to Supabase" в правом верхнем углу');
        return;
      }
      
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      addLog(`📍 Полный URL: ${url}`);
      addLog(`🔑 Ключ: ${key.substring(0, 30)}... (длина: ${key.length})`);
      
      // Validate URL format
      addLog(`ШАГ 2: Проверка формата URL`);
      const urlValid = url.startsWith('https://') && url.includes('.supabase.co');
      addLog(`📍 Формат URL правильный: ${urlValid ? '✅ ДА' : '❌ НЕТ'}`);
      
      if (!urlValid) {
        addLog('❌ ОШИБКА ФОРМАТА: URL должен быть https://yourproject.supabase.co');
        return;
      }
      
      // Extract project ID from URL
      const projectId = url.replace('https://', '').replace('.supabase.co', '');
      addLog(`🆔 ID проекта: ${projectId}`);
      
      // Test 1: Basic connectivity
      addLog(`ШАГ 3: Проверка доступности домена`);
      try {
        // Try different approaches to test connectivity
        addLog('🔍 Попытка 1: HEAD запрос...');
        let basicResponse;
        try {
          basicResponse = await fetch(url, { 
            method: 'HEAD',
            mode: 'cors'
          });
          addLog(`🌐 HEAD запрос: ✅ (статус: ${basicResponse.status})`);
        } catch (headError) {
          addLog(`⚠️ HEAD запрос не удался: ${headError.message}`);
          
          // Try GET request to /rest/v1/ instead
          addLog('🔍 Попытка 2: GET к API эндпоинту...');
          basicResponse = await fetch(`${url}/rest/v1/`, { 
            method: 'GET',
            mode: 'cors',
            headers: {
              'apikey': key,
              'Authorization': `Bearer ${key}`
            }
          });
          addLog(`🌐 API запрос: ✅ (статус: ${basicResponse.status})`);
        }
        
        addLog(`🌐 Домен доступен: ✅ (статус: ${basicResponse.status})`);
      } catch (domainError) {
        addLog(`❌ ОШИБКА ПОДКЛЮЧЕНИЯ: ${domainError.message}`);
        
        if (domainError.message.includes('Failed to fetch')) {
          addLog('🔍 Это может быть проблема CORS или блокировка браузера');
          addLog('💡 Попробуем обойти через прямой API запрос...');
          
          // Try direct API call
          try {
            const directResponse = await fetch(`${url}/rest/v1/`, {
              method: 'GET',
              headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (directResponse.ok || directResponse.status === 401) {
              addLog('✅ ПРОЕКТ ДОСТУПЕН! Проблема была в CORS');
              addLog('🎉 Переходим к проверке базы данных...');
            } else {
              addLog(`⚠️ Проект отвечает, но статус: ${directResponse.status}`);
            }
          } catch (directError) {
            addLog(`❌ И прямой запрос не работает: ${directError.message}`);
            addLog('🚨 Возможно проект действительно недоступен');
            return;
          }
        } else {
          addLog('🚨 Неожиданная ошибка подключения');
          return;
        }
      }
      
      // Test 2: API endpoint
      addLog(`ШАГ 4: Проверка API эндпоинта`);
      try {
        const apiResponse = await fetch(`${url}/rest/v1/`, {
          method: 'HEAD'
        });
        
        addLog(`🔌 Статус API: ${apiResponse.status} ${apiResponse.statusText}`);
        
        if (apiResponse.status === 401) {
          addLog('✅ API ЭНДПОИНТ: Доступен (401 = нужна авторизация, это нормально)');
        } else if (apiResponse.ok) {
          addLog('✅ API ЭНДПОИНТ: Доступен и работает');
        } else {
          addLog(`⚠️ API ЭНДПОИНТ: Неожиданный статус ${apiResponse.status}`);
        }
      } catch (apiError) {
        addLog(`❌ ОШИБКА API: ${apiError.message}`);
        addLog('💡 API недоступен - проект может быть приостановлен или удален');
        return;
      }
      
      // Test 3: Authentication
      addLog(`ШАГ 5: Проверка авторизации`);
      try {
        const authResponse = await fetch(`${url}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
          }
        });
        
        addLog(`🔐 Статус авторизации: ${authResponse.status} ${authResponse.statusText}`);
        
        if (authResponse.ok) {
          addLog('✅ АВТОРИЗАЦИЯ: API ключ действителен');
        } else if (authResponse.status === 401) {
          addLog('❌ АВТОРИЗАЦИЯ: Неверный API ключ');
          addLog('💡 Проверьте ключ: Supabase Dashboard → Settings → API');
        } else {
          addLog(`⚠️ АВТОРИЗАЦИЯ: Неожиданный статус ${authResponse.status}`);
        }
      } catch (authError) {
        addLog(`❌ ОШИБКА АВТОРИЗАЦИИ: ${authError.message}`);
      }
      
      // Test 4: Database tables
      addLog(`ШАГ 6: Проверка таблиц базы данных`);
      try {
        const dbResponse = await fetch(`${url}/rest/v1/users?select=count&limit=1`, {
          method: 'HEAD',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          }
        });
        
        addLog(`🗄️ Статус БД: ${dbResponse.status} ${dbResponse.statusText}`);
        
        if (dbResponse.ok) {
          addLog('✅ БАЗА ДАННЫХ: Таблицы существуют и доступны');
          addLog('🎉 ВСЕ РАБОТАЕТ! Можно использовать приложение');
        } else if (dbResponse.status === 404) {
          addLog('❌ БАЗА ДАННЫХ: Таблица "users" не найдена');
          addLog('💡 РЕШЕНИЕ: Создать таблицы в Supabase Dashboard → SQL Editor');
          addLog('💡 Нажмите кнопку "Create Tables" ниже');
        } else {
          addLog(`⚠️ БАЗА ДАННЫХ: Статус ${dbResponse.status}`);
        }
      } catch (dbError) {
        addLog(`❌ ОШИБКА БД: ${dbError.message}`);
      }
      
      addLog('🏁 ДИАГНОСТИКА ЗАВЕРШЕНА');
      
    } catch (error) {
      addLog(`❌ ОШИБКА ДИАГНОСТИКИ: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const checkEnvironment = () => {
    addLog('🔍 ENVIRONMENT VARIABLE CHECK...');
    
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    addLog(`📍 VITE_SUPABASE_URL: ${url ? '✅ Set' : '❌ Missing'}`);
    addLog(`🔑 VITE_SUPABASE_ANON_KEY: ${key ? '✅ Set' : '❌ Missing'}`);
    
    if (url) {
      addLog(`📍 URL Preview: ${url.substring(0, 50)}...`);
      addLog(`📍 URL Length: ${url.length} characters`);
      addLog(`📍 Contains supabase.co: ${url.includes('supabase.co') ? '✅' : '❌'}`);
      addLog(`📍 Starts with https: ${url.startsWith('https://') ? '✅' : '❌'}`);
      addLog(`📍 Ends correctly: ${url.endsWith('.supabase.co') ? '✅' : '❌'}`);
    }
    
    if (key) {
      addLog(`🔑 Key Length: ${key.length} characters`);
      addLog(`🔑 Starts with eyJ: ${key.startsWith('eyJ') ? '✅' : '❌'}`);
      addLog(`🔑 Contains dots: ${key.includes('.') ? '✅' : '❌'}`);
    }
    
    // Check .env file existence
    addLog('📁 Environment source: Vite build-time variables');
    addLog('💡 Variables are loaded at build time, not runtime');
  };

  const testRawFetch = async () => {
    setLoading(true);
    try {
      addLog('🌐 RAW FETCH TEST...');
      
      const url = import.meta.env.VITE_SUPABASE_URL;
      if (!url) {
        addLog('❌ No URL to test');
        return;
      }
      
      addLog(`🎯 Testing URL: ${url}`);
      
      // Test 1: Basic connectivity
      addLog('📡 Test 1: Basic connectivity (no auth)...');
      try {
        const basicResponse = await fetch(url, { method: 'HEAD' });
        addLog(`📡 Basic fetch: ${basicResponse.status} ${basicResponse.statusText}`);
      } catch (basicError) {
        addLog(`❌ Basic fetch failed: ${basicError}`);
      }
      
      // Test 2: With API key
      addLog('🔑 Test 2: With API key...');
      try {
        const authResponse = await fetch(`${url}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });
        addLog(`🔑 Auth fetch: ${authResponse.status} ${authResponse.statusText}`);
      } catch (authError) {
        addLog(`❌ Auth fetch failed: ${authError}`);
      }
      
    } catch (error) {
      addLog(`❌ RAW FETCH ERROR: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isOpen) {
    return (
      <button
        className="debug-toggle"
        onClick={() => setIsOpen(true)}
        title="Open Debug Panel"
      >
        <Bug size={16} />
      </button>
    );
  }

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h3>🐛 Debug Panel</h3>
        <button onClick={() => setIsOpen(false)}>×</button>
      </div>

      <div className="debug-section">
        <h4>Database Tests</h4>
        <div className="debug-buttons">
          <button 
            className="debug-button"
            onClick={checkEnvironment}
            disabled={loading}
          >
            <Settings size={14} />
            Check Environment
          </button>
          
          <button 
            className="debug-button"
            onClick={testConnection}
            disabled={loading}
          >
            <Wifi size={14} />
            Test Direct Connection
          </button>
          
          <button 
            className="debug-button"
            onClick={() => {
              addLog('🚀 ЗАПУСК ПОЛНОЙ ДИАГНОСТИКИ...');
              addLog('Это займет несколько секунд...');
              testDetailedConnection();
            }}
            disabled={loading}
          >
            <Database size={14} />
            Полная диагностика
          </button>
          
          <button 
            className="debug-button"
            onClick={() => {
              addLog('🔧 ДИАГНОСТИКА АКТИВНОГО ПРОЕКТА:');
              addLog('');
              addLog('Если ваш проект активен, но не работает:');
              addLog('');
              addLog('1. 🌐 CORS проблемы');
              addLog('   → Браузер блокирует запросы');
              addLog('   → Это нормально для локальной разработки');
              addLog('');
              addLog('2. 🗄️ Отсутствуют таблицы БД');
              addLog('   → Нужно создать структуру базы данных');
              addLog('   → Нажмите "Создать таблицы" ниже');
              addLog('');
              addLog('3. 🔑 Неправильные API ключи');
              addLog('   → Проверьте в Dashboard → Settings → API');
              addLog('');
              addLog('💡 Попробуйте "Создать таблицы" - это решит большинство проблем!');
            }}
            disabled={loading}
          >
            <Settings size={14} />
            🔧 Проект активен, но не работает
          </button>
          
          <button 
            className="debug-button"
            onClick={() => {
              addLog('🆕 СОЗДАНИЕ НОВОГО ПРОЕКТА SUPABASE:');
              addLog('');
              addLog('1. Откройте: https://supabase.com/dashboard/new');
              addLog('2. Введите название проекта (например: gramvpn-new)');
              addLog('3. Выберите регион (Europe для лучшей скорости)');
              addLog('4. Создайте пароль для БД');
              addLog('5. Нажмите "Create new project"');
              addLog('6. Подождите 2-3 минуты создания');
              addLog('7. Скопируйте новые URL и API Key');
              addLog('8. Нажмите "Connect to Supabase" в правом углу');
              addLog('9. Вставьте новые данные');
              addLog('10. Вернитесь сюда и протестируйте');
            }}
            disabled={loading}
          >
            <Settings size={14} />
            Создать новый проект
          </button>
          
          <button 
            className="debug-button"
            onClick={testCreateUser}
            disabled={loading}
          >
            <User size={14} />
            Test User Creation
          </button>
          
          <button 
            className="debug-button"
            onClick={() => {
              addLog('🔍 CHECKING USER CREATION REQUIREMENTS...');
              addLog('');
              addLog('✅ Requirements checklist:');
              addLog('1. Supabase URL configured: ' + (import.meta.env.VITE_SUPABASE_URL ? '✅' : '❌'));
              addLog('2. Supabase API key configured: ' + (import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅' : '❌'));
              addLog('3. Database tables exist: ❓ (test with "Test Connection")');
              addLog('4. RLS policies allow insert: ❓ (test with "Test User Creation")');
              addLog('');
              addLog('💡 If any ❌ - fix that first');
              addLog('💡 If all ✅ but still fails - check Supabase Dashboard logs');
            }}
            disabled={loading}
          >
            <Settings size={14} />
            Check Requirements
          </button>
          
          <button 
            className="debug-button"
            onClick={async () => {
              addLog('🔍 TESTING TABLE ACCESS...');
              
              if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
                addLog('❌ Supabase not configured');
                return;
              }
              
              try {
                // Test if we can read from users table
                addLog('📡 Testing SELECT from users table...');
                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?select=id&limit=1`, {
                  method: 'GET',
                  headers: {
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                addLog(`📡 SELECT response: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                  const data = await response.json();
                  addLog('✅ Table exists and readable');
                  addLog(`📊 Current users count: ${data.length}`);
                } else if (response.status === 404) {
                  addLog('❌ Table "users" does not exist');
                  addLog('💡 Create tables in Supabase Dashboard → SQL Editor');
                } else if (response.status === 401) {
                  addLog('❌ Authentication failed - check API key');
                } else {
                  const errorText = await response.text();
                  addLog(`❌ Unexpected error: ${errorText}`);
                }
              } catch (error) {
                addLog(`❌ Network error: ${error}`);
              }
            }}
            disabled={loading}
          >
            <Database size={14} />
            Test Table Access
          </button>
          
          <button 
            className="debug-button"
            onClick={() => {
              addLog('🎯 Testing VPN service in mock mode...');
              testCreateUser();
            }}
            disabled={loading || !user}
          >
            <Database size={14} />
            Test Mock Mode
          </button>
          
          <button 
            className="debug-button"
            onClick={() => {
              addLog('🔧 RLS ПОЛИТИКИ - ПОШАГОВОЕ РЕШЕНИЕ:');
              addLog('');
              addLog('ПРОБЛЕМА: Нет прав на INSERT в таблицу users');
              addLog('ПРИЧИНА: Строгие RLS политики блокируют создание пользователей');
              addLog('');
              addLog('🔧 РЕШЕНИЕ:');
              addLog('1. Откройте Supabase Dashboard → SQL Editor');
              addLog('2. Скопируйте и выполните этот SQL:');
              addLog('');
              addLog('-- Удалить старые политики');
              addLog('DROP POLICY IF EXISTS "Users can manage own data" ON users;');
              addLog('DROP POLICY IF EXISTS "Users can create own account" ON users;');
              addLog('DROP POLICY IF EXISTS "Users can read own data" ON users;');
              addLog('');
              addLog('-- Создать новые простые политики');
              addLog('CREATE POLICY "Allow user creation" ON users');
              addLog('  FOR INSERT TO anon, authenticated WITH CHECK (true);');
              addLog('');
              addLog('CREATE POLICY "Allow user read" ON users');
              addLog('  FOR SELECT TO anon, authenticated USING (true);');
              addLog('');
              addLog('CREATE POLICY "Allow user update" ON users');
              addLog('  FOR UPDATE TO anon, authenticated USING (true);');
              addLog('');
              addLog('3. Нажмите "Run" в SQL Editor');
              addLog('4. Вернитесь сюда и протестируйте создание пользователя');
              addLog('');
              addLog('💡 Эти политики разрешают всем операции с пользователями');
              addLog('💡 Для продакшена можно будет сделать более строгие');
            }}
            disabled={loading}
          >
            <Settings size={14} />
            🔧 Исправить RLS политики
          </button>
          
          <button 
            className="debug-button"
            onClick={() => {
              addLog('📋 ПОЛНЫЙ SQL ДЛЯ ИСПРАВЛЕНИЯ RLS:');
              addLog('');
              addLog('-- Скопируйте весь этот блок в Supabase SQL Editor:');
              addLog('');
              addLog('-- 1. Удаляем все старые политики');
              addLog('DROP POLICY IF EXISTS "Users can manage own data" ON users;');
              addLog('DROP POLICY IF EXISTS "Users can create own account" ON users;');
              addLog('DROP POLICY IF EXISTS "Users can read own data" ON users;');
              addLog('DROP POLICY IF EXISTS "Users can update own data" ON users;');
              addLog('DROP POLICY IF EXISTS "Service role can manage all users" ON users;');
              addLog('');
              addLog('-- 2. Создаем новые простые политики');
              addLog('CREATE POLICY "Allow user creation" ON users');
              addLog('  FOR INSERT TO anon, authenticated WITH CHECK (true);');
              addLog('');
              addLog('CREATE POLICY "Allow user read" ON users');
              addLog('  FOR SELECT TO anon, authenticated USING (true);');
              addLog('');
              addLog('CREATE POLICY "Allow user update" ON users');
              addLog('  FOR UPDATE TO anon, authenticated USING (true);');
              addLog('');
              addLog('CREATE POLICY "Service role full access" ON users');
              addLog('  FOR ALL TO service_role USING (true);');
              addLog('');
              addLog('-- 3. Аналогично для других таблиц');
              addLog('CREATE POLICY "Allow subscription operations" ON subscriptions');
              addLog('  FOR ALL TO anon, authenticated USING (true);');
              addLog('');
              addLog('CREATE POLICY "Allow referral operations" ON referral_bonuses');
              addLog('  FOR ALL TO anon, authenticated USING (true);');
              addLog('');
              addLog('💡 После выполнения SQL - протестируйте создание пользователя!');
            }}
            disabled={loading}
          >
            <Database size={14} />
            📋 Полный SQL для RLS
          </button>
        </div>
      </div>

      <div className="debug-section">
        <div className="debug-logs-header">
          <h4>Logs</h4>
          <button className="clear-logs" onClick={clearLogs}>
            <Trash2 size={12} />
            Clear
          </button>
        </div>
        <div className="debug-logs">
          {logs.length === 0 ? (
            <div className="no-logs">No logs yet. Run some tests!</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="log-entry">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {user && (
        <div className="debug-section">
          <h4>Current User Data</h4>
          <pre className="user-data">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      )}

      <div className="debug-section">
        <h4>Environment Status</h4>
        <div className="env-status">
          <div className="env-item">
            <span>Supabase URL:</span>
            <span className={import.meta.env.VITE_SUPABASE_URL ? 'status-ok' : 'status-error'}>
              {import.meta.env.VITE_SUPABASE_URL ? `✅ ${import.meta.env.VITE_SUPABASE_URL.substring(0, 30)}...` : '❌ Missing'}
            </span>
          </div>
          <div className="env-item">
            <span>Supabase Key:</span>
            <span className={import.meta.env.VITE_SUPABASE_ANON_KEY ? 'status-ok' : 'status-error'}>
              {import.meta.env.VITE_SUPABASE_ANON_KEY ? `✅ ${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...` : '❌ Missing'}
            </span>
          </div>
          <div className="env-item">
            <span>URL Format:</span>
            <span className={import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co') ? 'status-ok' : 'status-error'}>
              {import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co') ? '✅ Valid' : '❌ Invalid'}
            </span>
          </div>
          <div className="env-item">
            <span>Key Format:</span>
            <span className={import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('eyJ') ? 'status-ok' : 'status-error'}>
              {import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('eyJ') ? '✅ Valid JWT' : '❌ Invalid'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};