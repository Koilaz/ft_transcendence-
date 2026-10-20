import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['localhost', 'frontend'],
  },
})





// host: '0.0.0.0' 
// ->  Le serveur Vite écoute sur toutes les interfaces réseau. Sans ça, il n'écouterait que sur localhost à l'intérieur du container.

// port: 5173
// -> C'est le port par défaut de Vite.
// On l'indique explicitement, c'est plus clair.


// allowedHosts: ['localhost', 'frontend']
// localhost -> quand on accède au site depuis un navigateur via Nginx.
// frontend -> le nom du service Docker, ce qui évite l'erreur :