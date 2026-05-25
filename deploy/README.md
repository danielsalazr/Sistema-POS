# Despliegue con Nginx o Apache

La app frontend usa rutas relativas `/api`, asi que en produccion el servidor web debe:

- Servir `frontend/dist` como archivos estaticos.
- Redirigir `/api/` al backend Node en `http://127.0.0.1:3001`.
- Usar fallback a `index.html` para rutas Vue.

## Preparar build

```bash
cd ~/Desktop/POS/frontend
npm install --no-audit --no-fund
npm run build
```

Backend:

```bash
cd ~/Desktop/POS/backend
npm install --no-audit --no-fund
PORT=3001 npm start
```

## Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo cp ~/Desktop/POS/deploy/nginx-sublime-pos.conf /etc/nginx/sites-available/dela-pos
sudo ln -sf /etc/nginx/sites-available/dela-pos /etc/nginx/sites-enabled/dela-pos
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Abrir:

```text
http://IP_DE_LA_RASPBERRY/
```

## Apache

```bash
sudo apt update
sudo apt install -y apache2
sudo a2enmod proxy proxy_http rewrite
sudo cp ~/Desktop/POS/deploy/apache-sublime-pos.conf /etc/apache2/sites-available/dela-pos.conf
sudo a2dissite 000-default.conf
sudo a2ensite dela-pos.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Abrir:

```text
http://IP_DE_LA_RASPBERRY/
```

## Arranque automatico del backend

Recomendado con PM2:

```bash
sudo npm install -g pm2
cd ~/Desktop/POS/backend
PORT=3001 pm2 start src/server.js --name dela-pos-api
pm2 save
pm2 startup
```

Ejecuta el comando que `pm2 startup` imprima al final.
