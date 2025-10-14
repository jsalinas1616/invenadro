import { Amplify } from 'aws-amplify';

// Configuración de AWS Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      // IMPORTANTE: Reemplaza estos valores con los de tu User Pool de Cognito
      // Los obtendrás después de crear el User Pool en la consola de AWS
      userPoolId: 'us-east-1_UQ9eT0Tgn',  // ✅ User Pool ID (recreado)
      userPoolClientId: '47s3l4n3u40a9g48abp0jr3adq',  // ✅ App Client SIN secret
      
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

