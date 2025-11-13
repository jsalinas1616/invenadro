#!/usr/bin/env node

/**
 * Script: update-environments-js.js
 * Descripción: Actualiza el archivo environments.js con valores del backend
 * Uso: node update-environments-js.js <stage> <apiUrl> <userPoolId> <clientId> ...
 */

const fs = require('fs');
const path = require('path');

// Colores para console
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(message, color = 'blue') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Obtener parámetros
const [
  ,
  ,
  stage,
  apiUrl,
  userPoolId,
  clientId,
  uploadsBucket,
  resultsBucket,
  jobsTable,
  stateMachineArn,
  accountId,
  region
] = process.argv;

// Validar parámetros
if (!stage || !apiUrl || !userPoolId || !clientId) {
  console.error('❌ Faltan parámetros requeridos');
  console.error('Uso: node update-environments-js.js <stage> <apiUrl> <userPoolId> <clientId> <uploadsBucket> <resultsBucket> <jobsTable> <stateMachineArn> <accountId> <region>');
  process.exit(1);
}

// Ruta al archivo environments.js
const projectRoot = path.join(__dirname, '..');
const environmentsPath = path.join(projectRoot, 'FrontEnd-lambdas/src/config/environments.js');

log(`📝 Leyendo archivo: ${environmentsPath}`, 'blue');

// Leer archivo
let content;
try {
  content = fs.readFileSync(environmentsPath, 'utf8');
} catch (error) {
  console.error(`❌ Error leyendo archivo: ${error.message}`);
  process.exit(1);
}

log(`🔍 Buscando configuración para stage: ${stage}`, 'blue');

// Función para escapar caracteres especiales en regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Función para reemplazar un valor en el objeto del stage
function replaceValue(content, stage, path, newValue) {
  // Construir regex para encontrar el stage y el path específico
  // Ejemplo: 'jul-dev' -> apiGateway -> url
  
  const stageRegex = new RegExp(
    `('${escapeRegex(stage)}'\\s*:\\s*{[\\s\\S]*?)` + // Inicio del objeto del stage
    `(${escapeRegex(path)}\\s*:\\s*['"])([^'"]*?)(['"])`, // El campo específico
    'g'
  );
  
  return content.replace(stageRegex, `$1$2${newValue}$4`);
}

// Reemplazar valores uno por uno
log(`🔄 Actualizando valores para ${stage}...`, 'blue');

try {
  // API Gateway URL
  content = replaceValue(content, stage, 'url', apiUrl);
  log(`  ✓ API Gateway URL: ${apiUrl}`, 'green');
  
  // Cognito User Pool ID
  content = replaceValue(content, stage, 'userPoolId', userPoolId);
  log(`  ✓ User Pool ID: ${userPoolId}`, 'green');
  
  // Cognito Client ID
  content = replaceValue(content, stage, 'clientId', clientId);
  log(`  ✓ Client ID: ${clientId}`, 'green');
  
  // S3 Buckets
  content = replaceValue(content, stage, 'resultsBucket', resultsBucket);
  log(`  ✓ Results Bucket: ${resultsBucket}`, 'green');
  
  content = replaceValue(content, stage, 'uploadsBucket', uploadsBucket);
  log(`  ✓ Uploads Bucket: ${uploadsBucket}`, 'green');
  
  // DynamoDB Table
  content = replaceValue(content, stage, 'jobsTable', jobsTable);
  log(`  ✓ Jobs Table: ${jobsTable}`, 'green');
  
  // Step Function ARN
  content = replaceValue(content, stage, 'arn', stateMachineArn);
  log(`  ✓ Step Function ARN: ${stateMachineArn}`, 'green');
  
  // Account ID
  content = replaceValue(content, stage, 'account', accountId);
  log(`  ✓ Account ID: ${accountId}`, 'green');
  
  // Region
  content = replaceValue(content, stage, 'region', region);
  log(`  ✓ Region: ${region}`, 'green');
  
} catch (error) {
  console.error(`❌ Error actualizando valores: ${error.message}`);
  process.exit(1);
}

// Guardar archivo actualizado
log(`💾 Guardando cambios en ${environmentsPath}`, 'blue');

try {
  fs.writeFileSync(environmentsPath, content, 'utf8');
  log(`✅ Archivo actualizado correctamente`, 'green');
} catch (error) {
  console.error(`❌ Error guardando archivo: ${error.message}`);
  process.exit(1);
}

// Mostrar resumen
console.log('');
log('📊 Resumen de cambios:', 'blue');
console.log(`   Stage: ${stage}`);
console.log(`   API Gateway: ${apiUrl}`);
console.log(`   Cognito: ${userPoolId}`);
console.log(`   Region: ${region}`);
console.log('');
log('✅ Configuración actualizada exitosamente', 'green');

process.exit(0);

