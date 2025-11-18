import React, { useEffect } from 'react';
import { Authenticator, translations } from '@aws-amplify/ui-react';
import { I18n } from 'aws-amplify/utils';
import { fetchAuthSession } from 'aws-amplify/auth';
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
  // Hook para insertar Header/Footer SOLO en pantalla de login
  useEffect(() => {
    // Ejecutar después de que Amplify UI renderice (un solo timeout)
    const timer = setTimeout(() => {
      const authenticator = document.querySelector('[data-amplify-authenticator]:not([data-amplify-authenticated])');
      if (!authenticator || document.querySelector('.auth-header')) return;

      const form = authenticator.querySelector('[data-amplify-form]');
      if (!form) return;

      // Crear e insertar header
      const headerDiv = document.createElement('div');
      headerDiv.className = 'auth-header';
      headerDiv.innerHTML = `
        <img src="/logo-invenadro.png" alt="Invenadro Logo" class="auth-logo"/>
        <h2 class="auth-title">Sistema de Optimización</h2>
        <p class="auth-subtitle">Panel de control</p>
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
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Hook para AUTO-SKIPEAR la pantalla de "Verificar contacto"
  // NOTA: Aunque eliminamos AutoVerifiedAttributes, este fallback protege
  // contra usuarios creados con config vieja o bugs de Cognito/Amplify
  useEffect(() => {
    console.log('[AUTH] Monitor auto-skip activo...');
    
    const interval = setInterval(async () => {
      const verifyScreen = document.querySelector('[data-amplify-authenticator-verifyuser]');
      
      if (verifyScreen) {
        console.log('[AUTH] Pantalla "Verificar contacto" detectada - AUTO-SKIPEANDO...');
        
        const skipButton = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent.includes('Omitir') || btn.textContent.includes('Skip')
        );
        
        if (skipButton) {
          console.log('[AUTH] Click en "Omitir" automatico');
          skipButton.click();
        } else {
          try {
            const session = await fetchAuthSession({ forceRefresh: true });
            if (session.tokens) {
              console.log('[AUTH] Sesion valida, forzando recarga...');
              window.location.reload();
            }
          } catch (error) {
            console.error('[AUTH] Error verificando sesion:', error);
          }
        }
      }
    }, 300);

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

