// test-websocket.js - Place ce fichier dans le dossier backend/
const io = require('socket.io-client');

// Token du vendeur (MISE À JOUR : maintenant role: seller)
const vendorToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NDk3Y2IxNjA3MjgwMjU5MGY4NDBjMyIsImVtYWlsIjoidGVzdHZlbmRldXIyMDI0QGdtYWlsLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzQ5NjQ2NTE0LCJleHAiOjE3NTAyNTEzMTQsImF1ZCI6Im1vYmlsZS1hcHAtdXNlcnMiLCJpc3MiOiJtb2JpbGUtYXBwLWJhY2tlbmQifQ.lFLYfSX_wQzVjzQCLiq_NTNURDoISD97xRDZa0aXhuo';

console.log('🔌 Connexion WebSocket vendeur...');

const socket = io('http://localhost:3000', {
  auth: {
    token: vendorToken
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Vendeur connecté:', socket.id);
  
  // Envoyer un ping
  socket.emit('ping', { message: 'Hello from vendor!' });
  
  // Rejoindre les rooms de catégories
  socket.emit('join_seller_categories', { 
    categories: ['electronique'] 
  });
  
  // Rejoindre la room de région
  socket.emit('join_seller_region', { 
    city: 'Paris',
    postalCode: '75001'
  });
});

socket.on('pong', (data) => {
  console.log('🏓 Pong reçu:', data);
});

socket.on('categories_joined', (data) => {
  console.log('🏷️ Catégories rejointes:', data);
});

socket.on('region_joined', (data) => {
  console.log('📍 Région rejointe:', data);
});

// Écouter les notifications de nouvelles demandes
socket.on('new_request_notification', (data) => {
  console.log('🔔 NOUVELLE DEMANDE REÇUE !');
  console.log('📋 Titre:', data.request.title);
  console.log('🏷️ Catégorie:', data.request.category, '>', data.request.subCategory);
  console.log('📍 Ville:', data.request.location.city);
  console.log('📏 Distance:', data.request.location.distance, 'km');
  console.log('⭐ Score de correspondance:', data.metadata.matchScore);
  console.log('👤 Demandeur:', data.request.user.firstName);
  console.log('⏰ Créé le:', new Date(data.request.createdAt).toLocaleString());
  console.log('---');
});

socket.on('disconnect', (reason) => {
  console.log('❌ Déconnecté:', reason);
});

socket.on('connect_error', (error) => {
  console.log('❌ Erreur connexion:', error.message);
});

console.log('👂 En écoute des notifications...');
console.log('Appuyez sur Ctrl+C pour arrêter');

process.on('SIGINT', () => {
  console.log('\n👋 Fermeture de la connexion...');
  socket.disconnect();
  process.exit(0);
});