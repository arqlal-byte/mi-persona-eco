# Mi Persona ECO · aplicación web en GitHub Pages

**Estado:** prototipo funcional en validación. Interfaz alojada en GitHub Pages, Google Sheets como fuente oficial y Google Drive para portadas. La interfaz no contiene credenciales, datos de nómina ni claves operativas.

**Web:** https://arqlal-byte.github.io/mi-persona-eco/

## Funcionamiento

- `index.html`: interfaz oficial adaptada a celular y computadora; conserva pestañas, gráfica, portadas 16:9 y botones compactos.
- `eco-config.js`: `mode:'demo'` conserva la simulación pública. En `mode:'live'`, tras configurar `bridgeUrl` con el `/exec` del conector privado, se cambia al acceso seguro sin exponer datos en GitHub.
- `eco-bridge-client.js`: transporte aislado entre el navegador y el conector privado; valida métodos, la URL del servicio y el origen de respuesta. Las credenciales se envían por HTTPS dentro de mensajes entre marcos del navegador, nunca en la URL.

**No colocar contraseñas, tokens, datos personales, llaves de integración ni copias de Sheets en este repositorio público.** El backend privado NO se incluye aquí. La validación real de actividades queda deshabilitada hasta verificar y autorizar operaciones de escritura.

La configuración pública se mantiene **en modo demostración** hasta que el responsable confirme el despliegue y la revisión de los permisos del conector.

La app operativa original Persona ECO permanece intacta.