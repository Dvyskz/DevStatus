# DevStatus

Dashboard local para vigilar sitios web, APIs y streams. Ejecuta revisiones desde el navegador, mide el tiempo de respuesta y conserva el historial en el dispositivo.

## Funciones

- Crear y eliminar monitores.
- Revisiones paralelas con timeout.
- Estado, latencia, uptime calculado y minigráficas.
- Registro de eventos.
- Datos persistidos con `localStorage`.
- Diseño responsive tipo dashboard.

## Ejecutar

```bash
python3 -m http.server 4175
```

Abre `http://localhost:4175` y pulsa **Revisar todo**.

## Alcance de la versión estática

Las revisiones se ejecutan desde el navegador con `fetch` en modo `no-cors`. Esto permite comprobar alcance de red, pero no inspeccionar códigos HTTP de servicios sin CORS. Para monitoreo 24/7 y códigos de respuesta reales, conecta la interfaz a un Worker, cron o API propia.

## Roadmap

- Worker con revisiones programadas.
- Alertas por Discord y correo.
- Página pública de estado.
- Historial persistente en una base de datos.

## Autor

Creado por [Yazid / @Dvyskz](https://github.com/Dvyskz).

## Licencia

MIT
