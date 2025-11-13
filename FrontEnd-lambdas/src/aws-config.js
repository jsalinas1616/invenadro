import { Amplify } from 'aws-amplify';
// Importar configuración por ambiente
import { getConfig } from './config/environments';

// Obtener configuración del ambiente actual
const env = getConfig();

// Log del ambiente para debugging
console.log(`🔐 Cognito configurado para ambiente: ${env.name} (${env.displayName})`);
console.log(`👤 User Pool: ${env.cognito.userPoolId}`);

// Configuración de AWS Amplify - Multi-ambiente
Amplify.configure({
  Auth: {
    Cognito: {
      // Configuración del User Pool de Cognito desde ambiente
      userPoolId: env.cognito.userPoolId,
      userPoolClientId: env.cognito.clientId,
      
      // Opcional: Configuración adicional
      signUpVerificationMethod: 'code', // 'code' | 'link'
      loginWith: {
        email: true,
        username: true
      }
    }
  }
});

export default Amplify;

