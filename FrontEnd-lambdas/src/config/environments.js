/**
 * Configuración de ambientes para Invenadro Frontend
 * 
 * Este archivo centraliza todas las configuraciones por ambiente.
 * En producción, usar variables de entorno (REACT_APP_*) en lugar de este archivo.
 */

const environments = {
  'jul-dev': {
    name: 'jul-dev',
    displayName: 'Desarrollo (Julio)',
    account: '975130647458',
    region: 'mx-central-1',
    apiGateway: {
      url: 'https://c9nzcqgz16.execute-api.mx-central-1.amazonaws.com/jul-dev',
      region: 'mx-central-1'
    },
    cognito: {
      userPoolId: 'mx-central-1_WIAYTqFq7',
      clientId: 'jo46f6pkduolu7hdb02geo0tj',
      region: 'mx-central-1'
    },
    s3: {
      resultsBucket: 'invenadro-backend-jul-dev-results',
      uploadsBucket: 'invenadro-backend-jul-dev-uploads'
    },
    dynamodb: {
      jobsTable: 'invenadro-backend-jul-dev-jobs'
    },
    stepFunction: {
      arn: 'arn:aws:states:mx-central-1:975130647458:stateMachine:invenadro-backend-jul-dev'
    }
  },

  'jul-qa': {
    name: 'jul-qa',
    displayName: 'QA (Julio)',
    account: '975130647458', // Cambiar si es otra cuenta
    region: 'mx-central-1',
    apiGateway: {
      url: 'https://PLACEHOLDER.execute-api.mx-central-1.amazonaws.com/jul-qa',
      region: 'mx-central-1'
    },
    cognito: {
      userPoolId: 'mx-central-1_PLACEHOLDER',
      clientId: 'PLACEHOLDER',
      region: 'mx-central-1'
    },
    s3: {
      resultsBucket: 'invenadro-backend-jul-qa-results',
      uploadsBucket: 'invenadro-backend-jul-qa-uploads'
    },
    dynamodb: {
      jobsTable: 'invenadro-backend-jul-qa-jobs'
    },
    stepFunction: {
      arn: 'arn:aws:states:mx-central-1:975130647458:stateMachine:invenadro-backend-jul-qa'
    }
  },

  'nadro-qa': {
    name: 'nadro-qa',
    displayName: 'QA (Nadro)',
    account: 'PLACEHOLDER', // Cuenta Nadro
    region: 'mx-central-1',
    apiGateway: {
      url: 'https://PLACEHOLDER.execute-api.mx-central-1.amazonaws.com/nadro-qa',
      region: 'mx-central-1'
    },
    cognito: {
      userPoolId: 'mx-central-1_PLACEHOLDER',
      clientId: 'PLACEHOLDER',
      region: 'mx-central-1'
    },
    s3: {
      resultsBucket: 'invenadro-backend-nadro-qa-results',
      uploadsBucket: 'invenadro-backend-nadro-qa-uploads'
    },
    dynamodb: {
      jobsTable: 'invenadro-backend-nadro-qa-jobs'
    },
    stepFunction: {
      arn: 'arn:aws:states:mx-central-1:PLACEHOLDER:stateMachine:invenadro-backend-nadro-qa'
    }
  },

  'nadro-prod': {
    name: 'nadro-prod',
    displayName: 'Producción (Nadro)',
    account: 'PLACEHOLDER', // Cuenta Nadro
    region: 'mx-central-1',
    apiGateway: {
      url: 'https://PLACEHOLDER.execute-api.mx-central-1.amazonaws.com/nadro-prod',
      region: 'mx-central-1'
    },
    cognito: {
      userPoolId: 'mx-central-1_PLACEHOLDER',
      clientId: 'PLACEHOLDER',
      region: 'mx-central-1'
    },
    s3: {
      resultsBucket: 'invenadro-backend-nadro-prod-results',
      uploadsBucket: 'invenadro-backend-nadro-prod-uploads'
    },
    dynamodb: {
      jobsTable: 'invenadro-backend-nadro-prod-jobs'
    },
    stepFunction: {
      arn: 'arn:aws:states:mx-central-1:PLACEHOLDER:stateMachine:invenadro-backend-nadro-prod'
    }
  }
};

/**
 * Obtiene la configuración del ambiente actual
 * 
 * Prioridad:
 * 1. Variable de entorno REACT_APP_STAGE
 * 2. Hostname (para detectar automáticamente en CloudFront)
 * 3. Fallback a 'jul-dev'
 */
export function getCurrentEnvironment() {
  // 1. Variable de entorno explícita (build-time)
  const envStage = process.env.REACT_APP_STAGE;
  if (envStage && environments[envStage]) {
    console.log(`🌍 Ambiente detectado por REACT_APP_STAGE: ${envStage}`);
    return environments[envStage];
  }

  // 2. Detección por hostname (runtime)
  const hostname = window.location.hostname;
  
  // Detectar CloudFront distributions por patrón
  if (hostname.includes('cloudfront.net')) {
    // Extraer el ambiente del path o subdomain si existe
    const path = window.location.pathname;
    if (path.includes('/jul-dev') || hostname.includes('jul-dev')) {
      console.log(`🌍 Ambiente detectado por URL: jul-dev`);
      return environments['jul-dev'];
    }
    if (path.includes('/jul-qa') || hostname.includes('jul-qa')) {
      console.log(`🌍 Ambiente detectado por URL: jul-qa`);
      return environments['jul-qa'];
    }
    if (path.includes('/nadro-qa') || hostname.includes('nadro-qa')) {
      console.log(`🌍 Ambiente detectado por URL: nadro-qa`);
      return environments['nadro-qa'];
    }
    if (path.includes('/nadro-prod') || hostname.includes('nadro-prod')) {
      console.log(`🌍 Ambiente detectado por URL: nadro-prod`);
      return environments['nadro-prod'];
    }
  }

  // 3. Localhost = jul-dev
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log(`🌍 Ambiente local detectado: jul-dev`);
    return environments['jul-dev'];
  }

  // 4. Fallback
  console.warn(`⚠️ No se pudo detectar ambiente, usando jul-dev por defecto`);
  return environments['jul-dev'];
}

/**
 * Obtiene configuración específica del ambiente actual
 */
export function getConfig() {
  return getCurrentEnvironment();
}

/**
 * Lista todos los ambientes disponibles
 */
export function getAllEnvironments() {
  return Object.values(environments);
}

export default environments;

