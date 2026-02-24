/**
 * Быстрое исправление: добавление полей email_verified и phone_verified
 *
 * Использование:
 * 1. Скопируйте Connection String из Neon Console
 * 2. Запустите: DATABASE_URL="ваш_connection_string" npx tsx quick-fix.ts
 */

import pg from 'pg';

const { Client } = pg;

async function quickFix() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL не установлен');
    console.log('\n📋 Как использовать:');
    console.log('1. Откройте Neon Console → Connection Details');
    console.log('2. Скопируйте Connection String');
    console.log('3. Запустите команду:');
    console.log('   DATABASE_URL="ваш_connection_string" npx tsx quick-fix.ts');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log('🔌 Подключение к базе данных...');
    await client.connect();
    console.log('✅ Подключено!');

    console.log('\n📝 Добавление поля email_verified...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false
    `);
    console.log('✅ email_verified добавлено');

    console.log('\n📝 Добавление поля phone_verified...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false
    `);
    console.log('✅ phone_verified добавлено');

    console.log('\n🔍 Проверка...');
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('email_verified', 'phone_verified')
      ORDER BY column_name
    `);

    console.log('\n📊 Результат:');
    console.table(result.rows);

    if (result.rows.length === 2) {
      console.log('\n🎉 УСПЕХ! Оба поля добавлены!');
      console.log('\n📝 Следующие шаги:');
      console.log('1. Обновите страницу /admin/users');
      console.log('2. Пользователи должны отображаться!');
    } else {
      console.log('\n⚠️  ВНИМАНИЕ: Ожидалось 2 поля, найдено:', result.rows.length);
    }

  } catch (error: any) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.log('\n💡 Совет: Убедитесь что Connection String правильный');
  } finally {
    await client.end();
    console.log('\n🔌 Соединение закрыто');
  }
}

quickFix();
