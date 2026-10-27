import { LoadingScreen } from "@/components/loading/loading-screen";

// Fallback padrão das rotas; as páginas com dados têm o próprio esqueleto dentro do <Suspense>.
export default function Loading() {
  return <LoadingScreen />;
}
