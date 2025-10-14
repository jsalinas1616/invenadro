# 🔐 Configuración de AWS Cognito - Guía Paso a Paso

## ⚠️ IMPORTANTE
Antes de poder usar el login, necesitas crear un User Pool en AWS Cognito y actualizar las credenciales en `src/aws-config.js`

## 🚫 REGISTRO DE USUARIOS DESACTIVADO

**El sistema NO permite que los usuarios se registren por sí mismos desde el login.**

### ¿Cómo crear nuevos usuarios?

**Opción 1: Desde AWS Cognito Console (Recomendado)**
```
1. AWS Console → Cognito → User Pools → [tu-pool]
2. Click en "Users" en el menú lateral
3. Click "Create user"
4. Ingresa email y contraseña temporal
5. Usuario recibirá email para cambiar contraseña
```

**Opción 2: Desde AWS CLI**
```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXX \
  --username usuario@ejemplo.com \
  --user-attributes Name=email,Value=usuario@ejemplo.com \
  --temporary-password TempPassword123!
```

**Opción 3: Implementar Admin Panel (Futuro)**
- Crear sección de administración dentro de la app
- Solo accesible para usuarios con rol "Admin"
- Usar AWS Amplify Auth para crear usuarios programáticamente

---

## 📋 Paso 1: Crear User Pool en AWS Cognito

