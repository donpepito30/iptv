# Guía de Despliegue en Cloudflare Pages

El proyecto ha sido preparado con compatibilidad nativa para **Cloudflare Pages** y **Cloudflare Pages Functions**.

---

## 1. Configuración Rápida en el Panel de Cloudflare

Cuando conectes tu repositorio de Git (GitHub o GitLab) a **Cloudflare Pages**:

| Parámetro | Valor Recomendado |
| :--- | :--- |
| **Framework preset** | `Vite` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (raíz) |
| **Node.js Version** | `20` (ya configurado en `.node-version` y `.nvmrc`) |

---

## 2. Arquitectura de Despliegue Incluida

El proyecto incluye todos los archivos de configuración requeridos por Cloudflare Pages:

1. **Cloudflare Pages Functions (`/functions/api/*`):**
   - `functions/api/stream-proxy.ts`: Retransmite y reescribe los manifiestos `.m3u8` y segmentos de video TS/HLS directamente desde la red Edge de Cloudflare, eliminando bloqueos CORS y problemas de contenido mixto (HTTP sobre HTTPS).
   - `functions/api/image-proxy.ts`: Retransmite y cachea logos de canales y snapshots.
   - `functions/api/health.ts`: Endpoint de estado del proxy en edge.

2. **Enrutamiento SPA (`public/_redirects`):**
   - Redirige todas las rutas (`/watch`, `/categories`, `/guide`, `/adult`) hacia `index.html` con estado `200 OK`, permitiendo la navegación fluida y recargas de página sin errores 404.

3. **Optimización de Costos y CDN (`public/_routes.json`):**
   - Configura Cloudflare para que **solo las peticiones `/api/*`** invoquen Workers/Functions, mientras que todos los assets estáticos (`.js`, `.css`, imágenes, `.json`) se sirvan directamente desde la CDN gratuita de Cloudflare a máxima velocidad.

4. **Cabeceras de Seguridad y Caché (`public/_headers`):**
   - Configura cabeceras CORS (`Access-Control-Allow-Origin: *`), políticas de seguridad contra MIME sniffing y reglas de caché inmutable para `/assets/*`.

5. **Configuración de Proyecto (`wrangler.toml`):**
   - Define el nombre del proyecto, compatibilidad `nodejs_compat` y fecha de runtime `2024-04-01`.

---

## 3. Pruebas Locales con Wrangler (Opcional)

Si deseas probar localmente la emulación completa de Cloudflare Pages antes de hacer push:

```bash
# 1. Compilar los assets de producción
npm run build

# 2. Iniciar el servidor local de Cloudflare Pages con emulación de Functions
npx wrangler pages dev dist
```

El servidor local estará disponible en `http://localhost:8788`, ejecutando tanto la SPA como las funciones de `/functions/api/`.
