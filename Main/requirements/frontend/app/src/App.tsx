// @ts-nocheck
import AppRouter from './router/AppRouter';
import { ModalProvider } from './contexts/ModalContext';
import GlobalModals from './components/GlobalModals';

function App() {
  return (
    <ModalProvider>
      <GlobalModals />
      <AppRouter />
    </ModalProvider>
  );
}

export default App;