### 1.1 Ir a la Consola de AWS Cognito
1. Abre [AWS Console](https://console.aws.amazon.com/)
2. Busca "Cognito" en la barra de búsqueda
3. Click en "User pools"
4. Click en el botón **"Create user pool"**

### 1.2 Configurar Sign-in Experience
- **Sign-in options**: Selecciona:
  - ✅ **Email** (recomendado)
  - ✅ **Username** (opcional)
- Click **"Next"**

### 1.3 Configurar Security Requirements
- **Password policy mode**: Selecciona **"Cognito defaults"**
- **Multi-factor authentication**: Selecciona **"No MFA"** (por ahora, puedes activarlo después)
- **User account recovery**: Selecciona **"Email only"**
- Click **"Next"**

### 1.4 Configurar Sign-up Experience
- **Self-registration**: ❌ **DESHABILITAR** (desmarcar "Enable self-registration")
  - ⚠️ **IMPORTANTE**: NO permitir que usuarios se registren por sí mismos
  - Solo admins deben crear usuarios desde la consola de Cognito
- **Attribute verification**: Selecciona **"Send email message, verify email address"**
- **Required attributes**: Deja los predeterminados (email ya está incluido)
- Click **"Next"**

### 1.5 Configurar Message Delivery
- **Email provider**: Selecciona **"Send email with Cognito"**
  - ⚠️ Nota: Esto tiene límite de 50 emails/día. Para producción, configura SES.
- Click **"Next"**

### 1.6 Integrar tu App
- **User pool name**: Escribe un nombre, por ejemplo: `invenadro-users-pool`
- **Hosted authentication pages**: ❌ **NO seleccionar** (usaremos Amplify UI en React)
- **Initial app client**: 
  - **App client name**: `invenadro-web-client`
  - **Client secret**: ❌ **Don't generate a client secret** (importante para apps web públicas)
  - **Authentication flows**: Selecciona:
    - ✅ **ALLOW_USER_PASSWORD_AUTH**
    - ✅ **ALLOW_REFRESH_TOKEN_AUTH**
- Click **"Next"**

### 1.7 Revisar y Crear
- Revisa toda la configuración
- Click **"Create user pool"**

---

## 📝 Paso 2: Obtener las Credenciales

### 2.1 Copiar User Pool ID
1. En la página del User Pool recién creado
2. Busca **"User pool ID"** (ejemplo: `us-east-1_ABC123XYZ`)
3. **Cópialo** 📋

### 2.2 Copiar App Client ID
1. En el mismo User Pool, ve a la pestaña **"App integration"**
2. Scroll down hasta **"App clients and analytics"**
3. Click en tu app client (`invenadro-web-client`)
4. Copia el **"Client ID"** (ejemplo: `1a2b3c4d5e6f7g8h9i0j1k2l3m`)
5. **Cópialo** 📋

---

## ⚙️ Paso 3: Actualizar Configuración en el Proyecto

### 3.1 Editar `src/aws-config.js`
```javascript
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      // 👇 REEMPLAZAR CON TUS VALORES REALES
      userPoolId: 'us-east-1_ABC123XYZ',  // ← Tu User Pool ID aquí
      userPoolClientId: '1a2b3c4d5e6f7g8h9i0j1k2l3m',  // ← Tu Client ID aquí
      
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
        username: true
      }
    }
  }
});

export default Amplify;
```

**Ejemplo con datos reales:**
```javascript
userPoolId: 'us-east-1_XyZ123AbC',
userPoolClientId: '7abc123def456ghi789jkl012mno345p',
```

---

## 🚀 Paso 4: Probar el Login

### 4.1 Iniciar la aplicación
```bash
npm start
```

### 4.2 Crear tu primer usuario
1. La app mostrará la pantalla de login
2. Click en **"Create Account"** (abajo del formulario)
3. Llena los datos:
   - Email: tu email real
   - Password: mínimo 8 caracteres
4. Click **"Create Account"**
5. Revisa tu email para el código de verificación
6. Ingresa el código
7. ¡Listo! Ya puedes hacer login

### 4.3 Hacer Login
1. Ingresa tu email y password
2. Click **"Sign In"**
3. Deberías ver la aplicación normal

---

## 👥 Paso 5: Crear Usuarios Manualmente (Opcional)

Si quieres crear usuarios sin que se registren ellos mismos:

### 5.1 Desde la Consola de AWS
1. Ve a tu User Pool en Cognito
2. Click en **"Users"** en el menú lateral
3. Click **"Create user"**
4. Llena los datos:
   - Username: `usuario1`
   - Email: `usuario@example.com`
   - Temporary password: `TempPass123!`
   - ✅ **Mark email address as verified** (importante)
   - ❌ **Send an email invitation** (opcional)
5. Click **"Create user"**
6. El usuario puede hacer login con el password temporal
7. En el primer login, se le pedirá cambiar el password

---

## 🔧 Configuraciones Adicionales (Opcional)

### Personalizar Emails
1. Ve a **"Messaging"** en tu User Pool
2. Click **"Edit"** en **"Email configuration"**
3. Personaliza los templates de email

### Configurar SES para Producción
Si vas a enviar más de 50 emails/día:
1. Configura Amazon SES
2. Verifica tu dominio
3. En Cognito, selecciona **"Send email with Amazon SES"**

### Habilitar MFA (Multi-Factor Authentication)
1. Ve a **"Sign-in experience"**
2. Click **"Edit"**
3. Cambia MFA a **"Required"** o **"Optional"**

---

## ❓ Troubleshooting

### Error: "Invalid userPoolId or userPoolClientId"
- ✅ Verifica que copiaste correctamente los IDs
- ✅ No debe haber espacios extras
- ✅ El formato debe ser exacto

### Error: "User does not exist"
- ✅ Verifica que el email esté verificado
- ✅ Crea el usuario desde la consola de AWS

### No llega el email de verificación
- ✅ Revisa la carpeta de spam
- ✅ Espera 2-3 minutos
- ✅ Verifica que el email en Cognito sea el correcto

### Error: "Cannot read property 'username' of undefined"
- ✅ Esto es normal si aún no configuraste Cognito
- ✅ Actualiza `aws-config.js` con tus credenciales

---

## 📚 Recursos Útiles

- [Documentación de AWS Cognito](https://docs.aws.amazon.com/cognito/)
- [Amplify Auth Documentation](https://docs.amplify.aws/react/build-a-backend/auth/)
- [Amplify UI Components](https://ui.docs.amplify.aws/react/connected-components/authenticator)

---

## ✅ Checklist Final

- [ ] User Pool creado en AWS Cognito
- [ ] User Pool ID copiado
- [ ] App Client ID copiado
- [ ] `src/aws-config.js` actualizado con las credenciales reales
- [ ] `npm start` ejecutado sin errores
- [ ] Pantalla de login aparece correctamente
- [ ] Usuario de prueba creado
- [ ] Login funciona correctamente
- [ ] Botón "Cerrar Sesión" funciona

---

**🎉 ¡Listo! Tu app ahora tiene autenticación con AWS Cognito**

