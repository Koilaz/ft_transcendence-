import { useEffect } from 'react';
import { AppLink, ButtonLink, Card, Title } from '../components/ui';

// Route attrape-tout (AppRouter : path="*"). En SPA, toute URL sert le même
// document : c'est le routeur qui tranche. Sans cette route, une URL inconnue
// rendait un layout vide (header + footer, aucun contenu) — un ecran muet
// pour le joueur qui se trompe d'adresse ou suit un lien casse.
export default function NotFound() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-abyss-950 px-4 py-16 text-abyss-300 flex items-center justify-center">
      <Card className="max-w-md w-full text-center" padding="md">
        <Title level={1} className="mb-2">Salle introuvable</Title>
        <p className="mb-2 text-abyss-400">
          Le document auquel vous tentez d'accéder n'existe pas — ou n'existe plus.
        </p>
        <p className="mb-6 text-sm text-abyss-500">
          La séance a peut-être été levée entre-temps.
        </p>
        <div className="flex flex-col gap-2">
          <ButtonLink to="/" variant="secondary" size="md" fullWidth>
            Retour à l'accueil
          </ButtonLink>
          <p className="text-xs text-abyss-500">
            Une question juridique ? <AppLink to="/terms-of-service">CGU</AppLink>
            {' · '}
            <AppLink to="/privacy-policy">Confidentialité</AppLink>
          </p>
        </div>
      </Card>
    </main>
  );
}
