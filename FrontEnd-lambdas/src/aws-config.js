import { Amplify } from 'aws-amplify';

// Configuración de AWS Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      // Configuración del User Pool de Cognito - PROYECTO INVENADRO
      userPoolId: 'mx-central-1_WIAYTqFq7',  // ✅ User Pool ID (invenadro-backend-jul-dev)
      userPoolClientId: 'jo46f6pkduolu7hdb02geo0tj',  // ✅ App Client SIN secret
      
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

