# SYNapse Frontend

React (Vite) frontend for the medical center portal. Currently contains the **patient** and **pharmacist** interfaces and a development login page. Doctor UI has intentionally been removed and can be added later.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Open `/login` and pick a role (dev stub). Data is mocked until the API contract is decided.

## How it is organised

```
src/
  App.jsx                  routes, generated from the module registry
  core/                    shared by every role (do not put role-specific code here)
    auth/                  AuthProvider, useAuth(), ProtectedRoute, roles
    api/client.js          fetch wrapper (unused until the API is agreed)
    layout/                AppShell: top bar + sidebar (+ optional Logout)
    ui/                    Button, Modal, DataTable, SearchBar, Avatar, Section, AsyncView, icons
    hooks/useAsync.js      loading / error / data helper
  modules/
    index.js               MODULE REGISTRY: the one place roles and login are plugged in
    auth/                  login pages  (teammate: replace the stub here)
    patient/               pages/ components/ services/ patient.css
    pharmacist/            pages/ components/ services/ pharmacist.css
```

Each supported role lives in its own folder. Shared auth, layout, and UI building blocks remain in `core/` because the patient and pharmacist modules depend on them.

## For the login-pages teammate

Edit `src/modules/auth/` only. The contract with the rest of the app:

```jsx
const { login } = useAuth();
login({ user: { id, name, role }, token });          // role: 'patient' | 'pharmacist'
navigate(homePathForRole(role), { replace: true });
```

- `src/modules/auth/index.jsx` exports `loginRoutes` (react-router `<Route>` props). Keep `/login` as the entry point: the route guards redirect there.
- Session is stored in `localStorage` (`synapse.auth`) and restored on refresh. `logout()` clears it.
- `LoginPage.jsx` is a dev stub (one button per role). Replace or delete it.

## Module definition

```js
export default {
  role: 'patient',               // must match core/auth/roles.js
  basePath: '/patient',
  navItems: [{ label, to, icon }],  // to: '' = home, otherwise '/some-page'; icon: see core/ui/icons.jsx
  routes: [{ index: true, element: <Home /> }, { path: 'x', element: <X /> }],
  showLogout: false,
  showNotificationsIcon: false,
};
```

Register it in `src/modules/index.js`.

## API integration (when the JSON is decided)

Pages never fetch directly. They call functions in `modules/<role>/services/*Service.js`, which currently return mock data (`services/mock.js`). Each function documents the shape the UI expects (JSDoc typedefs). To go live: replace the function bodies with `api.get/post` calls from `core/api/client.js` and map the response to those shapes, then delete `mock.js`. Set `VITE_API_BASE_URL` (see `.env.example`).

## Deliberately not built yet

| Item | Where | Why |
| --- | --- | --- |
| Book Appointment flow | `patient/pages/BookAppointment.jsx` | Waiting on API JSON |
| OPD slip viewer | `patient/components/OpdSlipViewer.jsx` | Waiting on API JSON. All "View OPD Slip" / "View" buttons already route through `useOpdSlipViewer()` |
| My Appointments, Profile | `patient/pages/` | In the sidebar but no wireframe was provided |
| Doctor UI | Removed for now; can be reintroduced later | Deferred |

## Notes on interpreting the wireframes

- The patient top-bar has a round icon beside the avatar; it is rendered as a notification bell with no behaviour.
- Wireframe checkboxes in the pharmacist pop-up are rendered as a plain list (the sidebar uses the same box shape as an icon placeholder).
- The patient wireframes show no Logout; only the pharmacist sidebar does, so `patient` has `showLogout: false`.
- Home "View Details" and "View All" both go to My Appointments for now.
- Search buttons filter on click/Enter (client-side for the pharmacist tables; through `getVisits(filters)` for Visit History).
