import React from 'react';
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

// Componente de Header personalizado para el login
const AuthHeader = () => {
  return (
    <div className="auth-header">
      <img 
        src="/logo-invenadro.png" 
        alt="Invenadro Logo" 
        className="auth-logo"
      />
      <h2 className="auth-title">Sistema de Optimización</h2>
      <p className="auth-subtitle">Factores de Redondeo - Inicio de Sesión</p>
    </div>
  );
};

// Componente de Footer personalizado
const AuthFooter = () => {
  return (
    <div className="auth-footer">
      <div className="auth-divider"></div>
      <div className="d-flex align-items-center justify-content-center gap-2 mt-3">
        <span className="auth-lock-icon">🔒</span>
        <p className="text-muted small mb-0">
          Autenticación segura
        </p>
      </div>
    </div>
  );
};

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

// Personalización de componentes
const components = {
  Header: AuthHeader,
  Footer: AuthFooter,
};

const CustomAuthenticator = ({ children }) => {
  return (
    <Authenticator
      formFields={formFields}
      components={components}
      variation="modal"
      socialProviders={[]}
    >
      {({ signOut, user }) => {
        // Cuando el usuario está autenticado, renderizar la app SIN el wrapper del login
        return (
          <>
            {/* Wrapper de login bonito SOLO cuando NO hay usuario */}
            <style>{`
              [data-amplify-authenticator]:not([data-amplify-authenticated]) {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100vh !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 9999 !important;
                overflow: auto !important;
                background: linear-gradient(135deg, #648a26 0%, #4a6b1d 50%, #8ab346 100%) !important;
              }
            `}</style>
            {children({ signOut, user })}
          </>
        );
      }}
    </Authenticator>
  );
};

export default CustomAuthenticator;

