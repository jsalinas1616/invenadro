import React, { useEffect } from 'react';
import { Authenticator, translations } from '@aws-amplify/ui-react';
import { I18n } from 'aws-amplify/utils';
import '../styles/CustomAuth.css';

// Configurar traducciones al español
I18n.putVocabularies(translations);
I18n.setLanguage('es');

// Vocabulario personalizado en español
I18n.putVocabularies({
  es: {
    'Sign In': 'Iniciar Sesión',
    'Sign in': 'Iniciar sesión',
    'Sign Up': 'Crear Cuenta',
    'Create Account': 'Crear Cuenta',
    'Forgot your password?': '¿Olvidaste tu contraseña?',
    'Reset Password': 'Recuperar Contraseña',
    'Back to Sign In': 'Volver a Iniciar Sesión',
    'Send code': 'Enviar código',
    'Submit': 'Enviar',
    'Code': 'Código',
    'New Password': 'Nueva Contraseña',
  },
});

// Textos personalizados en español
const formFields = {
  signIn: {
    username: {
      placeholder: 'Ingresa tu email o usuario',
      label: 'Correo Electrónico o Usuario',
      isRequired: true,
    },
    password: {
      placeholder: 'Ingresa tu contraseña',
      label: 'Contraseña',
      isRequired: true,
    },
  },
  signUp: {
    email: {
      placeholder: 'ejemplo@correo.com',
      label: 'Correo Electrónico',
      isRequired: true,
      order: 1,
    },
    password: {
      placeholder: 'Mínimo 8 caracteres',
      label: 'Contraseña',
      isRequired: true,
      order: 2,
    },
    confirm_password: {
      placeholder: 'Confirma tu contraseña',
      label: 'Confirmar Contraseña',
      isRequired: true,
      order: 3,
    },
  },
  forceNewPassword: {
    password: {
      placeholder: 'Ingresa tu nueva contraseña',
      label: 'Nueva Contraseña',
    },
  },
  resetPassword: {
    username: {
      placeholder: 'Ingresa tu email',
      label: 'Correo Electrónico',
    },
  },
  confirmResetPassword: {
    confirmation_code: {
      placeholder: 'Ingresa el código',
      label: 'Código de Confirmación',
    },
    password: {
      placeholder: 'Ingresa tu nueva contraseña',
      label: 'Nueva Contraseña',
    },
    confirm_password: {
      placeholder: 'Confirma tu nueva contraseña',
      label: 'Confirmar Nueva Contraseña',
    },
  },
};

