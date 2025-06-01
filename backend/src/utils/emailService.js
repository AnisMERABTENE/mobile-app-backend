const nodemailer = require('nodemailer');

console.log('🔄 Configuration du service email...');

// Configuration du transporteur SMTP Gmail
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false, // true pour 465, false pour autres ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false // Pour éviter les erreurs de certificat en développement
  }
});

// Vérifier la configuration SMTP
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erreur configuration SMTP:', error.message);
  } else {
    console.log('✅ Serveur SMTP prêt pour l\'envoi d\'emails');
  }
});

// FONCTION UTILITAIRE POUR L'URL DE BASE
const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'https://mobile-app-backend-production-5d60.up.railway.app';
  }
  return 'http://localhost:3000';
};

/**
 * Template d'email de vérification
 */
const getVerificationEmailTemplate = (firstName, verificationUrl) => {
  return {
    subject: '📧 Vérifiez votre adresse email - Mobile App',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bienvenue ${firstName} !</h1>
            <p>Merci de vous être inscrit à notre application mobile</p>
          </div>
          <div class="content">
            <h2>Vérifiez votre adresse email</h2>
            <p>Pour activer votre compte et commencer à utiliser notre application, veuillez cliquer sur le bouton ci-dessous :</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">✅ Vérifier mon email</a>
            </div>
            
            <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
              ${verificationUrl}
            </p>
            
            <p><strong>Important :</strong> Ce lien expire dans 24 heures pour votre sécurité.</p>
            
            <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
          </div>
          <div class="footer">
            <p>© 2025 Mobile App. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Bienvenue ${firstName} !
      
      Merci de vous être inscrit à notre application mobile.
      
      Pour vérifier votre email, cliquez sur ce lien :
      ${verificationUrl}
      
      Ce lien expire dans 24 heures.
      
      Si vous n'avez pas créé de compte, ignorez cet email.
    `
  };
};

/**
 * Template d'email de réinitialisation de mot de passe
 */
const getResetPasswordEmailTemplate = (firstName, resetUrl) => {
  return {
    subject: '🔐 Réinitialisation de votre mot de passe - Mobile App',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #f5576c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Réinitialisation de mot de passe</h1>
            <p>Une demande de réinitialisation a été effectuée</p>
          </div>
          <div class="content">
            <p>Bonjour ${firstName},</p>
            
            <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">🔄 Réinitialiser mon mot de passe</a>
            </div>
            
            <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
            
            <div class="warning">
              <strong>⚠️ Important :</strong>
              <ul>
                <li>Ce lien expire dans 1 heure pour votre sécurité</li>
                <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
                <li>Votre mot de passe actuel reste inchangé tant que vous n'en créez pas un nouveau</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>© 2025 Mobile App. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Réinitialisation de mot de passe
      
      Bonjour ${firstName},
      
      Vous avez demandé la réinitialisation de votre mot de passe.
      
      Cliquez sur ce lien pour créer un nouveau mot de passe :
      ${resetUrl}
      
      Ce lien expire dans 1 heure.
      
      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    `
  };
};

/**
 * Envoyer un email de vérification
 */
const sendVerificationEmail = async (user, verificationToken) => {
  try {
    // CORRECTION : Utilise l'URL Railway en production
    const verificationUrl = `${getBaseUrl()}/api/auth/verify-email?token=${verificationToken}`;
    const emailTemplate = getVerificationEmailTemplate(user.firstName, verificationUrl);

    const mailOptions = {
      from: `"Mobile App" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de vérification envoyé:', user.email);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Erreur envoi email vérification:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Envoyer un email de réinitialisation de mot de passe
 */
const sendResetPasswordEmail = async (user, resetToken) => {
  try {
    // CORRECTION : Utilise l'URL Railway en production
    const resetUrl = `${getBaseUrl()}/api/auth/reset-password?token=${resetToken}`;
    const emailTemplate = getResetPasswordEmailTemplate(user.firstName, resetUrl);

    const mailOptions = {
      from: `"Mobile App" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de réinitialisation envoyé:', user.email);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Erreur envoi email réinitialisation:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Tester la configuration email
 */
const testEmailConfig = async () => {
  try {
    const testMailOptions = {
      from: `"Mobile App Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Envoie à soi-même
      subject: '🧪 Test configuration email - Mobile App',
      html: `
        <h2>✅ Test de configuration réussi !</h2>
        <p>Si vous recevez cet email, la configuration SMTP fonctionne correctement.</p>
        <p><strong>Timestamp :</strong> ${new Date().toISOString()}</p>
        <p><strong>Base URL :</strong> ${getBaseUrl()}</p>
      `,
      text: `Test de configuration email réussi ! Timestamp: ${new Date().toISOString()}, Base URL: ${getBaseUrl()}`
    };

    const info = await transporter.sendMail(testMailOptions);
    console.log('✅ Email de test envoyé avec succès:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Erreur test email:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
  testEmailConfig
};