import { createRouter, createWebHistory } from 'vue-router';
import { session } from './session.js';
import LoginView from './views/LoginView.vue';
import DashboardView from './views/DashboardView.vue';
import ProductosView from './views/ProductosView.vue';
import VentasView from './views/VentasView.vue';
import ClientesView from './views/ClientesView.vue';
import CajaView from './views/CajaView.vue';
import UsuariosView from './views/UsuariosView.vue';
import EmpresaView from './views/EmpresaView.vue';
import ReportesView from './views/ReportesView.vue';
import MediosPagoView from './views/MediosPagoView.vue';
import ProveedoresView from './views/ProveedoresView.vue';
import ComprasView from './views/ComprasView.vue';
import PrestamosAportesView from './views/PrestamosAportesView.vue';
import PantallaPedidosView from './views/PantallaPedidosView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
    { path: '/pantalla-pedidos', name: 'pantalla-pedidos', component: PantallaPedidosView, meta: { public: true, kiosk: true } },
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/productos', name: 'productos', component: ProductosView },
    { path: '/ventas', name: 'ventas', component: VentasView },
    { path: '/compras', name: 'compras', component: ComprasView },
    { path: '/clientes', name: 'clientes', component: ClientesView },
    { path: '/proveedores', name: 'proveedores', component: ProveedoresView },
    { path: '/caja', name: 'caja', component: CajaView },
    { path: '/reportes', name: 'reportes', component: ReportesView },
    { path: '/medios-pago', name: 'medios-pago', component: MediosPagoView },
    { path: '/prestamos-aportes', name: 'prestamos-aportes', component: PrestamosAportesView },
    { path: '/usuarios', name: 'usuarios', component: UsuariosView },
    { path: '/empresa', name: 'empresa', component: EmpresaView }
  ]
});

router.beforeEach((to) => {
  if (!to.meta.public && !session.usuario) return { name: 'login' };
  if (to.name === 'login' && session.usuario) return { name: 'dashboard' };
  return true;
});

export default router;
