/**
 * i18n Validation Script
 *
 * Validates translation files for:
 * 1. All keys are strings (not objects used as values)
 * 2. All 3 languages have the same structure
 * 3. No missing translations
 * 4. No object keys being used as string values
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

interface ValidationError {
  type: 'object_value' | 'structure_mismatch' | 'missing_key' | 'type_mismatch';
  key: string;
  language?: string;
  details: string;
}

const LOCALE_DIR = path.join(__dirname, '..', 'client', 'src', 'locales');
const LANGUAGES = ['en', 'ru', 'uz'];

function loadTranslations(): Record<string, TranslationObject> {
  const translations: Record<string, TranslationObject> = {};

  for (const lang of LANGUAGES) {
    const filePath = path.join(LOCALE_DIR, `${lang}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Translation file not found: ${filePath}`);
    }
    translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  return translations;
}

function getAllKeys(obj: TranslationObject, prefix = ''): string[] {
  const keys: string[] = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === 'object' && value !== null) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

function getValueAtPath(obj: TranslationObject, path: string): string | TranslationObject | undefined {
  const parts = path.split('.');
  let current: any = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
}

function validateStructure(translations: Record<string, TranslationObject>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Get all keys from English (base language)
  const enKeys = getAllKeys(translations.en);

  // Check each language has the same keys
  for (const lang of LANGUAGES) {
    if (lang === 'en') continue;

    const langKeys = getAllKeys(translations[lang]);

    // Check for missing keys
    for (const key of enKeys) {
      if (!langKeys.includes(key)) {
        errors.push({
          type: 'missing_key',
          key,
          language: lang,
          details: `Key "${key}" exists in EN but missing in ${lang.toUpperCase()}`
        });
      }
    }

    // Check for extra keys
    for (const key of langKeys) {
      if (!enKeys.includes(key)) {
        errors.push({
          type: 'structure_mismatch',
          key,
          language: lang,
          details: `Key "${key}" exists in ${lang.toUpperCase()} but not in EN`
        });
      }
    }
  }

  return errors;
}

function validateTypes(translations: Record<string, TranslationObject>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Get all keys from English
  const enKeys = getAllKeys(translations.en);

  // For each key, check if the types match across all languages
  for (const key of enKeys) {
    const enValue = getValueAtPath(translations.en, key);
    const enType = typeof enValue;

    for (const lang of LANGUAGES) {
      if (lang === 'en') continue;

      const langValue = getValueAtPath(translations[lang], key);
      const langType = typeof langValue;

      if (enType !== langType) {
        errors.push({
          type: 'type_mismatch',
          key,
          language: lang,
          details: `Key "${key}" is ${enType} in EN but ${langType} in ${lang.toUpperCase()}`
        });
      }
    }
  }

  return errors;
}

function findObjectKeys(obj: TranslationObject, prefix = ''): string[] {
  const objectKeys: string[] = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === 'object' && value !== null) {
      // This is an object key - it has children
      objectKeys.push(fullKey);
      objectKeys.push(...findObjectKeys(value, fullKey));
    }
  }

  return objectKeys;
}

function validateNoObjectValues(translations: Record<string, TranslationObject>): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const lang of LANGUAGES) {
    const objectKeys = findObjectKeys(translations[lang]);

    for (const key of objectKeys) {
      errors.push({
        type: 'object_value',
        key,
        language: lang,
        details: `Key "${key}" is an object in ${lang.toUpperCase()}. Object keys should only be used for namespace organization, not as values.`
      });
    }
  }

  return errors;
}

function main() {
  console.log('🔍 Validating i18n translations...\n');

  try {
    const translations = loadTranslations();
    console.log(`✅ Loaded translations for: ${LANGUAGES.join(', ')}\n`);

    // Run validations
    const structureErrors = validateStructure(translations);
    const typeErrors = validateTypes(translations);
    const objectErrors = validateNoObjectValues(translations);

    const allErrors = [...structureErrors, ...typeErrors, ...objectErrors];

    if (allErrors.length === 0) {
      console.log('✅ All validations passed!\n');
      console.log(`📊 Statistics:`);
      console.log(`   - Languages: ${LANGUAGES.length}`);
      console.log(`   - Total keys: ${getAllKeys(translations.en).length}`);
      console.log(`   - Object namespaces: ${findObjectKeys(translations.en).length}`);
      return;
    }

    // Group errors by type
    const errorsByType = allErrors.reduce((acc, error) => {
      if (!acc[error.type]) {
        acc[error.type] = [];
      }
      acc[error.type].push(error);
      return acc;
    }, {} as Record<string, ValidationError[]>);

    console.log(`❌ Found ${allErrors.length} validation errors:\n`);

    // Print object value errors (these are informational, not actual errors)
    if (errorsByType.object_value) {
      console.log(`📦 Object Keys (${errorsByType.object_value.length}) - These are namespace containers:`);
      const uniqueObjectKeys = new Set(errorsByType.object_value.map(e => e.key));
      uniqueObjectKeys.forEach(key => {
        console.log(`   - ${key}`);
      });
      console.log();
    }

    // Print structure mismatches
    if (errorsByType.structure_mismatch || errorsByType.missing_key) {
      const structureIssues = [...(errorsByType.structure_mismatch || []), ...(errorsByType.missing_key || [])];
      console.log(`🔴 Structure Issues (${structureIssues.length}):`);
      structureIssues.forEach(error => {
        console.log(`   [${error.language?.toUpperCase()}] ${error.details}`);
      });
      console.log();
    }

    // Print type mismatches
    if (errorsByType.type_mismatch) {
      console.log(`🔴 Type Mismatches (${errorsByType.type_mismatch.length}):`);
      errorsByType.type_mismatch.forEach(error => {
        console.log(`   [${error.language?.toUpperCase()}] ${error.details}`);
      });
      console.log();
    }

    // Exit with error if there are actual issues (not just object keys)
    const actualErrors = allErrors.filter(e => e.type !== 'object_value');
    if (actualErrors.length > 0) {
      console.log(`\n❌ Validation failed with ${actualErrors.length} errors`);
      process.exit(1);
    } else {
      console.log(`\n✅ No critical errors found`);
    }

  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

main();
