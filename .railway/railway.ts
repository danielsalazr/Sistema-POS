import { defineRailway, project, service, volume } from "railway/iac";

// IMPORTANTE: el volumen guarda la base SQLite de produccion (/data/sublime-pos.sqlite).
// No lo quites de este archivo ni cambies su nombre, region o tamano a uno menor:
// `railway config apply` borraria o recrearia el volumen y se PERDERIAN LOS DATOS.
// Las variables (secretos) no se manejan aqui: variables.managed = false.
export default defineRailway(() => {
  const delaposVolume = volume("delapos-volume", {
    alerts: { usage: { "100": {}, "80": {}, "95": {} } },
    allowOnlineResize: true,
    region: "us-east4-eqdc4a",
    sizeMB: 5000,
  });

  const DelaPOS = service("DelaPOS", {
    build: { buildCommand: "npm run build", buildEnvironment: "V3", builder: "RAILPACK" },
    start: "npm start",
    healthcheck: "/api/salud",
    healthcheckTimeout: 60,
    // SQLite admite un solo proceso escribiendo: no subir replicas.
    replicas: { "us-east4-eqdc4a": 1 },
    networking: { privateNetworkEndpoint: "delapos" },
    volumeMounts: { "/data": delaposVolume },
  });

  return project("DelaPOS", {
    variables: { managed: false },
    resources: [DelaPOS, delaposVolume],
  });
});
