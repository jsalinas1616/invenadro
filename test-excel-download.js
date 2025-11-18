#!/usr/bin/env node

/**
 * Script de prueba para excel-generator Lambda
 * 
 * Uso:
 * 1. Obtener token JWT del navegador (F12 -> Application -> Local Storage -> idToken)
 * 2. node test-excel-download.js <processId> <clienteId> <jwtToken>
 * 
 * Ejemplo:
 * node test-excel-download.js 82877a03-8500-4515-8a6d-340e265c26f0 7051602 eyJraWQ...
 */

const https = require('https');
const fs = require('fs');

// Argumentos de línea de comandos
const [,, processId, clienteId, jwtToken] = process.argv;

if (!processId || !clienteId || !jwtToken) {
    console.error('ERROR: Faltan argumentos');
    console.error('Uso: node test-excel-download.js <processId> <clienteId> <jwtToken>');
    console.error('');
    console.error('Para obtener el token JWT:');
    console.error('1. Abre el navegador en https://d64fiymsncllq.cloudfront.net');
    console.error('2. F12 -> Application -> Local Storage');
    console.error('3. Busca la key que termine en ".idToken.jwt"');
    console.error('4. Copia el valor');
    process.exit(1);
}

const API_URL = `https://n528zjrguk.execute-api.mx-central-1.amazonaws.com/jul-dev/excel/${processId}/${clienteId}`;

console.log('='.repeat(80));
console.log('TEST: Excel Generator Lambda');
console.log('='.repeat(80));
console.log('');
console.log('Process ID:', processId);
console.log('Cliente ID:', clienteId);
console.log('JWT Token:', jwtToken.substring(0, 50) + '...');
console.log('API URL:', API_URL);
console.log('');
console.log('='.repeat(80));
console.log('');

const options = {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Accept': 'text/plain'
    }
};

console.log('Enviando petición...');
console.log('');

const startTime = Date.now();

https.get(API_URL, options, (res) => {
    const duration = Date.now() - startTime;
    
    console.log('RESPONSE RECIBIDO:');
    console.log('-'.repeat(80));
    console.log('Status Code:', res.statusCode, res.statusMessage);
    console.log('Duration:', duration + 'ms');
    console.log('Headers:');
    Object.keys(res.headers).forEach(key => {
        console.log(`  ${key}: ${res.headers[key]}`);
    });
    console.log('');
    
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('BODY RECIBIDO:');
        console.log('-'.repeat(80));
        console.log('Tamaño:', data.length, 'chars');
        console.log('Primeros 200 caracteres:', data.substring(0, 200));
        console.log('Últimos 50 caracteres:', '...' + data.substring(data.length - 50));
        console.log('');
        
        // Verificar si es JSON
        let isJSON = false;
        try {
            const json = JSON.parse(data);
            isJSON = true;
            console.log('FORMATO: JSON');
            console.log('Keys:', Object.keys(json));
            if (json.body) {
                console.log('json.body tamaño:', json.body.length);
                console.log('json.body primeros 50:', json.body.substring(0, 50));
            }
        } catch (e) {
            console.log('FORMATO: Texto plano (NO es JSON)');
        }
        console.log('');
        
        // Verificar si es Base64 válido
        const base64Regex = /^[A-Za-z0-9+/=]+$/;
        const base64Text = isJSON ? JSON.parse(data).body || data : data;
        
        console.log('VALIDACION BASE64:');
        console.log('-'.repeat(80));
        console.log('Cumple regex [A-Za-z0-9+/=]:', base64Regex.test(base64Text));
        console.log('Empieza con "UEs" (PK):', base64Text.startsWith('UEs'));
        console.log('');
        
        if (res.statusCode === 200) {
            // Intentar convertir a binario
            try {
                const buffer = Buffer.from(base64Text, 'base64');
                console.log('CONVERSION A BINARIO:');
                console.log('-'.repeat(80));
                console.log('Buffer creado exitosamente');
                console.log('Tamaño binario:', buffer.length, 'bytes');
                console.log('');
                
                // Guardar archivo
                const filename = `test-cliente-${clienteId}.xlsx`;
                fs.writeFileSync(filename, buffer);
                console.log('ARCHIVO GUARDADO:');
                console.log('-'.repeat(80));
                console.log('Archivo:', filename);
                console.log('Tamaño:', fs.statSync(filename).size, 'bytes');
                console.log('');
                console.log('SUCCESS: Intenta abrir el archivo:', filename);
                console.log('');
            } catch (error) {
                console.error('ERROR CONVIRTIENDO BASE64:', error.message);
            }
        } else {
            console.error('ERROR: Status code no es 200');
            console.error('Body completo:', data);
        }
        
        console.log('='.repeat(80));
    });
    
}).on('error', (error) => {
    console.error('ERROR EN REQUEST:', error.message);
    console.error('Stack:', error.stack);
});

