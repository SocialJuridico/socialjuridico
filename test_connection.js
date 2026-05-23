const https = require('https');

https.get('https://socialjuridico.com.br/api/perfil', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  res.on('data', (d) => {
    process.stdout.write(d);
  });
}).on('error', (e) => {
  console.error('Error connecting:', e);
});
