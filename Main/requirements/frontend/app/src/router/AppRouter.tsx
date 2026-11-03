import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Layout from '../components/Layout';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';
import PrivacyPolicy from '../pages/PrivacyPolicy';
import TermsOfService from '../pages/TermsOfService';
import Friends from '../pages/Friends';
import Game from '../pages/Game';
import NotFound from '../pages/NotFound';
import { hasGameIdentity } from '../services/gameIdentity';

// Garde d'identite de /game : un invite sans jeton et sans pseudo est renvoye
// a l'accueil, qui lui demande son pseudo. Tout le reste passe — le deep-link
// est un acces normal (compte connecte, invite nomme), et surtout un refresh
// en pleine partie doit rester repris par le resumeToken : on ne force donc
// JAMAIS le passage par l'accueil, on n'exige qu'une identite.
function GameGuard() {
  return hasGameIdentity(localStorage) ? <Game /> : <Navigate to="/" replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>

          <Route path="/" element={<Home />} />

          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />

          <Route path="/profile" element={<Profile />} />

          <Route path="/friends" element={<Friends />} />

          <Route path="/game" element={<GameGuard />} />

          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          <Route path="/terms-of-service" element={<TermsOfService />} />

          {/* Attrape-tout : toute autre URL rend un vrai ecran, pas un
              layout vide (voir pages/NotFound.tsx). */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}



// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// -> On importe les trois outils principaux de React Router.

// import Home from '../pages/Home';
// On importe la page Home. Pareil pour les autres. c'est comme un include

// export default function AppRouter()
// Comme pour App.tsx, c'est simplement un composant React.

//<BrowserRouter>
// C'est lui qui active le système de navigation.

// Sans lui :
// /login
// /profile
// /register

// ne fonctionneraient pas.
// On ne le met qu'une seule fois dans toute l'application.

//<Routes>
// Il contient toutes les routes.
// On peut presque le lire comme :
// "Voici la liste des pages de mon site."


//<Route
// path="/"
// element={<Home />}
// />

// Si l'URL est "/" -> Afficher <Home />

// Même logique :

//<Route
//     path="/login"
//     element={<Login />}
// />