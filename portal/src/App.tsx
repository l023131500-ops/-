import { useRoute } from "./router.js";
import { Home } from "./pages/Home.js";
import { System } from "./pages/System.js";
import { styles as s } from "./styles.js";

/**
 * more30 portal — unified entry to every system.
 *
 * A tiny router (see router.ts) switches between the home listing and a
 * per-system page (`/NN`). The portal is public and reads only the build-time
 * REGISTRY, so it always renders without auth or a live DB connection.
 */
export function App() {
  const { route, navigate } = useRoute();

  return (
    <main style={s.page}>
      {route.name === "home" && <Home navigate={navigate} />}
      {route.name === "system" && <System slug={route.slug} navigate={navigate} />}
      {route.name === "notfound" && (
        <>
          <button style={s.backLink} onClick={() => navigate("/")}>← חזרה לפורטל</button>
          <div style={s.detailCard}>
            <h1>עמוד לא נמצא</h1>
            <p style={s.kvKey}>אין מסלול <code>/{route.seg}</code>.</p>
          </div>
        </>
      )}
    </main>
  );
}