const CustomAuthenticator = ({ children }) => {
  console.log('🚀 [CustomAuthenticator] Componente montado');
  
  // Hook para ocultar automáticamente la pantalla de verificación
  useEffect(() => {
    console.log('🔍 [useEffect-hideVerify] Iniciando búsqueda de pantalla de verificación...');
    
    const hideVerifyScreen = () => {
      // Buscar el authenticator y su estado
      const authenticator = document.querySelector('[data-amplify-authenticator]');
      const isAuthenticated = authenticator?.getAttribute('data-amplify-authenticated');
      console.log(`📊 [hideVerify] Authenticator estado: ${isAuthenticated ? 'AUTENTICADO' : 'NO AUTENTICADO'}`);
      
      // Buscar formulario de verifyUser específicamente
      const verifyForm = document.querySelector('form[data-amplify-authenticator-verifyuser]');
      if (verifyForm) {
        console.log('🚨 [hideVerify] ¡Formulario de verificación ENCONTRADO!');
        verifyForm.style.display = 'none';
        verifyForm.style.visibility = 'hidden';
        verifyForm.style.opacity = '0';
        verifyForm.style.height = '0';
        verifyForm.style.position = 'absolute';
        verifyForm.style.left = '-9999px';
        console.log('✅ [hideVerify] Formulario de verificación OCULTADO con CSS agresivo');
      }
      
      // Buscar cualquier elemento que contenga textos relacionados con verificación
      const verifyTexts = ['Verificar contacto', 'información de contacto verificada', 'recuperación de la cuenta'];
      const verifyElements = document.querySelectorAll('[data-amplify-authenticator] *');
      let foundCount = 0;
      
      verifyElements.forEach(el => {
        if (el.textContent) {
          const hasVerifyText = verifyTexts.some(text => el.textContent.includes(text));
          if (hasVerifyText) {
            foundCount++;
            let parent = el.closest('[data-amplify-router-content]');
            if (parent) {
              parent.style.display = 'none';
              console.log(`🚫 [hideVerify] Elemento ${foundCount} con texto de verificación ocultado`);
            }
          }
        }
      });
      
      // También buscar y hacer click automático en "Omitir"
      const skipButton = document.querySelector('button[type="button"]');
      if (skipButton && skipButton.textContent && skipButton.textContent.includes('Omitir')) {
        console.log('🔘 [hideVerify] Botón "Omitir" encontrado, haciendo click automático...');
        skipButton.click();
        foundCount++;
      }
      
      if (foundCount === 0) {
        console.log('✅ [hideVerify] No se encontró pantalla de verificación en el DOM');
      }
    };

    // Ejecutar inmediatamente y luego observar cambios
    hideVerifyScreen();
    const interval = setInterval(hideVerifyScreen, 100);

    // Limpiar intervalo después de 5 segundos
    setTimeout(() => {
      clearInterval(interval);
      console.log('⏱️ [hideVerify] Intervalo detenido después de 5 segundos');
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Hook para insertar Header/Footer SOLO en pantalla de login
  useEffect(() => {
    console.log('🎨 [useEffect-insertHeader] Iniciando inserción de Header/Footer...');
    
    const insertCustomHeader = () => {
      // Solo insertar si NO está autenticado
      const authenticator = document.querySelector('[data-amplify-authenticator]:not([data-amplify-authenticated])');
      if (!authenticator) {
        console.log('⚠️ [insertHeader] Authenticator no encontrado o ya autenticado');
        return;
      }
      
      console.log('✅ [insertHeader] Authenticator NO autenticado encontrado');

      // Buscar si ya existe el header personalizado
      if (document.querySelector('.auth-header')) {
        console.log('ℹ️ [insertHeader] Header ya existe, saltando...');
        return;
      }

      // Buscar el formulario de login
      const form = authenticator.querySelector('[data-amplify-form]');
      if (!form) {
        console.log('⚠️ [insertHeader] Formulario no encontrado');
        return;
      }
      
      console.log('📝 [insertHeader] Formulario encontrado, insertando header y footer...');

      // Crear e insertar header
      const headerDiv = document.createElement('div');
      headerDiv.className = 'auth-header';
      headerDiv.innerHTML = `
        <img src="/logo-invenadro.png" alt="Invenadro Logo" class="auth-logo"/>
        <h2 class="auth-title">Invenadro</h2>
        <p class="auth-subtitle">Control de acceso</p>
      `;
      form.prepend(headerDiv);

      // Crear e insertar footer
      const footerDiv = document.createElement('div');
      footerDiv.className = 'auth-footer';
      footerDiv.innerHTML = `
        <div class="d-flex align-items-center justify-content-center gap-2 mt-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #a0aec0">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p class="text-muted small mb-0">Autenticación segura con AWS Cognito</p>
        </div>
      `;
      form.appendChild(footerDiv);
      
      console.log('✅ [insertHeader] Header y Footer insertados correctamente');
    };

    // Ejecutar varias veces para asegurar que se inserte
    insertCustomHeader();
    const interval = setInterval(insertCustomHeader, 200);
    setTimeout(() => {
      clearInterval(interval);
      console.log('⏱️ [insertHeader] Intervalo detenido después de 3 segundos');
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Authenticator
      formFields={formFields}
      loginMechanisms={['email']}
    >
      {({ signOut, user }) => {
        return (
          <>
            {children({ signOut, user })}
          </>
        );
      }}
    </Authenticator>
  );
};

export default CustomAuthenticator;

